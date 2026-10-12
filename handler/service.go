package handler

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math"
	"math/bits"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/kzeedev/IP-Hub/database"
	"github.com/kzeedev/IP-Hub/models"
	"github.com/kzeedev/IP-Hub/pluginBase"
	country "github.com/mikekonan/go-countries"
)

// IPLookupService defines IP intelligence operations.
type IPLookupService interface {
	LookupIP(query string) (*models.WhoisRecord, error)
	ResolveClientIP(clientIP string) string
}

// ASNLookupService defines Autonomous System intelligence operations.
type ASNLookupService interface {
	LookupASN(query string) (*models.AsnRecord, error)
	IsAsnQuery(q string) bool
}

// CountryResourceService defines country IP and ASN delegation operations.
type CountryResourceService interface {
	LookupCountry(code string) (*models.CountryIpResource, error)
	FormatCountry(resource *models.CountryIpResource, format, version, access, listName string) *models.FormatResult
	GetAvailablePlugins() []models.PluginInfo
	GetResolverStatus() models.ResolverStatusResponse
}

// SubnetCalculatorService defines subnet and CIDR breakdown operations.
type SubnetCalculatorService interface {
	ComputeSubnet(input string, customCidr *int) *models.SubnetBreakdown
}

// BatchLookupService defines multi-target bulk inspection operations.
type BatchLookupService interface {
	BatchLookup(items []string) []models.BatchItemResult
}

// WhoisService aggregates network intelligence domain services.
type WhoisService interface {
	IPLookupService
	ASNLookupService
	CountryResourceService
	SubnetCalculatorService
	BatchLookupService
	CheckRipeStatus(ctx context.Context) string
}

// whoisService is the concrete implementation of WhoisService.
type whoisService struct {
	httpClient      *http.Client
	countryResolver *CountryNameResolver
}

// NewWhoisService creates a new WhoisService with standard timeouts.
func NewWhoisService() WhoisService {
	return NewWhoisServiceWithClient(&http.Client{
		Timeout: 7 * time.Second,
	})
}

// NewWhoisServiceWithClient creates a new WhoisService using the provided HTTP client.
func NewWhoisServiceWithClient(client *http.Client) WhoisService {
	if client == nil {
		client = &http.Client{Timeout: 7 * time.Second}
	}
	return &whoisService{
		httpClient:      client,
		countryResolver: NewCountryNameResolver(client),
	}
}

// getEndOfDayTtl returns the duration until the end of the current UTC day.
func getEndOfDayTtl() time.Duration {
	now := time.Now().UTC()
	endOfDay := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 1, 0, 0, time.UTC)
	ttl := endOfDay.Sub(now)
	if ttl < 5*time.Minute {
		ttl = 24 * time.Hour
	}
	return ttl
}

// IsAsnQuery checks if a query string represents a valid Autonomous System Number.
func IsAsnQuery(q string) bool {
	clean := strings.ToUpper(strings.TrimSpace(q))
	asnStr := clean
	if strings.HasPrefix(clean, "AS") {
		asnStr = clean[2:]
	}
	if asnStr == "" {
		return false
	}
	n, err := strconv.ParseUint(asnStr, 10, 32)
	return err == nil && n > 0 && n <= 4294967295
}

func (s *whoisService) IsAsnQuery(q string) bool {
	return IsAsnQuery(q)
}

// IpRangeToCIDR converts an IPv4 range (e.g. "193.0.0.0 - 193.0.7.255") to CIDR if it aligns to a valid network block.
func IpRangeToCIDR(rangeStr string) string {
	parts := strings.Split(rangeStr, "-")
	if len(parts) != 2 {
		return ""
	}
	startIP := net.ParseIP(strings.TrimSpace(parts[0])).To4()
	endIP := net.ParseIP(strings.TrimSpace(parts[1])).To4()
	if startIP == nil || endIP == nil {
		return ""
	}
	startUint := binary.BigEndian.Uint32(startIP)
	endUint := binary.BigEndian.Uint32(endIP)
	if endUint < startUint {
		return ""
	}
	count := uint64(endUint - startUint + 1)
	if count > 0 && (count&(count-1)) == 0 {
		trailing := bits.TrailingZeros64(count)
		if trailing <= 32 {
			shift := uint32(1 << trailing)
			if shift > 0 && startUint%shift == 0 {
				return fmt.Sprintf("%s/%d", startIP.String(), 32-trailing)
			}
		}
	}
	return ""
}

// ComputeSubnet calculates network bounds, host counts, and addresses for an IPv4/IPv6 input.
func ComputeSubnet(input string, customCidr *int) *models.SubnetBreakdown {
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
	} else if strings.Contains(trimmed, "-") {
		if c := IpRangeToCIDR(trimmed); c != "" {
			return ComputeSubnet(c, customCidr)
		}
		return nil
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
		switch prefix {
		case 31:
			usable = 2
		case 32:
			usable = 1
		default:
			usable = total - 2
		}

		var firstUsable, lastUsable string
		switch prefix {
		case 32:
			firstUsable = ip4.String()
			lastUsable = ip4.String()
		case 31:
			firstUsable = netIP.String()
			lastUsable = bcastIP.String()
		default:
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

func (s *whoisService) ComputeSubnet(input string, customCidr *int) *models.SubnetBreakdown {
	return ComputeSubnet(input, customCidr)
}

func (s *whoisService) fetchJSON(targetURL string, target interface{}) error {
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "IP-Hub-Server/2.0")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("status %d", resp.StatusCode)
	}

	return json.NewDecoder(resp.Body).Decode(target)
}

// CheckRipeStatus tests live availability and connectivity to RIPE Stat API.
// Returns "reachable", "unreachable", or "fail".
func (s *whoisService) CheckRipeStatus(ctx context.Context) string {
	var ripeResp struct {
		Status string `json:"status"`
	}

	err := s.fetchJSON("https://stat.ripe.net/data/network-info/data.json?resource=8.8.8.8", &ripeResp)
	if err != nil {
		if strings.HasPrefix(err.Error(), "status ") {
			return "fail"
		}
		return "unreachable"
	}

	if strings.EqualFold(ripeResp.Status, "ok") {
		return "reachable"
	}

	return "fail"
}

// LookupIP performs unified WHOIS lookup, GeoLocation resolution, and BGP routing status query.
func (s *whoisService) LookupIP(rawQuery string) (*models.WhoisRecord, error) {
	query := strings.TrimSpace(rawQuery)
	if len(query) == 0 || len(query) > 128 {
		return nil, fmt.Errorf("invalid query length (must be between 1 and 128 characters)")
	}
	cacheKey := "whois_ip_" + query
	var cachedRecord models.WhoisRecord
	if found, _ := database.GetJSON(cacheKey, &cachedRecord); found {
		cachedRecord.Cached = true
		return &cachedRecord, nil
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

	wg.Go(func() {
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
		if err := s.fetchJSON(u, &restRes); err == nil && len(restRes.Objects.Object) > 0 {
			var b strings.Builder
			for _, obj := range restRes.Objects.Object {
				pk := ""
				if len(obj.PrimaryKey.Attribute) > 0 {
					pk = obj.PrimaryKey.Attribute[0].Value
				}
				fmt.Fprintf(&b, "%% Object: %s %s\n", obj.Type, pk)
				var attrs []models.RipeAttribute
				for _, a := range obj.Attributes.Attribute {
					attrs = append(attrs, models.RipeAttribute{Name: a.Name, Value: a.Value, Comment: a.Comment})
					fmt.Fprintf(&b, "%-16s: %s\n", a.Name, a.Value)
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
	})

	wg.Go(func() {
		var parseCoord = func(v interface{}) (float64, bool) {
			if v == nil {
				return 0, false
			}
			switch val := v.(type) {
			case float64:
				return val, true
			case float32:
				return float64(val), true
			case int:
				return float64(val), true
			case int64:
				return float64(val), true
			case string:
				f, err := strconv.ParseFloat(strings.TrimSpace(val), 64)
				return f, err == nil
			}
			return 0, false
		}

		var geoRes struct {
			Data struct {
				LocatedResources []struct {
					Resource  string `json:"resource"`
					Locations []struct {
						Country           string      `json:"country"`
						CountryName       string      `json:"country_name"`
						City              string      `json:"city"`
						State             string      `json:"state"`
						Latitude          interface{} `json:"latitude"`
						Longitude         interface{} `json:"longitude"`
						Timezone          string      `json:"timezone"`
						Prefix            string      `json:"prefix"`
						Resources         []string    `json:"resources"`
						CoveredPercentage float64     `json:"covered_percentage"`
					} `json:"locations"`
				} `json:"located_resources"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/geoloc/data.json?resource=%s", url.QueryEscape(query))
		if err := s.fetchJSON(u, &geoRes); err == nil && len(geoRes.Data.LocatedResources) > 0 {
			for _, item := range geoRes.Data.LocatedResources {
				if len(item.Locations) > 0 {
					loc := item.Locations[0]
					if loc.Country != "" {
						geoLoc.CountryCode = strings.ToUpper(strings.TrimSpace(loc.Country))
					}
					if loc.CountryName != "" {
						geoLoc.Country = strings.TrimSpace(loc.CountryName)
					} else if geoLoc.CountryCode != "" && geoLoc.CountryCode != "XX" {
						if cName, ok := country.ByAlpha2Code(country.Alpha2Code(geoLoc.CountryCode)); ok {
							geoLoc.Country = cName.NameStr()
						}
					}
					if loc.City != "" {
						geoLoc.City = strings.TrimSpace(loc.City)
					}
					if loc.State != "" {
						geoLoc.Region = strings.TrimSpace(loc.State)
					}
					if loc.Timezone != "" {
						geoLoc.Timezone = strings.TrimSpace(loc.Timezone)
					}
					if loc.Prefix != "" {
						geoLoc.Prefix = strings.TrimSpace(loc.Prefix)
					} else if len(loc.Resources) > 0 {
						geoLoc.Prefix = strings.TrimSpace(loc.Resources[0])
					} else if item.Resource != "" {
						geoLoc.Prefix = strings.TrimSpace(item.Resource)
					}

					lat, okLat := parseCoord(loc.Latitude)
					lon, okLon := parseCoord(loc.Longitude)
					if okLat && okLon {
						geoLoc.Latitude = &lat
						geoLoc.Longitude = &lon
					}
					break
				}
			}
		}

		if geoLoc.Latitude == nil || geoLoc.CountryCode == "" || geoLoc.CountryCode == "XX" {
			var mmRes struct {
				Data struct {
					LocatedResources []struct {
						Resource  string `json:"resource"`
						Locations []struct {
							Country   string      `json:"country"`
							City      string      `json:"city"`
							Latitude  interface{} `json:"latitude"`
							Longitude interface{} `json:"longitude"`
							Resources []string    `json:"resources"`
						} `json:"locations"`
					} `json:"located_resources"`
				} `json:"data"`
			}
			uMax := fmt.Sprintf("https://stat.ripe.net/data/maxmind-geo-lite/data.json?resource=%s", url.QueryEscape(query))
			if err := s.fetchJSON(uMax, &mmRes); err == nil && len(mmRes.Data.LocatedResources) > 0 {
				for _, item := range mmRes.Data.LocatedResources {
					if len(item.Locations) > 0 {
						loc := item.Locations[0]
						if (geoLoc.CountryCode == "" || geoLoc.CountryCode == "XX") && loc.Country != "" {
							geoLoc.CountryCode = strings.ToUpper(strings.TrimSpace(loc.Country))
							if cName, ok := country.ByAlpha2Code(country.Alpha2Code(geoLoc.CountryCode)); ok {
								geoLoc.Country = cName.NameStr()
							}
						}
						if geoLoc.City == "" && loc.City != "" {
							geoLoc.City = strings.TrimSpace(loc.City)
						}
						if geoLoc.Prefix == "" && len(loc.Resources) > 0 {
							geoLoc.Prefix = strings.TrimSpace(loc.Resources[0])
						}
						if geoLoc.Latitude == nil {
							lat, okLat := parseCoord(loc.Latitude)
							lon, okLon := parseCoord(loc.Longitude)
							if okLat && okLon {
								geoLoc.Latitude = &lat
								geoLoc.Longitude = &lon
							}
						}
						break
					}
				}
			}
		}
	})

	wg.Go(func() {
		var routRes struct {
			Data struct {
				Resource  string `json:"resource"`
				Prefix    string `json:"prefix"`
				Announced bool   `json:"announced"`
				Origins   []struct {
					Origin interface{} `json:"origin"`
				} `json:"origins"`
				Visibility struct {
					V4 struct {
						RisPeersSeeing int `json:"ris_peers_seeing"`
						RisPeersSeen   int `json:"ris_peers_seen"`
						TotalRisPeers  int `json:"total_ris_peers"`
					} `json:"v4"`
					V6 struct {
						RisPeersSeeing int `json:"ris_peers_seeing"`
						RisPeersSeen   int `json:"ris_peers_seen"`
						TotalRisPeers  int `json:"total_ris_peers"`
					} `json:"v6"`
				} `json:"visibility"`
				LastUpdated string `json:"last_updated"`
				QueryTime   string `json:"query_time"`
				LastSeen    struct {
					Prefix string `json:"prefix"`
					Time   string `json:"time"`
				} `json:"last_seen"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/routing-status/data.json?resource=%s", url.QueryEscape(query))
		if err := s.fetchJSON(u, &routRes); err == nil {
			if routRes.Data.Prefix != "" {
				routing.AnnouncedPrefix = routRes.Data.Prefix
			} else if routRes.Data.Resource != "" {
				routing.AnnouncedPrefix = routRes.Data.Resource
			} else if routRes.Data.LastSeen.Prefix != "" {
				routing.AnnouncedPrefix = routRes.Data.LastSeen.Prefix
			}

			routing.IsAnnounced = routRes.Data.Announced || len(routRes.Data.Origins) > 0
			if len(routRes.Data.Origins) > 0 {
				var originStr string
				switch v := routRes.Data.Origins[0].Origin.(type) {
				case float64:
					originStr = strconv.FormatInt(int64(v), 10)
				case int:
					originStr = strconv.Itoa(v)
				case string:
					originStr = strings.TrimSpace(v)
				}
				if originStr != "" {
					if !strings.HasPrefix(strings.ToUpper(originStr), "AS") {
						routing.OriginAsn = "AS" + originStr
					} else {
						routing.OriginAsn = strings.ToUpper(originStr)
					}
				}
			}

			v4Seen := routRes.Data.Visibility.V4.RisPeersSeeing
			if v4Seen == 0 {
				v4Seen = routRes.Data.Visibility.V4.RisPeersSeen
			}
			v6Seen := routRes.Data.Visibility.V6.RisPeersSeeing
			if v6Seen == 0 {
				v6Seen = routRes.Data.Visibility.V6.RisPeersSeen
			}
			peersSeen := v4Seen + v6Seen

			totalPeers := routRes.Data.Visibility.V4.TotalRisPeers + routRes.Data.Visibility.V6.TotalRisPeers
			routing.RisPeersSeen = peersSeen
			routing.TotalRisPeers = totalPeers
			if totalPeers > 0 {
				routing.BgpVisibilityPercentage = int(math.Round(float64(peersSeen) / float64(totalPeers) * 100))
			}
			if routRes.Data.LastUpdated != "" {
				routing.LastUpdated = routRes.Data.LastUpdated
			} else if routRes.Data.QueryTime != "" {
				routing.LastUpdated = routRes.Data.QueryTime
			} else if routRes.Data.LastSeen.Time != "" {
				routing.LastUpdated = routRes.Data.LastSeen.Time
			}
		}
	})

	wg.Go(func() {
		var abuseRes struct {
			Data struct {
				AbuseContacts []string `json:"abuse_contacts"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=%s", url.QueryEscape(query))
		if err := s.fetchJSON(u, &abuseRes); err == nil && len(abuseRes.Data.AbuseContacts) > 0 {
			abuseEmail = abuseRes.Data.AbuseContacts[0]
		}
	})

	wg.Go(func() {
		if !strings.Contains(query, "/") && net.ParseIP(query) != nil {
			names, err := net.LookupAddr(query)
			if err == nil && len(names) > 0 {
				reverseDns = strings.TrimSuffix(names[0], ".")
			}
		}
	})

	wg.Go(func() {
		var netRes struct {
			Data struct {
				Prefix string   `json:"prefix"`
				Asns   []string `json:"asns"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/network-info/data.json?resource=%s", url.QueryEscape(query))
		if err := s.fetchJSON(u, &netRes); err == nil {
			netPrefix = netRes.Data.Prefix
			for _, a := range netRes.Data.Asns {
				if n, err := strconv.Atoi(a); err == nil {
					netAsns = append(netAsns, n)
				}
			}
		}
	})

	wg.Wait()

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
		if err := s.fetchJSON(u, &statWhois); err == nil && len(statWhois.Data.Records) > 0 {
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
					fmt.Fprintf(&b, "%-16s: %s\n", r.Key, r.Value)
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
		if isNetObj && obj.PrimaryKey != "" {
			if rangeStr == query || rangeStr == "" {
				rangeStr = obj.PrimaryKey
			}
		}
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

	if routing.OriginAsn == "Unrouted" && len(netAsns) > 0 {
		routing.OriginAsn = fmt.Sprintf("AS%d", netAsns[0])
		routing.IsAnnounced = true
	}

	// Resolve allocated CIDR prefix
	cidr := ""
	if netPrefix != "" {
		cidr = netPrefix
	} else if routing.AnnouncedPrefix != "" {
		cidr = routing.AnnouncedPrefix
	} else if strings.Contains(rangeStr, "/") {
		cidr = rangeStr
	} else if strings.Contains(rangeStr, "-") {
		if c := IpRangeToCIDR(rangeStr); c != "" {
			cidr = c
		}
	}

	if cidr == "" {
		cidr = query
	}

	// Compute subnet breakdown for the allocated network block
	subnet := ComputeSubnet(cidr, nil)
	if subnet == nil && cidr != query {
		subnet = ComputeSubnet(query, nil)
	}

	// Ensure rangeStr reflects the allocated range bounds
	if (rangeStr == query || rangeStr == "") && subnet != nil {
		if subnet.IPVersion == 4 && subnet.NetworkAddress != "" && subnet.BroadcastAddress != "" {
			rangeStr = fmt.Sprintf("%s - %s", subnet.NetworkAddress, subnet.BroadcastAddress)
		} else {
			rangeStr = subnet.CIDR
		}
	}

	if countryCode != "XX" && countryCode != "" {
		if cName, ok := country.ByAlpha2Code(country.Alpha2Code(countryCode)); ok {
			countryStr = cName.NameStr()
		}
	}

	if geoLoc.CountryCode == "" || geoLoc.CountryCode == "XX" {
		geoLoc.CountryCode = countryCode
	}
	if geoLoc.Country == "" || geoLoc.Country == "Unknown" {
		geoLoc.Country = countryStr
	}
	if geoLoc.CountryCode != "" && geoLoc.CountryCode != "XX" && (geoLoc.Country == "" || geoLoc.Country == "Unknown") {
		if cName, ok := country.ByAlpha2Code(country.Alpha2Code(geoLoc.CountryCode)); ok {
			geoLoc.Country = cName.NameStr()
		}
	}

	record := &models.WhoisRecord{
		Query: query,
		QueryType: func() string {
			if strings.Contains(query, ":") {
				return "ipv6"
			}
			return "ipv4"
		}(),
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

	_ = database.SetJSON(cacheKey, *record, 5*time.Minute)
	return record, nil
}

// LookupASN performs ASN routing overview, holder details, and announced prefixes query.
func (s *whoisService) LookupASN(rawQuery string) (*models.AsnRecord, error) {
	cleanAsn := strings.ToUpper(strings.TrimSpace(rawQuery))
	asnNumStr := strings.TrimPrefix(cleanAsn, "AS")
	asnUint, err := strconv.ParseUint(asnNumStr, 10, 32)
	if err != nil || asnUint == 0 || asnUint > 4294967295 {
		return nil, fmt.Errorf("invalid Autonomous System Number")
	}
	asnNum := int(asnUint)

	cacheKey := "whois_asn_" + asnNumStr
	var cachedRecord models.AsnRecord
	if found, _ := database.GetJSON(cacheKey, &cachedRecord); found {
		return &cachedRecord, nil
	}

	startTime := time.Now()

	var (
		wg        sync.WaitGroup
		holder    = fmt.Sprintf("Autonomous System %d", asnNum)
		announced bool
		prefixes  []string
		rawWhois  string
	)

	wg.Go(func() {
		var res struct {
			Data struct {
				Holder    string `json:"holder"`
				Announced bool   `json:"announced"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/as-overview/data.json?resource=AS%s", asnNumStr)
		if err := s.fetchJSON(u, &res); err == nil {
			if res.Data.Holder != "" {
				holder = res.Data.Holder
			}
			announced = res.Data.Announced
		}
	})

	wg.Go(func() {
		var res struct {
			Data struct {
				Prefixes []struct {
					Prefix string `json:"prefix"`
				} `json:"prefixes"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS%s", asnNumStr)
		if err := s.fetchJSON(u, &res); err == nil {
			for _, p := range res.Data.Prefixes {
				if p.Prefix != "" {
					prefixes = append(prefixes, p.Prefix)
				}
			}
		}
	})

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

	_ = database.SetJSON(cacheKey, *record, 10*time.Minute)
	return record, nil
}

// ResolveClientIP sanitizes, validates IP format, and falls back to public echo if running in local environment.
func (s *whoisService) ResolveClientIP(clientIP string) string {
	if strings.Contains(clientIP, ",") {
		clientIP = strings.TrimSpace(strings.Split(clientIP, ",")[0])
	}
	clientIP = strings.TrimPrefix(clientIP, "::ffff:")
	parsed := net.ParseIP(clientIP)

	if parsed == nil || clientIP == "" || parsed.IsLoopback() || parsed.IsUnspecified() || parsed.IsPrivate() {
		var echoRes struct {
			IP string `json:"ip"`
		}
		if err := s.fetchJSON("https://api.ipify.org?format=json", &echoRes); err == nil && echoRes.IP != "" && net.ParseIP(echoRes.IP) != nil {
			clientIP = echoRes.IP
		} else {
			clientIP = "193.0.6.139"
		}
	}
	return clientIP
}

// LookupCountry retrieves officially delegated IP prefixes and ASNs for an ISO country code.
func (s *whoisService) LookupCountry(code string) (*models.CountryIpResource, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if len(code) != 2 || code[0] < 'A' || code[0] > 'Z' || code[1] < 'A' || code[1] > 'Z' {
		return nil, fmt.Errorf("invalid country code: must be a 2-letter ISO 3166-1 alpha-2 code")
	}

	dailyTtl := getEndOfDayTtl()
	cacheKey := "country_res_" + code

	var cached models.CountryIpResource
	if found, _ := database.GetJSON(cacheKey, &cached); found {
		cached.Cached = true
		totalExpected := len(cached.IPv4) + len(cached.IPv6)
		if s.countryResolver != nil && (len(cached.AsNames) < len(cached.ASNs) || len(cached.PrefixOrgs) < totalExpected) {
			_, queueFull := s.countryResolver.Enqueue(code, cached.CountryName, cached.ASNs, cached.IPv4, cached.IPv6)
			cached.ResolverQueueFull = queueFull
		} else if s.countryResolver != nil {
			s.countryResolver.MarkCompleted(code)
		}
		return &cached, nil
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
	if err := s.fetchJSON(u, &ripeStatRes); err != nil {
		u2 := fmt.Sprintf("https://stat.ripe.net/data/country-resource-list/data.json?resource=%s", url.QueryEscape(code))
		_ = s.fetchJSON(u2, &ripeStatRes)
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

	asNamesMap := make(map[string]string)
	for _, asn := range asns {
		asnStr := strconv.Itoa(asn)
		var cachedName string
		if found, _ := database.GetJSON("asn_name_"+asnStr, &cachedName); found && cachedName != "" {
			asNamesMap["AS"+asnStr] = cachedName
			asNamesMap[asnStr] = cachedName
		}
	}

	prefixOrgsMap := make(map[string]string)
	for _, p := range ripeStatRes.Data.Resources.Ipv4 {
		var cachedOrg string
		if found, _ := database.GetJSON("prefix_org_"+p, &cachedOrg); found && cachedOrg != "" {
			prefixOrgsMap[p] = cachedOrg
		}
	}
	for _, p := range ripeStatRes.Data.Resources.Ipv6 {
		var cachedOrg string
		if found, _ := database.GetJSON("prefix_org_"+p, &cachedOrg); found && cachedOrg != "" {
			prefixOrgsMap[p] = cachedOrg
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
		AsNames:                     asNamesMap,
		PrefixOrgs:                  prefixOrgsMap,
		Cached:                      false,
	}

	_ = database.SetJSON(cacheKey, result, dailyTtl)

	if s.countryResolver != nil {
		_, queueFull := s.countryResolver.Enqueue(code, countryName, asns, ripeStatRes.Data.Resources.Ipv4, ripeStatRes.Data.Resources.Ipv6)
		result.ResolverQueueFull = queueFull
	}

	return &result, nil
}

var (
	pluginMu sync.RWMutex
	plugins  []pluginBase.Plugin
)

// SetPlugins sets the active plugins slice.
func SetPlugins(p []pluginBase.Plugin) {
	pluginMu.Lock()
	defer pluginMu.Unlock()
	plugins = p
}

// GetPlugins returns the active plugins slice.
func GetPlugins() []pluginBase.Plugin {
	pluginMu.RLock()
	defer pluginMu.RUnlock()
	return plugins
}

// GetAvailablePlugins returns the list of active formatting plugins and built-in formats.
func (s *whoisService) GetAvailablePlugins() []models.PluginInfo {
	pluginMu.RLock()
	defer pluginMu.RUnlock()

	result := make([]models.PluginInfo, 0, len(plugins)+2)
	for _, p := range plugins {
		result = append(result, models.PluginInfo{
			ID:   p.GetID(),
			Name: p.GetName(),
		})
	}

	result = append(result,
		models.PluginInfo{ID: "json", Name: "JSON Data"},
		models.PluginInfo{ID: "htaccess", Name: "Apache .htaccess"},
	)

	return result
}

// FormatCountry generates formatted firewall rules or network configuration scripts using plugins.
func (s *whoisService) FormatCountry(resource *models.CountryIpResource, format, version, access, listName string) *models.FormatResult {
	if resource == nil {
		return nil
	}

	cleanFormat := strings.ToLower(strings.TrimSpace(format))
	ipVer := pluginBase.Any
	switch strings.ToLower(strings.TrimSpace(version)) {
	case "ipv4":
		ipVer = pluginBase.IPv4
	case "ipv6":
		ipVer = pluginBase.IPv6
	}

	isAllow := strings.ToLower(strings.TrimSpace(access)) == "allow"

	asnStrs := make([]string, len(resource.ASNs))
	for i, a := range resource.ASNs {
		asnStrs[i] = fmt.Sprintf("%d", a)
	}

	lookup := pluginBase.Lookup{
		CountryCode: resource.CountryCode,
		CountryName: resource.CountryName,
		ASN:         asnStrs,
		IPv4:        resource.IPv4,
		IPv6:        resource.IPv6,
		UpdatedAt:   resource.QueryTime,
	}

	switch cleanFormat {
	case "json":
		b, _ := json.MarshalIndent(lookup, "", "  ")
		return &models.FormatResult{
			Text:      string(b),
			Filename:  fmt.Sprintf("%s.json", strings.ToLower(resource.CountryCode)),
			RuleCount: len(resource.IPv4) + len(resource.IPv6),
		}
	case "htaccess":
		acc := "Deny"
		if isAllow {
			acc = "Allow"
		}
		var text string
		switch ipVer {
		case pluginBase.IPv4:
			text = fmt.Sprintf("%s from %v", acc, strings.Join(lookup.IPv4, " "))
		case pluginBase.IPv6:
			text = fmt.Sprintf("%s from %v", acc, strings.Join(lookup.IPv6, " "))
		default:
			text = fmt.Sprintf("%s from %v\n%s from %v", acc, strings.Join(lookup.IPv4, " "), acc, strings.Join(lookup.IPv6, " "))
		}
		return &models.FormatResult{
			Text:      text,
			Filename:  fmt.Sprintf(".htaccess_%s", strings.ToLower(resource.CountryCode)),
			RuleCount: len(resource.IPv4) + len(resource.IPv6),
		}
	default:
		pluginMu.RLock()
		defer pluginMu.RUnlock()
		for _, p := range plugins {
			pID := strings.ToLower(p.GetID())
			if pID == cleanFormat || (cleanFormat == "pf" && pID == "freebsd-pf") {
				text := p.Format(lookup, ipVer, isAllow)
				return &models.FormatResult{
					Text:      text,
					Filename:  fmt.Sprintf("%s_%s.txt", strings.ToLower(resource.CountryCode), cleanFormat),
					RuleCount: len(resource.IPv4) + len(resource.IPv6),
				}
			}
		}
	}

	return &models.FormatResult{
		Text:      fmt.Sprintf("# No plugin found for format: %s", format),
		Filename:  fmt.Sprintf("%s_%s.txt", strings.ToLower(resource.CountryCode), format),
		RuleCount: 0,
	}
}

// GetResolverStatus returns current active and waiting country name resolution status.
func (s *whoisService) GetResolverStatus() models.ResolverStatusResponse {
	if s.countryResolver == nil {
		return models.ResolverStatusResponse{
			Active:    []models.ActiveCountryJob{},
			Waiting:   []models.QueuedCountry{},
			Completed: []string{},
		}
	}
	return s.countryResolver.GetStatus()
}

// BatchLookup inspects up to 50 IP addresses in parallel.
func (s *whoisService) BatchLookup(items []string) []models.BatchItemResult {
	if len(items) > 50 {
		items = items[:50]
	}

	results := make([]models.BatchItemResult, len(items))
	var wg sync.WaitGroup

	for i, item := range items {
		idx := i
		target := strings.TrimSpace(item)
		wg.Go(func() {
			rec, err := s.LookupIP(target)
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
		})
	}

	wg.Wait()
	return results
}
