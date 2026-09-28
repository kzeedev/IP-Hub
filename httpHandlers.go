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

	"github.com/gofiber/fiber/v3"
	"github.com/kzeedev/IP-Hub/database"
	"github.com/kzeedev/IP-Hub/models"
	"github.com/kzeedev/IP-Hub/pluginBase"
	country "github.com/mikekonan/go-countries"
)

// HTTP Client with sane timeouts
var httpClient = &http.Client{
	Timeout: 7 * time.Second,
}

// Calculate TTL to expire at the end of the current UTC day (00:01:00 UTC next day)
func getEndOfDayTtl() time.Duration {
	now := time.Now().UTC()
	endOfDay := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 1, 0, 0, time.UTC)
	ttl := endOfDay.Sub(now)
	if ttl < 5*time.Minute {
		ttl = 24 * time.Hour
	}
	return ttl
}

var (
	countryBgResolving sync.Map
)

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

	// 1. RIPE DB REST API Query
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
		if err := fetchJSON(u, &restRes); err == nil && len(restRes.Objects.Object) > 0 {
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

	// 2. RIPEstat Geolocation
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
		if err := fetchJSON(u, &geoRes); err == nil && len(geoRes.Data.LocatedResources) > 0 {
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

		// Fallback to maxmind-geo-lite if geoloc endpoint had no locations or missing coordinates
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
			if err := fetchJSON(uMax, &mmRes); err == nil && len(mmRes.Data.LocatedResources) > 0 {
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

	// 3. Routing Status
	wg.Go(func() {
		var routRes struct {
			Data struct {
				Prefix    string `json:"prefix"`
				Announced bool   `json:"announced"`
				Origins   []struct {
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
	})

	// 4. Abuse Contact Finder
	wg.Go(func() {
		var abuseRes struct {
			Data struct {
				AbuseContacts []string `json:"abuse_contacts"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=%s", url.QueryEscape(query))
		if err := fetchJSON(u, &abuseRes); err == nil && len(abuseRes.Data.AbuseContacts) > 0 {
			abuseEmail = abuseRes.Data.AbuseContacts[0]
		}
	})

	// 5. Reverse DNS
	wg.Go(func() {
		if !strings.Contains(query, "/") {
			names, err := net.LookupAddr(query)
			if err == nil && len(names) > 0 {
				reverseDns = strings.TrimSuffix(names[0], ".")
			}
		}
	})

	// 6. Network Info
	wg.Go(func() {
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
	})

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

	// Synchronize GeoLocation country if missing or XX
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

	_ = database.SetJSON(cacheKey, *record, 5*time.Minute)
	return record, nil
}

// Core Lookup ASN function
func executeAsnLookup(rawQuery string) (*models.AsnRecord, error) {
	cleanAsn := strings.ToUpper(strings.TrimSpace(rawQuery))
	asnNumStr := strings.TrimPrefix(cleanAsn, "AS")
	asnNum, _ := strconv.Atoi(asnNumStr)

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

	_ = database.SetJSON(cacheKey, *record, 10*time.Minute)
	return record, nil
}

// -----------------------------------------------------------------------------
// Fiber Handlers
// -----------------------------------------------------------------------------

type FormRequest struct {
	Country string `json:"country"`
	IPType  string `json:"version"`
	Format  string `json:"format"`
	Access  string `json:"access"`
}

// Legacy IP-Hub plugin endpoint (POST /lookup)
func handleRequest(c fiber.Ctx) error {
	request := new(FormRequest)

	if err := c.Bind().Body(request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	info, err := database.DB.GetOrSet(request.Country, func() (*pluginBase.Lookup, error) {
		result := lookup(request.Country)
		return &result, nil
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	switch request.Format {
	case "json":
		return c.JSON(info)
	case "htaccess":
		access := "Deny"
		if request.Access == "allow" {
			access = "Allow"
		}
		switch request.IPType {
		case "ipv4":
			return c.SendString(fmt.Sprintf("%s from %v", access, arrayToString(info.IPv4)))
		case "ipv6":
			return c.SendString(fmt.Sprintf("%s from %v", access, arrayToString(info.IPv6)))
		default:
			return c.SendString(fmt.Sprintf("%s from %v\n%s from %v", access, arrayToString(info.IPv4), access, arrayToString(info.IPv6)))
		}
	default:
		for _, plugin := range plugins {
			if plugin.GetID() == request.Format {
				result := plugin.Format(*info, pluginBase.IPVersion(request.IPType), request.Access == "allow")
				return c.SendString(result)
			}
		}
		fmt.Println(`Can't find plugin with id: `, request.Format)
	}
	return c.JSON(info)
}

// WHOIS Single Lookup (POST /api/whois/lookup)
func handleWhoisLookup(c fiber.Ctx) error {
	var body struct {
		Query string `json:"query"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	resource := strings.TrimSpace(body.Query)
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

// resolveClientIP sanitizes and falls back to public echo if running in local environment
func resolveClientIP(clientIP string) string {
	if strings.Contains(clientIP, ",") {
		clientIP = strings.TrimSpace(strings.Split(clientIP, ",")[0])
	}
	clientIP = strings.TrimPrefix(clientIP, "::ffff:")

	// If local or loopback, try public echo or default to RIPE
	if clientIP == "" || clientIP == "127.0.0.1" || clientIP == "::1" || clientIP == "0.0.0.0" || strings.HasPrefix(clientIP, "10.") || strings.HasPrefix(clientIP, "192.168.") {
		var echoRes struct {
			IP string `json:"ip"`
		}
		if err := fetchJSON("https://api.ipify.org?format=json", &echoRes); err == nil && echoRes.IP != "" {
			clientIP = echoRes.IP
		} else {
			clientIP = "193.0.6.139"
		}
	}
	return clientIP
}

// Client IP Lookup (GET /api/whois/myip)
func handleWhoisMyIp(c fiber.Ctx) error {
	clientIP := c.Get("X-Forwarded-For")
	if clientIP == "" {
		clientIP = c.Get("X-Real-IP")
	}
	if clientIP == "" {
		clientIP = c.IP()
	}
	clientIP = resolveClientIP(clientIP)

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

// Country Resource Explorer (POST /api/whois/country)
func handleWhoisCountry(c fiber.Ctx) error {
	var body struct {
		Code string `json:"code"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	code := strings.ToUpper(strings.TrimSpace(body.Code))
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Country code required",
		})
	}

	res, err := executeCountryLookup(code)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"data": res})
}

// Core Country Lookup logic
func executeCountryLookup(code string) (*models.CountryIpResource, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" {
		return nil, fmt.Errorf("country code required")
	}

	dailyTtl := getEndOfDayTtl()
	cacheKey := "country_res_" + code

	var cached models.CountryIpResource
	if found, _ := database.GetJSON(cacheKey, &cached); found {
		cached.Cached = true
		// Trigger background resolution for any remaining unresolved ISP names if not already running
		go startBackgroundCountryIspResolution(code, cached.ASNs, cached.IPv4, cached.IPv6)
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

	// Pre-populate any ASN names and prefix orgs already in cache
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

	// Store in Redis with daily end-of-day TTL
	_ = database.SetJSON(cacheKey, result, dailyTtl)

	// Start background fetching & caching of selected country's ISP / Org names
	go startBackgroundCountryIspResolution(code, asns, ripeStatRes.Data.Resources.Ipv4, ripeStatRes.Data.Resources.Ipv6)

	return &result, nil
}

// Background goroutine to resolve and cache all ASN names and Prefix orgs for a country
func startBackgroundCountryIspResolution(countryCode string, asns []int, ipv4 []string, ipv6 []string) {
	if _, loaded := countryBgResolving.LoadOrStore(countryCode, true); loaded {
		return
	}
	defer countryBgResolving.Delete(countryCode)

	dailyTtl := getEndOfDayTtl()
	cacheKey := "country_res_" + countryCode

	// 1. Batch resolve AS Names in chunks of 50
	var missingAsns []string
	for _, asn := range asns {
		asnStr := strconv.Itoa(asn)
		var val string
		if found, _ := database.GetJSON("asn_name_"+asnStr, &val); !found || val == "" {
			missingAsns = append(missingAsns, asnStr)
		}
	}

	const asnChunkSize = 50
	for i := 0; i < len(missingAsns); i += asnChunkSize {
		end := min(i+asnChunkSize, len(missingAsns))
		chunk := missingAsns[i:end]

		var asRes struct {
			Data struct {
				Names map[string]string `json:"names"`
			} `json:"data"`
		}
		u := fmt.Sprintf("https://stat.ripe.net/data/as-names/data.json?resource=%s", strings.Join(chunk, ","))
		if err := fetchJSON(u, &asRes); err == nil && asRes.Data.Names != nil {
			for k, v := range asRes.Data.Names {
				_ = database.SetJSON("asn_name_"+k, v, dailyTtl)
				_ = database.SetJSON("asn_name_AS"+k, v, dailyTtl)
			}

			var res models.CountryIpResource
			if found, _ := database.GetJSON(cacheKey, &res); found {
				if res.AsNames == nil {
					res.AsNames = make(map[string]string)
				}
				for k, v := range asRes.Data.Names {
					res.AsNames["AS"+k] = v
					res.AsNames[k] = v
				}
				_ = database.SetJSON(cacheKey, res, dailyTtl)
			}
		}
		time.Sleep(50 * time.Millisecond)
	}

	// 2. Concurrently resolve Prefix Organizations
	allPrefixes := append([]string{}, ipv4...)
	allPrefixes = append(allPrefixes, ipv6...)

	var missingPrefixes []string
	for _, p := range allPrefixes {
		var val string
		if found, _ := database.GetJSON("prefix_org_"+p, &val); !found || val == "" {
			missingPrefixes = append(missingPrefixes, p)
		}
	}

	if len(missingPrefixes) == 0 {
		return
	}

	workerCount := 6
	prefixChan := make(chan string, len(missingPrefixes))
	for _, p := range missingPrefixes {
		prefixChan <- p
	}
	close(prefixChan)

	var wg sync.WaitGroup

	for range workerCount {
		wg.Go(func() {
			for prefix := range prefixChan {
				var pRes struct {
					Data struct {
						Asns []struct {
							Holder string `json:"holder"`
						} `json:"asns"`
					} `json:"data"`
				}
				u := fmt.Sprintf("https://stat.ripe.net/data/prefix-overview/data.json?resource=%s", url.QueryEscape(prefix))
				if err := fetchJSON(u, &pRes); err == nil && len(pRes.Data.Asns) > 0 && pRes.Data.Asns[0].Holder != "" {
					holder := pRes.Data.Asns[0].Holder
					_ = database.SetJSON("prefix_org_"+prefix, holder, dailyTtl)

					var res models.CountryIpResource
					if found, _ := database.GetJSON(cacheKey, &res); found {
						if res.PrefixOrgs == nil {
							res.PrefixOrgs = make(map[string]string)
						}
						res.PrefixOrgs[prefix] = holder
						_ = database.SetJSON(cacheKey, res, dailyTtl)
					}
				}
				time.Sleep(30 * time.Millisecond)
			}
		})
	}
	wg.Wait()
}

// executeResolveOrgs resolves ASN and prefix organization names
func executeResolveOrgs(asns []interface{}, prefixes []string) map[string]string {
	dailyTtl := getEndOfDayTtl()
	orgs := make(map[string]string)
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Resolve AS names
	var missingAsns []string
	for _, a := range asns {
		var s string
		switch v := a.(type) {
		case float64:
			s = strconv.Itoa(int(v))
		case string:
			s = strings.TrimPrefix(strings.ToUpper(v), "AS")
		}
		if s != "" {
			var name string
			if found, _ := database.GetJSON("asn_name_"+s, &name); found && name != "" {
				orgs["AS"+s] = name
				orgs[s] = name
			} else {
				missingAsns = append(missingAsns, s)
			}
		}
	}

	if len(missingAsns) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			var asRes struct {
				Data struct {
					Names map[string]string `json:"names"`
				} `json:"data"`
			}
			u := fmt.Sprintf("https://stat.ripe.net/data/as-names/data.json?resource=%s", strings.Join(missingAsns, ","))
			if err := fetchJSON(u, &asRes); err == nil && asRes.Data.Names != nil {
				mu.Lock()
				for k, v := range asRes.Data.Names {
					orgs["AS"+k] = v
					orgs[k] = v
					_ = database.SetJSON("asn_name_"+k, v, dailyTtl)
					_ = database.SetJSON("asn_name_AS"+k, v, dailyTtl)
				}
				mu.Unlock()
			}
		}()
	}

	// Resolve Prefixes
	var missingPrefixes []string
	for _, p := range prefixes {
		var org string
		if found, _ := database.GetJSON("prefix_org_"+p, &org); found && org != "" {
			orgs[p] = org
		} else {
			missingPrefixes = append(missingPrefixes, p)
		}
	}

	for _, p := range missingPrefixes {
		prefix := p
		wg.Go(func() {
			var pRes struct {
				Data struct {
					Asns []struct {
						Holder string `json:"holder"`
					} `json:"asns"`
				} `json:"data"`
			}
			u := fmt.Sprintf("https://stat.ripe.net/data/prefix-overview/data.json?resource=%s", url.QueryEscape(prefix))
			if err := fetchJSON(u, &pRes); err == nil && len(pRes.Data.Asns) > 0 && pRes.Data.Asns[0].Holder != "" {
				holder := pRes.Data.Asns[0].Holder
				mu.Lock()
				orgs[prefix] = holder
				mu.Unlock()
				_ = database.SetJSON("prefix_org_"+prefix, holder, dailyTtl)
			}
		})
	}

	wg.Wait()
	return orgs
}

// Bulk Org Resolution (POST /api/whois/resolve-orgs)
func handleWhoisResolveOrgs(c fiber.Ctx) error {
	var body struct {
		Prefixes []string      `json:"prefixes"`
		Asns     []interface{} `json:"asns"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	orgs := executeResolveOrgs(body.Asns, body.Prefixes)
	return c.JSON(fiber.Map{"orgs": orgs})
}

// executeBatchLookup inspects up to 50 IP addresses in parallel
func executeBatchLookup(items []string) []models.BatchItemResult {
	if len(items) > 50 {
		items = items[:50]
	}

	results := make([]models.BatchItemResult, len(items))
	var wg sync.WaitGroup

	for i, item := range items {
		idx := i
		target := strings.TrimSpace(item)
		wg.Go(func() {
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
		})
	}

	wg.Wait()
	return results
}

// Batch WHOIS Lookup (POST /api/whois/batch)
func handleWhoisBatch(c fiber.Ctx) error {
	var body struct {
		Items []string `json:"items"`
	}
	if err := c.Bind().Body(&body); err != nil || len(body.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Request body must contain 'items' array",
		})
	}

	results := executeBatchLookup(body.Items)
	return c.JSON(fiber.Map{
		"count": len(results),
		"items": results,
	})
}

// CIDR / Subnet Breakdown (GET /api/whois/subnet)
func handleWhoisSubnet(c fiber.Ctx) error {
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
