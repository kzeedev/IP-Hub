package main

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	country "github.com/mikekonan/go-countries"
	"github.com/kzeedev/IP-Hub/models"
)

// HTTP Client with sane timeouts
var httpClient = &http.Client{
	Timeout: 7 * time.Second,
}

// In-Memory Cache with TTL
type cacheItem struct {
	data      interface{}
	expiresAt time.Time
}

var (
	memCache sync.Map
)

func getFromMemCache(key string) (interface{}, bool) {
	val, ok := memCache.Load(key)
	if !ok {
		return nil, false
	}
	item := val.(cacheItem)
	if time.Now().After(item.expiresAt) {
		memCache.Delete(key)
		return nil, false
	}
	return item.data, true
}

func setMemCache(key string, data interface{}, ttl time.Duration) {
	memCache.Store(key, cacheItem{
		data:      data,
		expiresAt: time.Now().Add(ttl),
	})
}

// Helper: Check if query represents an ASN
func isAsnQuery(q string) bool {
	clean := strings.ToUpper(strings.TrimSpace(q))
	if strings.HasPrefix(clean, "AS") {
		_, err := strconv.Atoi(clean[2:])
		return err == nil
	}
	n, err := strconv.Atoi(clean)
	return err == nil && n > 0 && n <= 4294967295
}

// Compute Subnet breakdown
func computeSubnet(input string, customCidr *int) *models.SubnetBreakdown {
	trimmed := strings.TrimSpace(input)
	var ipStr string
	var prefix int

	if strings.Contains(trimmed, "/") {
		parts := strings.Split(trimmed, "/")
		ipStr = parts[0]
		p, err := strconv.Atoi(parts[1])
		if err != nil {
			return nil
		}
		prefix = p
	} else {
		ipStr = trimmed
		if customCidr != nil {
			prefix = *customCidr
		} else {
			prefix = 32
		}
	}

	parsedIP := net.ParseIP(ipStr)
	if parsedIP == nil {
		return nil
	}

	// Check if IPv4
	if ip4 := parsedIP.To4(); ip4 != nil {
		if prefix < 0 || prefix > 32 {
			prefix = 32
		}
		ipUint := binary.BigEndian.Uint32(ip4)
		var maskUint uint32
		if prefix == 0 {
			maskUint = 0
		} else {
			maskUint = ^uint32(0) << (32 - prefix)
		}
		wildcardUint := ^maskUint
		netUint := ipUint & maskUint
		bcastUint := netUint | wildcardUint

		netIP := make(net.IP, 4)
		binary.BigEndian.PutUint32(netIP, netUint)

		bcastIP := make(net.IP, 4)
		binary.BigEndian.PutUint32(bcastIP, bcastUint)

		maskIP := make(net.IP, 4)
		binary.BigEndian.PutUint32(maskIP, maskUint)

		wildcardIP := make(net.IP, 4)
		binary.BigEndian.PutUint32(wildcardIP, wildcardUint)

		total := int64(1) << (32 - prefix)
		var usable int64
		if prefix == 31 {
			usable = 2
		} else if prefix == 32 {
			usable = 1
		} else {
			usable = total - 2
		}

		var firstUsable, lastUsable string
		if prefix == 32 {
			firstUsable = ip4.String()
			lastUsable = ip4.String()
		} else if prefix == 31 {
			firstUsable = netIP.String()
			lastUsable = bcastIP.String()
		} else {
			firstIP := make(net.IP, 4)
			binary.BigEndian.PutUint32(firstIP, netUint+1)
			firstUsable = firstIP.String()

			lastIP := make(net.IP, 4)
			binary.BigEndian.PutUint32(lastIP, bcastUint-1)
			lastUsable = lastIP.String()
		}

		binaryIP := fmt.Sprintf("%08b.%08b.%08b.%08b", ip4[0], ip4[1], ip4[2], ip4[3])

		return &models.SubnetBreakdown{
			IP:               ip4.String(),
			IPVersion:        4,
			CIDR:             fmt.Sprintf("%s/%d", netIP.String(), prefix),
			PrefixLength:     prefix,
			NetworkAddress:   netIP.String(),
			BroadcastAddress: bcastIP.String(),
			Netmask:          maskIP.String(),
			WildcardMask:     wildcardIP.String(),
			FirstUsableIP:    firstUsable,
			LastUsableIP:     lastUsable,
			TotalHosts:       fmt.Sprintf("%d", total),
			UsableHosts:      fmt.Sprintf("%d", usable),
			BinaryIP:         binaryIP,
		}
	}

	// IPv6
	if prefix < 0 || prefix > 128 {
		prefix = 64
	}
	return &models.SubnetBreakdown{
		IP:             parsedIP.String(),
		IPVersion:      6,
		CIDR:           fmt.Sprintf("%s/%d", parsedIP.String(), prefix),
		PrefixLength:   prefix,
		NetworkAddress: parsedIP.String(),
		TotalHosts:     fmt.Sprintf("2^%d", 128-prefix),
		UsableHosts:    fmt.Sprintf("2^%d", 128-prefix),
	}
}

// Fetch JSON helper
func fetchJSON(targetURL string, target interface{}) error {
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "IP-Hub-Server/2.0")
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("status %d", resp.StatusCode)
	}

	return json.NewDecoder(resp.Body).Decode(target)
}

// Core Lookup IP function
func executeIpLookup(rawQuery string) (*models.WhoisRecord, error) {
	query := strings.TrimSpace(rawQuery)
	cacheKey := "whois_ip_" + query
	if cached, ok := getFromMemCache(cacheKey); ok {
		rec := cached.(models.WhoisRecord)
		rec.Cached = true
		return &rec, nil
	}

	startTime := time.Now()

	var (
		wg          sync.WaitGroup
		rawWhoisTxt string
		objects     []models.RipeObject
		source      = "RIPE"
		geoLoc      = models.GeoLocation{Country: "Unknown", CountryCode: "XX"}
		routing     = models.RoutingStatus{OriginAsn: "Unrouted", IsAnnounced: false}
		netPrefix   string
		netAsns     []int
		abuseEmail  string
		reverseDns  string
	)

	// 1. RIPE DB REST API Query
	wg.Add(1)
	go func() {
		defer wg.Done()
		var restRes struct {
			Objects struct {
				Object []struct {
					Type       string `json:"type"`
					PrimaryKey struct {
						Attribute []struct {
							Value string `json:"value"`
						} `json:"attribute"`
					} `json:"primary-key"`
					Attributes struct {
						Attribute []struct {
							Name    string `json:"name"`
							Value   string `json:"value"`
							Comment string `json:"comment"`
						} `json:"attribute"`
					} `json:"attributes"`
				} `json:"object"`
			} `json:"objects"`
		}

		u := fmt.Sprintf("https://rest.db.ripe.net/search.json?query-string=%s&flags=no-filtering", url.QueryEscape(query))
		if err := fetchJSON(u, &restRes); err == nil && len(restRes.Objects.Object) > 0 {
			var b strings.Builder
			for _, obj := range restRes.Objects.Object {
				pk := ""
				if len(obj.PrimaryKey.Attribute) > 0 {
					pk = obj.PrimaryKey.Attribute[0].Value
				}
				b.WriteString(fmt.Sprintf("%% Object: %s %s\n", obj.Type, pk))
				var attrs []models.RipeAttribute
				for _, a := range obj.Attributes.Attribute {
					attrs = append(attrs, models.RipeAttribute{Name: a.Name, Value: a.Value, Comment: a.Comment})
					b.WriteString(fmt.Sprintf("%-16s: %s\n", a.Name, a.Value))
				}
				b.WriteString("\n")
				objects = append(objects, models.RipeObject{
					Type:       obj.Type,
					PrimaryKey: pk,
					Attributes: attrs,
				})
			}
			rawWhoisTxt = b.String()
		}
	}()

	// 2. RIPEstat Geolocation
	wg.Add(1)
	go func() {
		defer wg.Done()
		var geoRes struct {
			Data struct {
				Locations []struct {
					Country     string      `json:"country"`
					CountryName string      `json:"country_name"`
					City        string      `json:"city"`
					State       string      `json:"state"`
					Latitude    interface{} `json:"latitude"`
					Longitude   interface{} `json:"longitude"`
					Timezone    string      `json:"timezone"`
					Prefix      string      `json:"prefix"`
				} `json:"locations"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/geoloc/data.json?resource=%s", url.QueryEscape(query))
		if err := fetchJSON(u, &geoRes); err == nil && len(geoRes.Data.Locations) > 0 {
			loc := geoRes.Data.Locations[0]
			geoLoc.Country = loc.CountryName
			if geoLoc.Country == "" {
				geoLoc.Country = loc.Country
			}
			geoLoc.CountryCode = strings.ToUpper(loc.Country)
			geoLoc.City = loc.City
			geoLoc.Region = loc.State
			geoLoc.Timezone = loc.Timezone
			geoLoc.Prefix = loc.Prefix

			var lat, lon float64
			if v, ok := loc.Latitude.(float64); ok {
				lat = v
				geoLoc.Latitude = &lat
			}
			if v, ok := loc.Longitude.(float64); ok {
				lon = v
				geoLoc.Longitude = &lon
			}
		}
	}()

	// 3. Routing Status
	wg.Add(1)
	go func() {
		defer wg.Done()
		var routRes struct {
			Data struct {
				Prefix     string `json:"prefix"`
				Announced  bool   `json:"announced"`
				Origins    []struct {
					Origin string `json:"origin"`
				} `json:"origins"`
				Visibility struct {
					V4 struct {
						RisPeersSeen  int `json:"ris_peers_seen"`
						TotalRisPeers int `json:"total_ris_peers"`
					} `json:"v4"`
					V6 struct {
						RisPeersSeen  int `json:"ris_peers_seen"`
						TotalRisPeers int `json:"total_ris_peers"`
					} `json:"v6"`
				} `json:"visibility"`
				LastUpdated string `json:"last_updated"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/routing-status/data.json?resource=%s", url.QueryEscape(query))
		if err := fetchJSON(u, &routRes); err == nil {
			routing.AnnouncedPrefix = routRes.Data.Prefix
			routing.IsAnnounced = routRes.Data.Announced || len(routRes.Data.Origins) > 0
			if len(routRes.Data.Origins) > 0 {
				routing.OriginAsn = "AS" + routRes.Data.Origins[0].Origin
			}
			peersSeen := routRes.Data.Visibility.V4.RisPeersSeen + routRes.Data.Visibility.V6.RisPeersSeen
			totalPeers := routRes.Data.Visibility.V4.TotalRisPeers + routRes.Data.Visibility.V6.TotalRisPeers
			routing.RisPeersSeen = peersSeen
			routing.TotalRisPeers = totalPeers
			if totalPeers > 0 {
				routing.BgpVisibilityPercentage = int(math.Round(float64(peersSeen) / float64(totalPeers) * 100))
			}
			routing.LastUpdated = routRes.Data.LastUpdated
		}
	}()

	// 4. Abuse Contact Finder
	wg.Add(1)
	go func() {
		defer wg.Done()
		var abuseRes struct {
			Data struct {
				AbuseContacts []string `json:"abuse_contacts"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=%s", url.QueryEscape(query))
		if err := fetchJSON(u, &abuseRes); err == nil && len(abuseRes.Data.AbuseContacts) > 0 {
			abuseEmail = abuseRes.Data.AbuseContacts[0]
		}
	}()

	// 5. Reverse DNS
	wg.Add(1)
	go func() {
		defer wg.Done()
		if !strings.Contains(query, "/") {
			names, err := net.LookupAddr(query)
			if err == nil && len(names) > 0 {
				reverseDns = strings.TrimSuffix(names[0], ".")
			}
		}
	}()

	// 6. Network Info
	wg.Add(1)
	go func() {
		defer wg.Done()
		var netRes struct {
			Data struct {
				Prefix string   `json:"prefix"`
				Asns   []string `json:"asns"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/network-info/data.json?resource=%s", url.QueryEscape(query))
		if err := fetchJSON(u, &netRes); err == nil {
			netPrefix = netRes.Data.Prefix
			for _, a := range netRes.Data.Asns {
				if n, err := strconv.Atoi(a); err == nil {
					netAsns = append(netAsns, n)
				}
			}
		}
	}()

	wg.Wait()

	// Multi-RIR Fallback if RIPE DB returned nothing
	if len(objects) == 0 {
		var statWhois struct {
			Data struct {
				Authorities []string `json:"authorities"`
				Records     [][]struct {
					Key   string `json:"key"`
					Value string `json:"value"`
				} `json:"records"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/whois/data.json?resource=%s", url.QueryEscape(query))
		if err := fetchJSON(u, &statWhois); err == nil && len(statWhois.Data.Records) > 0 {
			if len(statWhois.Data.Authorities) > 0 {
				source = strings.ToUpper(statWhois.Data.Authorities[0])
			}
			var b strings.Builder
			for _, grp := range statWhois.Data.Records {
				var attrs []models.RipeAttribute
				pk := ""
				objType := "inetnum"
				for _, r := range grp {
					attrs = append(attrs, models.RipeAttribute{Name: r.Key, Value: r.Value})
					b.WriteString(fmt.Sprintf("%-16s: %s\n", r.Key, r.Value))
					kLow := strings.ToLower(r.Key)
					if kLow == "inetnum" || kLow == "inet6num" || kLow == "netrange" || kLow == "aut-num" {
						pk = r.Value
						objType = kLow
					}
				}
				b.WriteString("\n")
				if pk == "" && len(attrs) > 0 {
					pk = attrs[0].Value
				}
				objects = append(objects, models.RipeObject{
					Type:       objType,
					PrimaryKey: pk,
					Attributes: attrs,
				})
			}
			rawWhoisTxt = b.String()
		}
	}

	// Parse out attributes
	netname := "Unknown Network"
	rangeStr := query
	var descrList []string
	countryStr := geoLoc.Country
	countryCode := geoLoc.CountryCode
	status := "ALLOCATED"
	var orgHandle, orgName, created, lastModified string
	var adminContacts, techContacts []models.ContactDetail
	var mntBy []string

	for _, obj := range objects {
		isNetObj := obj.Type == "inetnum" || obj.Type == "inet6num" || obj.Type == "netrange"
		for _, a := range obj.Attributes {
			k := strings.ToLower(a.Name)
			v := a.Value
			if isNetObj {
				if k == "netname" {
					netname = v
				}
				if k == "descr" {
					descrList = append(descrList, v)
				}
				if k == "country" && v != "" {
					countryCode = strings.ToUpper(v)
				}
				if k == "status" {
					status = v
				}
				if k == "org" || k == "organisation" {
					orgHandle = v
				}
				if k == "admin-c" {
					adminContacts = append(adminContacts, models.ContactDetail{Handle: v})
				}
				if k == "tech-c" {
					techContacts = append(techContacts, models.ContactDetail{Handle: v})
				}
				if k == "mnt-by" {
					mntBy = append(mntBy, v)
				}
				if k == "created" {
					created = v
				}
				if k == "last-modified" {
					lastModified = v
				}
			}
			if obj.Type == "organisation" {
				if k == "org-name" {
					orgName = v
				}
			}
			if (k == "abuse-mailbox" || k == "e-mail") && abuseEmail == "" && strings.Contains(v, "@") {
				abuseEmail = v
			}
		}
	}

	if netname == "Unknown Network" && orgName != "" {
		netname = orgName
	}
	if len(descrList) == 0 {
		if orgName != "" {
			descrList = append(descrList, orgName)
		} else {
			descrList = append(descrList, netname)
		}
	}
	if abuseEmail == "" {
		cleanNet := strings.ToLower(netname)
		cleanNet = strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
				return r
			}
			return -1
		}, cleanNet)
		if cleanNet == "" {
			cleanNet = "network"
		}
		abuseEmail = fmt.Sprintf("abuse@%s.net", cleanNet)
	}

	// Origin AS fallback from net info
	if routing.OriginAsn == "Unrouted" && len(netAsns) > 0 {
		routing.OriginAsn = fmt.Sprintf("AS%d", netAsns[0])
		routing.IsAnnounced = true
	}

	subnet := computeSubnet(query, nil)
	cidr := query
	if netPrefix != "" {
		cidr = netPrefix
	} else if subnet != nil {
		cidr = subnet.CIDR
	}

	if countryCode != "XX" && countryCode != "" {
		if cName, ok := country.ByAlpha2Code(country.Alpha2Code(countryCode)); ok {
			countryStr = cName.NameStr()
		}
	}

	record := &models.WhoisRecord{
		Query:           query,
		QueryType:       "ipv4",
		NormalizedQuery: strings.ToLower(query),
		Netname:         netname,
		Range:           rangeStr,
		CIDR:            cidr,
		Description:     descrList,
		Country:         countryStr,
		CountryCode:     countryCode,
		Status:          status,
		OrgHandle:       orgHandle,
		OrgName:         orgName,
		AdminContacts:   adminContacts,
		TechContacts:    techContacts,
		AbuseContact: models.AbuseContact{
			Email:     abuseEmail,
			OrgName:   orgName,
			OrgHandle: orgHandle,
			Source:    source,
		},
		MntBy:          mntBy,
		Created:        created,
		LastModified:   lastModified,
		Source:         source,
		ReverseDNS:     reverseDns,
		Geolocation:    geoLoc,
		Routing:        routing,
		Subnet:         subnet,
		RipeObjects:    objects,
		RawWhoisText:   rawWhoisTxt,
		Cached:         false,
		QueriedAt:      time.Now().UTC().Format(time.RFC3339),
		ResponseTimeMs: time.Since(startTime).Milliseconds(),
	}

	setMemCache(cacheKey, *record, 5*time.Minute)
	return record, nil
}

// Core Lookup ASN function
func executeAsnLookup(rawQuery string) (*models.AsnRecord, error) {
	cleanAsn := strings.ToUpper(strings.TrimSpace(rawQuery))
	asnNumStr := strings.TrimPrefix(cleanAsn, "AS")
	asnNum, _ := strconv.Atoi(asnNumStr)

	cacheKey := "whois_asn_" + asnNumStr
	if cached, ok := getFromMemCache(cacheKey); ok {
		rec := cached.(models.AsnRecord)
		return &rec, nil
	}

	startTime := time.Now()

	var (
		wg        sync.WaitGroup
		holder    = fmt.Sprintf("Autonomous System %d", asnNum)
		announced bool
		prefixes  []string
		rawWhois  string
	)

	// AS Overview
	wg.Add(1)
	go func() {
		defer wg.Done()
		var res struct {
			Data struct {
				Holder    string `json:"holder"`
				Announced bool   `json:"announced"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/as-overview/data.json?resource=AS%s", asnNumStr)
		if err := fetchJSON(u, &res); err == nil {
			if res.Data.Holder != "" {
				holder = res.Data.Holder
			}
			announced = res.Data.Announced
		}
	}()

	// Announced Prefixes
	wg.Add(1)
	go func() {
		defer wg.Done()
		var res struct {
			Data struct {
				Prefixes []struct {
					Prefix string `json:"prefix"`
				} `json:"prefixes"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS%s", asnNumStr)
		if err := fetchJSON(u, &res); err == nil {
			for _, p := range res.Data.Prefixes {
				if p.Prefix != "" {
					prefixes = append(prefixes, p.Prefix)
				}
			}
		}
	}()

	wg.Wait()

	record := &models.AsnRecord{
		Asn:                    fmt.Sprintf("AS%d", asnNum),
		AsnNumber:              asnNum,
		Holder:                 holder,
		Country:                "Global",
		CountryCode:            "XX",
		AnnouncedPrefixesCount: len(prefixes),
		Prefixes:               prefixes,
		RawWhoisText:           rawWhois,
		QueriedAt:              time.Now().UTC().Format(time.RFC3339),
		ResponseTimeMs:         time.Since(startTime).Milliseconds(),
	}
	record.RoutingStatus.Announced = announced

	setMemCache(cacheKey, *record, 10*time.Minute)
	return record, nil
}

// Handlers for Fiber

func handleWhoisLookup(c *fiber.Ctx) error {
	resource := strings.TrimSpace(c.Params("resource"))
	if resource == "" {
		resource = strings.TrimSpace(c.Params("*"))
	}
	if resource == "" {
		resource = strings.TrimSpace(c.Params("+"))
	}
	if resource == "" {
		resource = strings.TrimSpace(c.Query("q"))
	}
	if resource == "" {
		path := c.Path()
		if strings.HasPrefix(path, "/api/whois/lookup/") {
			resource = strings.TrimPrefix(path, "/api/whois/lookup/")
		}
	}
	resource = strings.TrimSpace(resource)
	if resource == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Missing IP, ASN, or prefix parameter",
		})
	}

	if isAsnQuery(resource) {
		record, err := executeAsnLookup(resource)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.JSON(fiber.Map{
			"type": "asn",
			"data": record,
		})
	}

	record, err := executeIpLookup(resource)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(fiber.Map{
		"type": "ip",
		"data": record,
	})
}

func handleWhoisMyIp(c *fiber.Ctx) error {
	clientIP := c.Get("X-Forwarded-For")
	if clientIP == "" {
		clientIP = c.Get("X-Real-IP")
	}
	if clientIP == "" {
		clientIP = c.IP()
	}
	if strings.Contains(clientIP, ",") {
		clientIP = strings.TrimSpace(strings.Split(clientIP, ",")[0])
	}
	if strings.HasPrefix(clientIP, "::ffff:") {
		clientIP = clientIP[7:]
	}

	// If local, try public echo or default to RIPE
	if clientIP == "" || clientIP == "127.0.0.1" || clientIP == "::1" || strings.HasPrefix(clientIP, "10.") || strings.HasPrefix(clientIP, "192.168.") {
		var echoRes struct {
			IP string `json:"ip"`
		}
		if err := fetchJSON("https://api.ipify.org?format=json", &echoRes); err == nil && echoRes.IP != "" {
			clientIP = echoRes.IP
		} else {
			clientIP = "193.0.6.139"
		}
	}

	record, err := executeIpLookup(clientIP)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(fiber.Map{
		"clientIp": clientIP,
		"type":     "ip",
		"data":     record,
	})
}

func handleWhoisCountry(c *fiber.Ctx) error {
	code := strings.ToUpper(strings.TrimSpace(c.Params("code")))
	if code == "" {
		code = strings.ToUpper(strings.TrimSpace(c.Query("code")))
	}
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Country code required",
		})
	}

	cacheKey := "country_res_" + code
	if cached, ok := getFromMemCache(cacheKey); ok {
		res := cached.(models.CountryIpResource)
		res.Cached = true
		return c.JSON(fiber.Map{"data": res})
	}

	countryName := code
	if cMeta, ok := country.ByAlpha2Code(country.Alpha2Code(code)); ok {
		countryName = cMeta.NameStr()
	}

	var ripeStatRes struct {
		Data struct {
			QueryTime string `json:"query_time"`
			Resources struct {
				Ipv4 []string      `json:"ipv4"`
				Ipv6 []string      `json:"ipv6"`
				Asn  []interface{} `json:"asn"`
			} `json:"resources"`
		} `json:"data"`
	}

	u := fmt.Sprintf("https://stat.ripe.net/data/country-resource-list/data.json?resource=%s&v4_format=prefix", url.QueryEscape(code))
	if err := fetchJSON(u, &ripeStatRes); err != nil {
		u2 := fmt.Sprintf("https://stat.ripe.net/data/country-resource-list/data.json?resource=%s", url.QueryEscape(code))
		_ = fetchJSON(u2, &ripeStatRes)
	}

	var asns []int
	for _, a := range ripeStatRes.Data.Resources.Asn {
		switch v := a.(type) {
		case float64:
			asns = append(asns, int(v))
		case string:
			if n, err := strconv.Atoi(strings.TrimPrefix(strings.ToUpper(v), "AS")); err == nil {
				asns = append(asns, n)
			}
		}
	}

	var totalIpv4Est int64
	for _, p := range ripeStatRes.Data.Resources.Ipv4 {
		if strings.Contains(p, "/") {
			parts := strings.Split(p, "/")
			if cidr, err := strconv.Atoi(parts[1]); err == nil && cidr >= 0 && cidr <= 32 {
				totalIpv4Est += int64(1) << (32 - cidr)
			}
		} else {
			totalIpv4Est += 1
		}
	}

	result := models.CountryIpResource{
		CountryCode:                 code,
		CountryName:                 countryName,
		QueryTime:                   ripeStatRes.Data.QueryTime,
		IPv4Count:                   len(ripeStatRes.Data.Resources.Ipv4),
		IPv6Count:                   len(ripeStatRes.Data.Resources.Ipv6),
		AsnCount:                    len(asns),
		TotalEstimatedIPv4Addresses: totalIpv4Est,
		IPv4:                        ripeStatRes.Data.Resources.Ipv4,
		IPv6:                        ripeStatRes.Data.Resources.Ipv6,
		ASNs:                        asns,
		AsNames:                     make(map[string]string),
		PrefixOrgs:                  make(map[string]string),
		Cached:                      false,
	}

	setMemCache(cacheKey, result, 15*time.Minute)
	return c.JSON(fiber.Map{"data": result})
}

func handleWhoisResolveOrgs(c *fiber.Ctx) error {
	var body struct {
		Prefixes []string      `json:"prefixes"`
		Asns     []interface{} `json:"asns"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	orgs := make(map[string]string)
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Resolve AS names
	var asnNums []string
	for _, a := range body.Asns {
		var s string
		switch v := a.(type) {
		case float64:
			s = strconv.Itoa(int(v))
		case string:
			s = strings.TrimPrefix(strings.ToUpper(v), "AS")
		}
		if s != "" {
			asnNums = append(asnNums, s)
		}
	}

	if len(asnNums) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			var asRes struct {
				Data struct {
					Names map[string]string `json:"names"`
				} `json:"data"`
			}
			u := fmt.Sprintf("https://stat.ripe.net/data/as-names/data.json?resource=%s", strings.Join(asnNums, ","))
			if err := fetchJSON(u, &asRes); err == nil {
				mu.Lock()
				for k, v := range asRes.Data.Names {
					orgs["AS"+k] = v
					orgs[k] = v
				}
				mu.Unlock()
			}
		}()
	}

	// Resolve Prefixes
	for _, p := range body.Prefixes {
		prefix := p
		wg.Add(1)
		go func() {
			defer wg.Done()
			var pRes struct {
				Data struct {
					Asns []struct {
						Holder string `json:"holder"`
					} `json:"asns"`
				} `json:"data"`
			}
			u := fmt.Sprintf("https://stat.ripe.net/data/prefix-overview/data.json?resource=%s", url.QueryEscape(prefix))
			if err := fetchJSON(u, &pRes); err == nil && len(pRes.Data.Asns) > 0 && pRes.Data.Asns[0].Holder != "" {
				mu.Lock()
				orgs[prefix] = pRes.Data.Asns[0].Holder
				mu.Unlock()
			}
		}()
	}

	wg.Wait()
	return c.JSON(fiber.Map{"orgs": orgs})
}

func handleWhoisBatch(c *fiber.Ctx) error {
	var body struct {
		Items []string `json:"items"`
	}
	if err := c.BodyParser(&body); err != nil || len(body.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Request body must contain 'items' array",
		})
	}

	items := body.Items
	if len(items) > 50 {
		items = items[:50]
	}

	results := make([]models.BatchItemResult, len(items))
	var wg sync.WaitGroup

	for i, item := range items {
		idx := i
		target := strings.TrimSpace(item)
		wg.Add(1)
		go func() {
			defer wg.Done()
			rec, err := executeIpLookup(target)
			if err != nil {
				results[idx] = models.BatchItemResult{
					Query:  target,
					Status: "error",
					Error:  err.Error(),
				}
				return
			}
			results[idx] = models.BatchItemResult{
				Query:       rec.Query,
				Status:      "success",
				IPVersion:   4,
				Netname:     rec.Netname,
				Range:       rec.Range,
				Country:     rec.Country,
				CountryCode: rec.CountryCode,
				OriginAsn:   rec.Routing.OriginAsn,
				AbuseEmail:  rec.AbuseContact.Email,
			}
		}()
	}

	wg.Wait()
	return c.JSON(fiber.Map{
		"count": len(results),
		"items": results,
	})
}

func handleWhoisSubnet(c *fiber.Ctx) error {
	ip := strings.TrimSpace(c.Query("ip"))
	cidrStr := strings.TrimSpace(c.Query("cidr"))
	if ip == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Query parameter 'ip' is required",
		})
	}

	var cidrPtr *int
	if cidrStr != "" {
		if cVal, err := strconv.Atoi(cidrStr); err == nil {
			cidrPtr = &cVal
		}
	}

	res := computeSubnet(ip, cidrPtr)
	if res == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid IP or CIDR format",
		})
	}
	return c.JSON(fiber.Map{
		"data": res,
	})
}
