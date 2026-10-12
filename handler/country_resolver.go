package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/kzeedev/IP-Hub/database"
	"github.com/kzeedev/IP-Hub/models"
)

// CountryNameResolver coordinates background name resolution for country ASNs and IP prefixes.
// It allows up to 3 countries to be processed concurrently with an ordered waiting queue.
// For each active country, it runs 10 goroutines for ASNs, 10 for IPv4, and 10 for IPv6.
type CountryNameResolver struct {
	httpClient *http.Client
	mu         sync.RWMutex
	activeJobs map[string]*activeCountryJob
	queue      []*queuedCountryItem
	completed  map[string]bool
}

type queuedCountryItem struct {
	CountryCode string
	CountryName string
	ASNs        []int
	IPv4        []string
	IPv6        []string
	EnqueuedAt  time.Time
}

type activeCountryJob struct {
	CountryCode string
	CountryName string
	StartedAt   time.Time

	asnTotal    int32
	asnResolved int32

	v4Total     int32
	v4Resolved  int32

	v6Total     int32
	v6Resolved  int32

	cacheMu    sync.Mutex
	asNames    map[string]string
	prefixOrgs map[string]string
}

// NewCountryNameResolver creates a resolver instance with the given HTTP client.
func NewCountryNameResolver(client *http.Client) *CountryNameResolver {
	if client == nil {
		client = &http.Client{Timeout: 7 * time.Second}
	}
	return &CountryNameResolver{
		httpClient: client,
		activeJobs: make(map[string]*activeCountryJob),
		queue:      make([]*queuedCountryItem, 0),
		completed:  make(map[string]bool),
	}
}

// Enqueue adds a country for background resolution if not already active or queued.
// Returns (enqueued bool, queueFull bool).
func (r *CountryNameResolver) Enqueue(countryCode, countryName string, asns []int, ipv4, ipv6 []string) (bool, bool) {
	code := strings.ToUpper(strings.TrimSpace(countryCode))
	if len(code) != 2 {
		return false, false
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	// Ignore if already being resolved
	if _, exists := r.activeJobs[code]; exists {
		return false, false
	}

	// Ignore if already waiting in queue
	for _, q := range r.queue {
		if q.CountryCode == code {
			return false, false
		}
	}

	item := &queuedCountryItem{
		CountryCode: code,
		CountryName: countryName,
		ASNs:        asns,
		IPv4:        ipv4,
		IPv6:        ipv6,
		EnqueuedAt:  time.Now().UTC(),
	}

	if len(r.activeJobs) < 3 {
		r.startJobLocked(item)
		return true, false
	} else if len(r.queue) < 3 {
		r.queue = append(r.queue, item)
		return true, false
	} else {
		// Queue has reached maximum capacity of 3 waiting countries
		return false, true
	}
}

func (r *CountryNameResolver) startJobLocked(item *queuedCountryItem) {
	job := &activeCountryJob{
		CountryCode: item.CountryCode,
		CountryName: item.CountryName,
		StartedAt:   time.Now().UTC(),
		asnTotal:    int32(len(item.ASNs)),
		v4Total:     int32(len(item.IPv4)),
		v6Total:     int32(len(item.IPv6)),
		asNames:     make(map[string]string),
		prefixOrgs:  make(map[string]string),
	}
	r.activeJobs[item.CountryCode] = job

	go r.runJob(job, item.ASNs, item.IPv4, item.IPv6)
}

func (r *CountryNameResolver) onJobFinished(countryCode string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.activeJobs, countryCode)

	if len(r.queue) > 0 {
		next := r.queue[0]
		r.queue = r.queue[1:]
		r.startJobLocked(next)
	}
}

func (r *CountryNameResolver) runJob(job *activeCountryJob, asns []int, ipv4, ipv6 []string) {
	defer r.onJobFinished(job.CountryCode)

	dailyTtl := getEndOfDayTtl()
	cacheKey := "country_res_" + job.CountryCode

	// 1. Initial cached ASN check
	var missingAsns []int
	for _, asn := range asns {
		asnStr := strconv.Itoa(asn)
		var val string
		if found, _ := database.GetJSON("asn_name_"+asnStr, &val); found && val != "" {
			job.cacheMu.Lock()
			job.asNames[asnStr] = val
			job.asNames["AS"+asnStr] = val
			job.cacheMu.Unlock()
		} else {
			missingAsns = append(missingAsns, asn)
		}
	}
	atomic.StoreInt32(&job.asnTotal, int32(len(asns)))
	atomic.StoreInt32(&job.asnResolved, int32(len(asns)-len(missingAsns)))

	// 2. Initial cached IPv4 check
	var missingV4 []string
	for _, p := range ipv4 {
		var val string
		if found, _ := database.GetJSON("prefix_org_"+p, &val); found && val != "" {
			job.cacheMu.Lock()
			job.prefixOrgs[p] = val
			job.cacheMu.Unlock()
		} else {
			missingV4 = append(missingV4, p)
		}
	}
	atomic.StoreInt32(&job.v4Total, int32(len(ipv4)))
	atomic.StoreInt32(&job.v4Resolved, int32(len(ipv4)-len(missingV4)))

	// 3. Initial cached IPv6 check
	var missingV6 []string
	for _, p := range ipv6 {
		var val string
		if found, _ := database.GetJSON("prefix_org_"+p, &val); found && val != "" {
			job.cacheMu.Lock()
			job.prefixOrgs[p] = val
			job.cacheMu.Unlock()
		} else {
			missingV6 = append(missingV6, p)
		}
	}
	atomic.StoreInt32(&job.v6Total, int32(len(ipv6)))
	atomic.StoreInt32(&job.v6Resolved, int32(len(ipv6)-len(missingV6)))

	// If everything is already cached, flush immediately and exit
	if len(missingAsns) == 0 && len(missingV4) == 0 && len(missingV6) == 0 {
		job.flushCache(cacheKey, dailyTtl)
		r.MarkCompleted(job.CountryCode)
		return
	}

	// Start periodic cache flusher every 2 seconds
	doneChan := make(chan struct{})
	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-doneChan:
				return
			case <-ticker.C:
				job.flushCache(cacheKey, dailyTtl)
			}
		}
	}()

	var categoryWg sync.WaitGroup
	categoryWg.Add(3)

	// Bucket 1: 10 goroutines for ASNs
	go func() {
		defer categoryWg.Done()
		r.resolveAsnBucket(job, missingAsns, dailyTtl)
	}()

	// Bucket 2: 10 goroutines for IPv4
	go func() {
		defer categoryWg.Done()
		r.resolvePrefixBucket(job, missingV4, &job.v4Resolved, dailyTtl)
	}()

	// Bucket 3: 10 goroutines for IPv6
	go func() {
		defer categoryWg.Done()
		r.resolvePrefixBucket(job, missingV6, &job.v6Resolved, dailyTtl)
	}()

	categoryWg.Wait()
	close(doneChan)

	// Final flush
	job.flushCache(cacheKey, dailyTtl)
	r.MarkCompleted(job.CountryCode)
}

func (r *CountryNameResolver) resolveAsnBucket(job *activeCountryJob, asns []int, dailyTtl time.Duration) {
	if len(asns) == 0 {
		return
	}

	const workerCount = 10
	var wg sync.WaitGroup

	for g := 0; g < workerCount; g++ {
		start := g * len(asns) / workerCount
		end := (g + 1) * len(asns) / workerCount
		if start >= end {
			continue
		}
		part := asns[start:end]

		wg.Add(1)
		go func(items []int) {
			defer wg.Done()
			const chunkSize = 20
			for i := 0; i < len(items); i += chunkSize {
				chunkEnd := i + chunkSize
				if chunkEnd > len(items) {
					chunkEnd = len(items)
				}
				chunk := items[i:chunkEnd]

				var strList []string
				for _, a := range chunk {
					strList = append(strList, strconv.Itoa(a))
				}

				var asRes struct {
					Data struct {
						Names map[string]string `json:"names"`
					} `json:"data"`
				}
				u := fmt.Sprintf("https://stat.ripe.net/data/as-names/data.json?resource=%s", strings.Join(strList, ","))
				if err := r.fetchJSON(u, &asRes); err == nil {
					job.cacheMu.Lock()
					if asRes.Data.Names != nil {
						for k, v := range asRes.Data.Names {
							_ = database.SetJSON("asn_name_"+k, v, dailyTtl)
							_ = database.SetJSON("asn_name_AS"+k, v, dailyTtl)
							job.asNames[k] = v
							job.asNames["AS"+k] = v
						}
					}
					for _, a := range chunk {
						aStr := strconv.Itoa(a)
						if asRes.Data.Names == nil || asRes.Data.Names[aStr] == "" {
							fallback := "AS" + aStr
							_ = database.SetJSON("asn_name_"+aStr, fallback, dailyTtl)
							_ = database.SetJSON("asn_name_AS"+aStr, fallback, dailyTtl)
							job.asNames[aStr] = fallback
							job.asNames["AS"+aStr] = fallback
						}
					}
					job.cacheMu.Unlock()
				}

				atomic.AddInt32(&job.asnResolved, int32(len(chunk)))
				time.Sleep(30 * time.Millisecond)
			}
		}(part)
	}

	wg.Wait()
}

func (r *CountryNameResolver) resolvePrefixBucket(job *activeCountryJob, prefixes []string, resolvedCounter *int32, dailyTtl time.Duration) {
	if len(prefixes) == 0 {
		return
	}

	const workerCount = 10
	var wg sync.WaitGroup

	for g := 0; g < workerCount; g++ {
		start := g * len(prefixes) / workerCount
		end := (g + 1) * len(prefixes) / workerCount
		if start >= end {
			continue
		}
		part := prefixes[start:end]

		wg.Add(1)
		go func(items []string) {
			defer wg.Done()
			for _, prefix := range items {
				var pRes struct {
					Data struct {
						Asns []struct {
							Holder string `json:"holder"`
						} `json:"asns"`
					} `json:"data"`
				}
				u := fmt.Sprintf("https://stat.ripe.net/data/prefix-overview/data.json?resource=%s", url.QueryEscape(prefix))
				if err := r.fetchJSON(u, &pRes); err == nil {
					holder := "Unannounced"
					if len(pRes.Data.Asns) > 0 && pRes.Data.Asns[0].Holder != "" {
						holder = pRes.Data.Asns[0].Holder
					}
					_ = database.SetJSON("prefix_org_"+prefix, holder, dailyTtl)
					job.cacheMu.Lock()
					job.prefixOrgs[prefix] = holder
					job.cacheMu.Unlock()
				}

				atomic.AddInt32(resolvedCounter, 1)
				time.Sleep(25 * time.Millisecond)
			}
		}(part)
	}

	wg.Wait()
}

func (j *activeCountryJob) flushCache(cacheKey string, dailyTtl time.Duration) {
	j.cacheMu.Lock()
	if len(j.asNames) == 0 && len(j.prefixOrgs) == 0 {
		j.cacheMu.Unlock()
		return
	}
	asCopy := make(map[string]string, len(j.asNames))
	for k, v := range j.asNames {
		asCopy[k] = v
	}
	orgCopy := make(map[string]string, len(j.prefixOrgs))
	for k, v := range j.prefixOrgs {
		orgCopy[k] = v
	}
	j.cacheMu.Unlock()

	var res models.CountryIpResource
	if found, _ := database.GetJSON(cacheKey, &res); found {
		if res.AsNames == nil {
			res.AsNames = make(map[string]string)
		}
		if res.PrefixOrgs == nil {
			res.PrefixOrgs = make(map[string]string)
		}
		for k, v := range asCopy {
			res.AsNames[k] = v
		}
		for k, v := range orgCopy {
			res.PrefixOrgs[k] = v
		}
		_ = database.SetJSON(cacheKey, res, dailyTtl)
	}
}

// GetStatus returns the current active and queued country resolution jobs.
func (r *CountryNameResolver) GetStatus() models.ResolverStatusResponse {
	r.mu.RLock()
	defer r.mu.RUnlock()

	active := make([]models.ActiveCountryJob, 0, len(r.activeJobs))
	for _, job := range r.activeJobs {
		asnTot := int(atomic.LoadInt32(&job.asnTotal))
		asnRes := int(atomic.LoadInt32(&job.asnResolved))
		v4Tot := int(atomic.LoadInt32(&job.v4Total))
		v4Res := int(atomic.LoadInt32(&job.v4Resolved))
		v6Tot := int(atomic.LoadInt32(&job.v6Total))
		v6Res := int(atomic.LoadInt32(&job.v6Resolved))

		active = append(active, models.ActiveCountryJob{
			CountryCode: job.CountryCode,
			CountryName: job.CountryName,
			StartedAt:   job.StartedAt,
			ASN: models.CategoryProgress{
				Total:    asnTot,
				Resolved: asnRes,
				Percent:  calcPercent(int32(asnRes), int32(asnTot)),
			},
			IPv4: models.CategoryProgress{
				Total:    v4Tot,
				Resolved: v4Res,
				Percent:  calcPercent(int32(v4Res), int32(v4Tot)),
			},
			IPv6: models.CategoryProgress{
				Total:    v6Tot,
				Resolved: v6Res,
				Percent:  calcPercent(int32(v6Res), int32(v6Tot)),
			},
		})
	}

	sort.Slice(active, func(i, j int) bool {
		return active[i].StartedAt.Before(active[j].StartedAt)
	})

	waiting := make([]models.QueuedCountry, 0, len(r.queue))
	for _, q := range r.queue {
		waiting = append(waiting, models.QueuedCountry{
			CountryCode: q.CountryCode,
			CountryName: q.CountryName,
			EnqueuedAt:  q.EnqueuedAt,
		})
	}

	completedMap := make(map[string]bool)
	for c := range r.completed {
		completedMap[c] = true
	}
	if database.DB != nil && database.DB.GetClient() != nil {
		ctx := context.Background()
		if members, err := database.DB.GetClient().SMembers(ctx, "completed_countries").Result(); err == nil {
			for _, m := range members {
				completedMap[m] = true
			}
		}
		if keys, err := database.DB.GetClient().Keys(ctx, "country_res_*").Result(); err == nil {
			for _, k := range keys {
				cCode := strings.TrimPrefix(k, "country_res_")
				if len(cCode) == 2 {
					var res models.CountryIpResource
					if found, _ := database.GetJSON(k, &res); found {
						// Consider completed if already in cache with resolved names
						if (len(res.PrefixOrgs) > 0 && len(res.AsNames) > 0) || (res.IPv4Count == 0 && res.IPv6Count == 0) {
							completedMap[cCode] = true
						}
					}
				}
			}
		}
	}

	completed := make([]string, 0, len(completedMap))
	for c := range completedMap {
		if _, isActive := r.activeJobs[c]; !isActive {
			isWaiting := false
			for _, q := range r.queue {
				if q.CountryCode == c {
					isWaiting = true
					break
				}
			}
			if !isWaiting {
				completed = append(completed, c)
			}
		}
	}
	sort.Strings(completed)

	return models.ResolverStatusResponse{
		Active:    active,
		Waiting:   waiting,
		Completed: completed,
	}
}

// MarkCompleted records that a country has completed all name resolutions.
func (r *CountryNameResolver) MarkCompleted(countryCode string) {
	code := strings.ToUpper(strings.TrimSpace(countryCode))
	if len(code) != 2 {
		return
	}
	r.mu.Lock()
	r.completed[code] = true
	r.mu.Unlock()

	if database.DB != nil && database.DB.GetClient() != nil {
		ctx := context.Background()
		dailyTtl := getEndOfDayTtl()
		_ = database.DB.GetClient().SAdd(ctx, "completed_countries", code).Err()
		_ = database.DB.GetClient().Expire(ctx, "completed_countries", dailyTtl).Err()
	}
}

func (r *CountryNameResolver) fetchJSON(targetURL string, target interface{}) error {
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "IP-Hub-Server/2.0")
	req.Header.Set("Accept", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("status %d", resp.StatusCode)
	}

	return json.NewDecoder(resp.Body).Decode(target)
}

func calcPercent(resolved, total int32) int {
	if total <= 0 {
		return 100
	}
	p := int(float64(resolved) / float64(total) * 100)
	if p > 100 {
		return 100
	}
	if p < 0 {
		return 0
	}
	return p
}
