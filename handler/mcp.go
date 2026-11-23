package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
	"github.com/kzeedev/IP-Hub/config"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// MCPWhoisLookupArgs defines input arguments for the whois_lookup MCP tool.
type MCPWhoisLookupArgs struct {
	Query string `json:"query" jsonschema:"IPv4 address, IPv6 address, Autonomous System Number (e.g. AS15169 or 15169), or CIDR prefix (e.g. 8.8.8.0/24)"`
}

// MCPWhoisBatchArgs defines input arguments for the whois_batch MCP tool.
type MCPWhoisBatchArgs struct {
	Items []string `json:"items" jsonschema:"List of IPv4 or IPv6 addresses to inspect in parallel (maximum 50 items)"`
}

// MCPCountryResourcesArgs defines input arguments for the country_resources MCP tool.
type MCPCountryResourcesArgs struct {
	Code     string `json:"code" jsonschema:"Two-letter ISO 3166-1 alpha-2 country code (e.g. US, DE, IR, GB)"`
	Format   string `json:"format,omitempty" jsonschema:"Optional firewall or export format (mikrotik, cisco, freebsd-pf, ipset, fortigate, htaccess, json)"`
	Version  string `json:"version,omitempty" jsonschema:"Optional IP version filter: any, ipv4, or ipv6 (default: any)"`
	Access   string `json:"access,omitempty" jsonschema:"Optional firewall access policy: allow or deny (default: allow)"`
	ListName string `json:"listName,omitempty" jsonschema:"Optional custom address list or ACL name (defaults to country code)"`
}

// MCPSubnetCalculatorArgs defines input arguments for the subnet_calculator MCP tool.
type MCPSubnetCalculatorArgs struct {
	IP   string `json:"ip" jsonschema:"IPv4 or IPv6 address or CIDR block (e.g. 192.168.1.1/24 or 2001:db8::/32)"`
	CIDR *int   `json:"cidr,omitempty" jsonschema:"Optional CIDR prefix length override (0-32 for IPv4, 0-128 for IPv6)"`
}

// MCPSystemStatusArgs defines input arguments for the system_status MCP tool.
type MCPSystemStatusArgs struct{}

// MCPListPluginsArgs defines input arguments for the list_plugins MCP tool.
type MCPListPluginsArgs struct{}

func marshalIndentJSON(v any) (string, error) {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func toolErrorResult(msg string) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		IsError: true,
		Content: []mcp.Content{
			&mcp.TextContent{Text: msg},
		},
	}
}

func toolJSONResult(v any) (*mcp.CallToolResult, any, error) {
	text, err := marshalIndentJSON(v)
	if err != nil {
		return nil, nil, err
	}
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: text},
		},
	}, nil, nil
}

// NewMCPServer constructs and configures the IP-Hub Model Context Protocol (MCP) server
// with tools, resources, resource templates, and prompts.
func (h *Handler) NewMCPServer() *mcp.Server {
	server := mcp.NewServer(&mcp.Implementation{
		Name:        "ip-hub",
		Title:       "IP-Hub Network Intelligence MCP Server",
		Version:     config.GetVersion(),
		WebsiteURL:  "https://ip-hub.ir",
		Description: "Real-time RIPE WHOIS intelligence, country IP allocations, multi-format firewall rule generator, BGP routing inspection, and CIDR subnet calculation.",
	}, &mcp.ServerOptions{
		Instructions: "Use IP-Hub tools and resources to inspect IPv4/IPv6 addresses, Autonomous System Numbers (ASNs), CIDR subnets, and generate country-level firewall rules (MikroTik RouterOS, Cisco ACL, FreeBSD PF, Linux ipset, Fortigate, Apache .htaccess, JSON).",
	})

	h.registerMCPTools(server)
	h.registerMCPResources(server)
	h.registerMCPPrompts(server)

	return server
}

func (h *Handler) registerMCPTools(server *mcp.Server) {
	// 1. whois_lookup
	mcp.AddTool(server, &mcp.Tool{
		Name:        "whois_lookup",
		Title:       "WHOIS & BGP Routing Lookup",
		Description: "Performs unified real-time WHOIS, geolocation, abuse contact, and BGP routing lookup for an IPv4 address, IPv6 address, Autonomous System Number (ASN), or CIDR prefix.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args MCPWhoisLookupArgs) (*mcp.CallToolResult, any, error) {
		query := strings.TrimSpace(args.Query)
		if query == "" {
			return toolErrorResult("Missing required 'query' parameter (IP address, ASN, or CIDR prefix)"), nil, nil
		}

		if h.svc.IsAsnQuery(query) {
			record, err := h.svc.LookupASN(query)
			if err != nil {
				return toolErrorResult(fmt.Sprintf("ASN lookup failed: %v", err)), nil, nil
			}
			return toolJSONResult(map[string]any{
				"type": "asn",
				"data": record,
			})
		}

		record, err := h.svc.LookupIP(query)
		if err != nil {
			return toolErrorResult(fmt.Sprintf("IP lookup failed: %v", err)), nil, nil
		}
		return toolJSONResult(map[string]any{
			"type": "ip",
			"data": record,
		})
	})

	// 2. whois_batch
	mcp.AddTool(server, &mcp.Tool{
		Name:        "whois_batch",
		Title:       "Batch IP WHOIS Inspection",
		Description: "Inspects up to 50 IPv4/IPv6 addresses in parallel, returning network ownership, netname, range, country, origin ASN, AS name, and abuse email.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args MCPWhoisBatchArgs) (*mcp.CallToolResult, any, error) {
		if len(args.Items) == 0 {
			return toolErrorResult("Parameter 'items' must contain at least one IP address"), nil, nil
		}
		if len(args.Items) > 50 {
			return toolErrorResult("Batch size exceeds maximum limit of 50 items"), nil, nil
		}

		results := h.svc.BatchLookup(args.Items)
		return toolJSONResult(map[string]any{
			"count": len(results),
			"items": results,
		})
	})

	// 3. country_resources
	mcp.AddTool(server, &mcp.Tool{
		Name:        "country_resources",
		Title:       "Country IP Allocations & Firewall Rule Generator",
		Description: "Fetches allocated IPv4/IPv6 CIDR blocks and ASNs for a country (accepts 2-letter ISO code, 3-letter code, or English/Persian country name), and optionally generates formatted firewall rules (mikrotik, cisco, freebsd-pf, ipset, fortigate, htaccess, json).",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args MCPCountryResourcesArgs) (*mcp.CallToolResult, any, error) {
		code, _ := resolveCountryInput(args.Code, false)
		if len(code) != 2 || code[0] < 'A' || code[0] > 'Z' || code[1] < 'A' || code[1] > 'Z' {
			return toolErrorResult("Country must be a valid ISO country code or country name (e.g. US, DE, IR, Iran, Germany, ایران)"), nil, nil
		}

		res, err := h.svc.LookupCountry(code)
		if err != nil {
			return toolErrorResult(fmt.Sprintf("Country lookup failed: %v", err)), nil, nil
		}

		output := map[string]any{
			"data": res,
		}

		format, _ := resolveFormatInput(args.Format)
		if strings.TrimSpace(args.Format) != "" && format != "" {
			version := strings.ToLower(strings.TrimSpace(args.Version))
			if version == "" {
				version = "any"
			}
			access := strings.ToLower(strings.TrimSpace(args.Access))
			if access != "deny" {
				access = "allow"
			}
			listName := strings.TrimSpace(args.ListName)
			if listName == "" {
				listName = code
			}
			output["result"] = h.svc.FormatCountry(res, format, version, access, listName)
		}

		return toolJSONResult(output)
	})

	// 4. subnet_calculator
	mcp.AddTool(server, &mcp.Tool{
		Name:        "subnet_calculator",
		Title:       "CIDR Subnet Calculator",
		Description: "Calculates network address, broadcast address, netmask, wildcard mask, usable host range, total/usable hosts, and binary IP representation for an IPv4 or IPv6 CIDR block.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args MCPSubnetCalculatorArgs) (*mcp.CallToolResult, any, error) {
		ip := strings.TrimSpace(args.IP)
		if ip == "" {
			return toolErrorResult("Parameter 'ip' is required"), nil, nil
		}
		if len(ip) > 64 {
			return toolErrorResult("Parameter 'ip' exceeds maximum length of 64 characters"), nil, nil
		}

		breakdown := h.svc.ComputeSubnet(ip, args.CIDR)
		if breakdown == nil {
			return toolErrorResult("Invalid IP address or CIDR format"), nil, nil
		}
		return toolJSONResult(map[string]any{
			"data": breakdown,
		})
	})

	// 5. system_status
	mcp.AddTool(server, &mcp.Tool{
		Name:        "system_status",
		Title:       "IP-Hub System & Resolver Status",
		Description: "Checks the current IP-Hub application version, upstream RIPE Stat API reachability, and background country name resolver queue progress.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args MCPSystemStatusArgs) (*mcp.CallToolResult, any, error) {
		ripeStatus := h.svc.CheckRipeStatus(ctx)
		resolvers := h.svc.GetResolverStatus()
		if resolvers.Completed == nil {
			resolvers.Completed = []string{}
		}
		return toolJSONResult(map[string]any{
			"version":   config.GetVersion(),
			"status":    ripeStatus,
			"resolvers": resolvers,
		})
	})

	// 6. list_plugins
	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_plugins",
		Title:       "List Firewall & Export Plugins",
		Description: "Lists all available firewall rule formatting plugins and built-in export formats supported by IP-Hub.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, args MCPListPluginsArgs) (*mcp.CallToolResult, any, error) {
		plugins := h.svc.GetAvailablePlugins()
		return toolJSONResult(map[string]any{
			"plugins": plugins,
		})
	})
}

func (h *Handler) registerMCPResources(server *mcp.Server) {
	// Static Resource 1: System Status
	server.AddResource(&mcp.Resource{
		URI:         "iphub://system/status",
		Name:        "system-status",
		Title:       "IP-Hub System & RIPE API Status",
		Description: "Live application version, upstream RIPE Stat API reachability, and background country name resolver progress.",
		MIMEType:    "application/json",
	}, func(ctx context.Context, req *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
		resolvers := h.svc.GetResolverStatus()
		if resolvers.Completed == nil {
			resolvers.Completed = []string{}
		}
		text, err := marshalIndentJSON(map[string]any{
			"version":   config.GetVersion(),
			"status":    h.svc.CheckRipeStatus(ctx),
			"resolvers": resolvers,
		})
		if err != nil {
			return nil, err
		}
		return &mcp.ReadResourceResult{
			Contents: []*mcp.ResourceContents{
				{
					URI:      req.Params.URI,
					MIMEType: "application/json",
					Text:     text,
				},
			},
		}, nil
	})

	// Static Resource 2: Available Plugins
	server.AddResource(&mcp.Resource{
		URI:         "iphub://system/plugins",
		Name:        "system-plugins",
		Title:       "Available Firewall & Export Formatting Plugins",
		Description: "List of all loaded formatting plugins and built-in formats (e.g. mikrotik, cisco, freebsd-pf, ipset, fortigate, json, htaccess).",
		MIMEType:    "application/json",
	}, func(ctx context.Context, req *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
		text, err := marshalIndentJSON(map[string]any{
			"plugins": h.svc.GetAvailablePlugins(),
		})
		if err != nil {
			return nil, err
		}
		return &mcp.ReadResourceResult{
			Contents: []*mcp.ResourceContents{
				{
					URI:      req.Params.URI,
					MIMEType: "application/json",
					Text:     text,
				},
			},
		}, nil
	})

	// Static Resource 3: llms.txt Documentation
	server.AddResource(&mcp.Resource{
		URI:         "iphub://docs/llms.txt",
		Name:        "llms-txt",
		Title:       "IP-Hub AI & LLM Reference Documentation (llms.txt)",
		Description: "Comprehensive Markdown documentation of IP-Hub architecture, endpoints, parameters, and usage examples for AI agents.",
		MIMEType:    "text/markdown",
	}, func(ctx context.Context, req *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
		var content string
		for _, candidate := range []string{"./web/dist/llms.txt", "./web/public/llms.txt", "../web/public/llms.txt"} {
			if data, err := os.ReadFile(candidate); err == nil && len(data) > 0 {
				content = string(data)
				break
			}
		}
		if content == "" {
			content = "# IP-Hub Network Intelligence Platform\n\nReal-time RIPE WHOIS lookup, ASN routing inspection, CIDR subnet calculator, and country IP firewall generator.\n"
		}
		return &mcp.ReadResourceResult{
			Contents: []*mcp.ResourceContents{
				{
					URI:      req.Params.URI,
					MIMEType: "text/markdown",
					Text:     content,
				},
			},
		}, nil
	})

	// Dynamic Resource Template 1: Country IP & ASN Allocations
	server.AddResourceTemplate(&mcp.ResourceTemplate{
		URITemplate: "iphub://country/{code}",
		Name:        "country-allocations",
		Title:       "Country IP & ASN Allocations by ISO Country Code",
		Description: "Allocated IPv4 CIDR blocks, IPv6 prefixes, and Origin ASNs for a 2-letter ISO 3166-1 alpha-2 country code (e.g. iphub://country/IR).",
		MIMEType:    "application/json",
	}, func(ctx context.Context, req *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
		uri := req.Params.URI
		prefix := "iphub://country/"
		if !strings.HasPrefix(uri, prefix) {
			return nil, mcp.ResourceNotFoundError(uri)
		}
		code := strings.ToUpper(strings.Trim(strings.TrimPrefix(uri, prefix), "/"))
		if len(code) != 2 || code[0] < 'A' || code[0] > 'Z' || code[1] < 'A' || code[1] > 'Z' {
			return nil, mcp.ResourceNotFoundError(uri)
		}

		res, err := h.svc.LookupCountry(code)
		if err != nil {
			return nil, err
		}
		text, err := marshalIndentJSON(res)
		if err != nil {
			return nil, err
		}
		return &mcp.ReadResourceResult{
			Contents: []*mcp.ResourceContents{
				{
					URI:      uri,
					MIMEType: "application/json",
					Text:     text,
				},
			},
		}, nil
	})

	// Dynamic Resource Template 2: Formatted Country Firewall Rules
	server.AddResourceTemplate(&mcp.ResourceTemplate{
		URITemplate: "iphub://country/{code}/rules/{format}",
		Name:        "country-firewall-rules",
		Title:       "Formatted Country Firewall Rules",
		Description: "Generated firewall rules for a country code in the specified format (e.g. iphub://country/IR/rules/mikrotik).",
		MIMEType:    "text/plain",
	}, func(ctx context.Context, req *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
		uri := req.Params.URI
		prefix := "iphub://country/"
		if !strings.HasPrefix(uri, prefix) {
			return nil, mcp.ResourceNotFoundError(uri)
		}
		rest := strings.TrimPrefix(uri, prefix)
		parts := strings.Split(rest, "/rules/")
		if len(parts) != 2 {
			return nil, mcp.ResourceNotFoundError(uri)
		}
		code := strings.ToUpper(strings.TrimSpace(parts[0]))
		format := strings.ToLower(strings.Trim(strings.TrimSpace(parts[1]), "/"))
		if len(code) != 2 || code[0] < 'A' || code[0] > 'Z' || code[1] < 'A' || code[1] > 'Z' || format == "" {
			return nil, mcp.ResourceNotFoundError(uri)
		}

		res, err := h.svc.LookupCountry(code)
		if err != nil {
			return nil, err
		}
		formatted := h.svc.FormatCountry(res, format, "any", "allow", code)
		if formatted == nil {
			return nil, mcp.ResourceNotFoundError(uri)
		}

		mimeType := "text/plain"
		if format == "json" {
			mimeType = "application/json"
		}
		return &mcp.ReadResourceResult{
			Contents: []*mcp.ResourceContents{
				{
					URI:      uri,
					MIMEType: mimeType,
					Text:     formatted.Text,
				},
			},
		}, nil
	})
}

func isPersianLang(lang string) bool {
	l := strings.ToLower(strings.TrimSpace(lang))
	return l == "fa" || l == "persian" || l == "farsi" || l == "ir" || l == "فارسی"
}

type countryNamesEntry struct {
	en string
	fa string
}

// isoCountryDictionary mirrors COUNTRY_DICTIONARY in web/src/utils/countries.ts.
var isoCountryDictionary = map[string]countryNamesEntry{
	"IR": {en: "Iran", fa: "ایران"},
	"NL": {en: "Netherlands", fa: "هلند"},
	"DE": {en: "Germany", fa: "آلمان"},
	"GB": {en: "United Kingdom", fa: "بریتانیا"},
	"FR": {en: "France", fa: "فرانسه"},
	"US": {en: "United States", fa: "ایالات متحده آمریکا"},
	"CA": {en: "Canada", fa: "کانادا"},
	"TR": {en: "Turkey", fa: "ترکیه"},
	"AE": {en: "United Arab Emirates", fa: "امارات متحده عربی"},
	"IT": {en: "Italy", fa: "ایتالیا"},
	"ES": {en: "Spain", fa: "اسپانیا"},
	"CH": {en: "Switzerland", fa: "سوئیس"},
	"SE": {en: "Sweden", fa: "سوئد"},
	"FI": {en: "Finland", fa: "فنلاند"},
	"NO": {en: "Norway", fa: "نروژ"},
	"RU": {en: "Russian Federation", fa: "روسیه"},
	"JP": {en: "Japan", fa: "ژاپن"},
	"SG": {en: "Singapore", fa: "سنگاپور"},
	"AU": {en: "Australia", fa: "استرالیا"},
	"BR": {en: "Brazil", fa: "برزیل"},
	"AF": {en: "Afghanistan", fa: "افغانستان"},
	"AL": {en: "Albania", fa: "آلبانی"},
	"DZ": {en: "Algeria", fa: "الجزایر"},
	"AR": {en: "Argentina", fa: "آرژانتین"},
	"AM": {en: "Armenia", fa: "ارمنستان"},
	"AT": {en: "Austria", fa: "اتریش"},
	"AZ": {en: "Azerbaijan", fa: "آذربایجان"},
	"BH": {en: "Bahrain", fa: "بحرین"},
	"BD": {en: "Bangladesh", fa: "بنگلادش"},
	"BY": {en: "Belarus", fa: "بلاروس"},
	"BE": {en: "Belgium", fa: "بلژیک"},
	"BO": {en: "Bolivia", fa: "بولیوی"},
	"BA": {en: "Bosnia and Herzegovina", fa: "بوسنی و هرزگوین"},
	"BG": {en: "Bulgaria", fa: "بلغارستان"},
	"CL": {en: "Chile", fa: "شیلی"},
	"CN": {en: "China", fa: "چین"},
	"CO": {en: "Colombia", fa: "کلمبیا"},
	"HR": {en: "Croatia", fa: "کرواسی"},
	"CY": {en: "Cyprus", fa: "قبرس"},
	"CZ": {en: "Czech Republic", fa: "جمهوری چک"},
	"DK": {en: "Denmark", fa: "دانمارک"},
	"EG": {en: "Egypt", fa: "مصر"},
	"EE": {en: "Estonia", fa: "استونی"},
	"GE": {en: "Georgia", fa: "گرجستان"},
	"GR": {en: "Greece", fa: "یونان"},
	"HK": {en: "Hong Kong", fa: "هنگ کنگ"},
	"HU": {en: "Hungary", fa: "مجارستان"},
	"IS": {en: "Iceland", fa: "ایسلند"},
	"IN": {en: "India", fa: "هند"},
	"ID": {en: "Indonesia", fa: "اندونزی"},
	"IQ": {en: "Iraq", fa: "عراق"},
	"IE": {en: "Ireland", fa: "ایرلند"},
	"IL": {en: "Israel", fa: "اسرائیل"},
	"JO": {en: "Jordan", fa: "اردن"},
	"KZ": {en: "Kazakhstan", fa: "قزاقستان"},
	"KW": {en: "Kuwait", fa: "کویت"},
	"LB": {en: "Lebanon", fa: "لبنان"},
	"LU": {en: "Luxembourg", fa: "لوکزامبورگ"},
	"MY": {en: "Malaysia", fa: "مالزی"},
	"MX": {en: "Mexico", fa: "مکزیک"},
	"NZ": {en: "New Zealand", fa: "نیوزیلند"},
	"OM": {en: "Oman", fa: "عمان"},
	"PK": {en: "Pakistan", fa: "پاکستان"},
	"PL": {en: "Poland", fa: "لهستان"},
	"PT": {en: "Portugal", fa: "پرتغال"},
	"QA": {en: "Qatar", fa: "قطر"},
	"RO": {en: "Romania", fa: "رومانی"},
	"SA": {en: "Saudi Arabia", fa: "عربستان سعودی"},
	"RS": {en: "Serbia", fa: "صربستان"},
	"SK": {en: "Slovakia", fa: "اسلواکی"},
	"SI": {en: "Slovenia", fa: "اسلوونی"},
	"ZA": {en: "South Africa", fa: "آفریقای جنوبی"},
	"KR": {en: "South Korea", fa: "کره جنوبی"},
	"SY": {en: "Syria", fa: "سوریه"},
	"TW": {en: "Taiwan", fa: "تایوان"},
	"TH": {en: "Thailand", fa: "تایلند"},
	"UA": {en: "Ukraine", fa: "اوکراین"},
	"VN": {en: "Vietnam", fa: "ویتنام"},
	"YE": {en: "Yemen", fa: "یمن"},
	"UZ": {en: "Uzbekistan", fa: "ازبکستان"},
	"TM": {en: "Turkmenistan", fa: "ترکمنستان"},
	"TJ": {en: "Tajikistan", fa: "تاجیکستان"},
	"KG": {en: "Kyrgyzstan", fa: "قرقیزستان"},
	"MD": {en: "Moldova", fa: "مولداوی"},
	"LT": {en: "Lithuania", fa: "لیتوانی"},
	"LV": {en: "Latvia", fa: "لتونی"},
	"MT": {en: "Malta", fa: "مالت"},
	"MC": {en: "Monaco", fa: "موناکو"},
	"ME": {en: "Montenegro", fa: "مونته‌نگرو"},
	"MK": {en: "North Macedonia", fa: "مقدونیه شمالی"},
	"MA": {en: "Morocco", fa: "مراکش"},
	"TN": {en: "Tunisia", fa: "تونس"},
	"LY": {en: "Libya", fa: "لیبی"},
	"SD": {en: "Sudan", fa: "سودان"},
	"KE": {en: "Kenya", fa: "کنیا"},
	"NG": {en: "Nigeria", fa: "نیجریه"},
	"GH": {en: "Ghana", fa: "غنا"},
	"ET": {en: "Ethiopia", fa: "اتیوپی"},
	"PH": {en: "Philippines", fa: "فیلیپین"},
	"PE": {en: "Peru", fa: "پرو"},
	"VE": {en: "Venezuela", fa: "ونزوئلا"},
	"EC": {en: "Ecuador", fa: "اکوادور"},
	"UY": {en: "Uruguay", fa: "اروگوئه"},
	"PY": {en: "Paraguay", fa: "پاراگوئه"},
	"CU": {en: "Cuba", fa: "کوبا"},
	"PA": {en: "Panama", fa: "پاناما"},
	"CR": {en: "Costa Rica", fa: "کاستاریکا"},
	"DO": {en: "Dominican Republic", fa: "جمهوری دومینیکن"},
	"PR": {en: "Puerto Rico", fa: "پورتوریکو"},
	"KH": {en: "Cambodia", fa: "کامبوج"},
	"LA": {en: "Laos", fa: "لائوس"},
	"LK": {en: "Sri Lanka", fa: "سری‌لانکا"},
	"NP": {en: "Nepal", fa: "نپال"},
	"MM": {en: "Myanmar", fa: "میانمار"},
	"MN": {en: "Mongolia", fa: "مغولستان"},
	"MO": {en: "Macau", fa: "ماکائو"},
	"PS": {en: "Palestine", fa: "فلسطین"},
}

func normalizeCountryLookupKey(s string) string {
	r := strings.NewReplacer(
		"ي", "ی",
		"ك", "ک",
		"\u200c", " ",
		"-", " ",
		"_", " ",
	)
	clean := r.Replace(strings.ToLower(strings.TrimSpace(s)))
	return strings.Join(strings.Fields(clean), " ")
}

func localizedCountryDisplay(isoCode, rawInput string, preferPersian bool) string {
	if entry, ok := isoCountryDictionary[isoCode]; ok {
		if preferPersian && entry.fa != "" {
			return entry.fa
		}
		if !preferPersian && entry.en != "" {
			return entry.en
		}
	}
	if strings.TrimSpace(rawInput) != "" {
		return strings.TrimSpace(rawInput)
	}
	return isoCode
}

// resolveCountryInput resolves an ISO 3166-1 alpha-2 code or English/Persian
// country name from isoCountryDictionary into (isoAlpha2Code, displayCountryName).
func resolveCountryInput(raw string, preferPersian bool) (string, string) {
	val := strings.TrimSpace(raw)
	if val == "" {
		return "IR", localizedCountryDisplay("IR", "", preferPersian)
	}

	norm := normalizeCountryLookupKey(val)

	// 1. Exact English or Persian name match in isoCountryDictionary
	for iso, entry := range isoCountryDictionary {
		if normalizeCountryLookupKey(entry.en) == norm || normalizeCountryLookupKey(entry.fa) == norm {
			return iso, localizedCountryDisplay(iso, val, preferPersian)
		}
	}

	// 2. Check 2-letter ISO 3166-1 alpha-2 code
	upper := strings.ToUpper(val)
	if len(upper) == 2 && upper[0] >= 'A' && upper[0] <= 'Z' && upper[1] >= 'A' && upper[1] <= 'Z' {
		return upper, localizedCountryDisplay(upper, val, preferPersian)
	}

	// 3. Partial/substring match in isoCountryDictionary (e.g. "آمریکا" -> "ایالات متحده آمریکا", "امارات" -> "امارات متحده عربی", "Russia" -> "Russian Federation")
	for iso, entry := range isoCountryDictionary {
		enNorm := normalizeCountryLookupKey(entry.en)
		faNorm := normalizeCountryLookupKey(entry.fa)
		if len(norm) >= 2 && (strings.Contains(enNorm, norm) || strings.Contains(faNorm, norm) || strings.Contains(norm, faNorm)) {
			return iso, localizedCountryDisplay(iso, val, preferPersian)
		}
	}

	return upper, val
}

// resolveFormatInput maps a format ID or Persian/English display name to (formatID, displayFormat).
func resolveFormatInput(raw string) (string, string) {
	val := strings.TrimSpace(raw)
	if val == "" {
		return "mikrotik", "mikrotik"
	}
	lower := strings.ToLower(val)
	formatAliases := map[string]string{
		"میکروتیک":   "mikrotik",
		"mikrotik":   "mikrotik",
		"routeros":   "mikrotik",
		"سیسکو":      "cisco",
		"cisco":      "cisco",
		"لینوکس":     "ipset",
		"ipset":      "ipset",
		"iptables":   "ipset",
		"فورتی‌گیت":  "fortigate",
		"فورتی گیت":  "fortigate",
		"فورتیگیت":   "fortigate",
		"fortigate":  "fortigate",
		"pf":         "freebsd-pf",
		"freebsd-pf": "freebsd-pf",
		"freebsd":    "freebsd-pf",
		"آپاچی":      "htaccess",
		"htaccess":   "htaccess",
		".htaccess":  "htaccess",
		"apache":     "htaccess",
		"json":       "json",
		"جیسون":      "json",
	}
	if id, ok := formatAliases[lower]; ok {
		return id, val
	}
	return lower, val
}

func (h *Handler) registerMCPPrompts(server *mcp.Server) {
	// Prompt 1: لیست IP {country} برای {format} (Parameterized Persian Country IP & Firewall Prompt)
	server.AddPrompt(&mcp.Prompt{
		Name:        "country_ip_list_fa",
		Title:       "لیست IP {country} برای {format}",
		Description: "دریافت لیست IP {country} برای {format} به همراه آمار کامل رنج‌های IPv4/IPv6، قوانین فایروال، لینک دانلود مستقیم و دستورات پیاده‌سازی در روتر یا سرور.",
		Arguments: []*mcp.PromptArgument{
			{
				Name:        "country",
				Title:       "کشور یا کد کشور (Country)",
				Description: "نام کشور یا کد دوحرفی ISO (مثلاً ایران، آلمان، ترکیه، IR، DE، US)",
				Required:    true,
			},
			{
				Name:        "format",
				Title:       "فرمت یا فایروال (Format)",
				Description: "نام فایروال یا فرمت خروجی (مثلاً میکروتیک، سیسکو، لینوکس ipset، فورتی‌گیت، mikrotik، cisco، ipset، fortigate، freebsd-pf، htaccess، json)",
				Required:    true,
			},
			{
				Name:        "version",
				Title:       "نسخه آی‌پی (IP Version)",
				Description: "فیلتر نسخه آی‌پی: any، ipv4 یا ipv6 (پیش‌فرض: any)",
				Required:    false,
			},
			{
				Name:        "access",
				Title:       "سیاست دسترسی (Access Policy)",
				Description: "نوع قانون فایروال: allow (مجاز) یا deny (مسدود) - پیش‌فرض: allow",
				Required:    false,
			},
			{
				Name:        "list_name",
				Title:       "نام لیست (List Name)",
				Description: "نام دلخواه برای Address List یا ACL (اختیاری - پیش‌فرض: کد کشور)",
				Required:    false,
			},
			{
				Name:        "use_case",
				Title:       "سناریوی کاربرد (Use Case)",
				Description: "سناریوی عملیاتی: split-tunneling (تفکیک ترافیک)، firewall-allow (محدودسازی دسترسی فقط به این کشور)، یا firewall-block (مسدودسازی ترافیک کشور)",
				Required:    false,
			},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		rawCountry := req.Params.Arguments["country"]
		if strings.TrimSpace(rawCountry) == "" {
			rawCountry = req.Params.Arguments["country_code"]
		}
		isoCode, countryDisplay := resolveCountryInput(rawCountry, true)

		rawFormat := req.Params.Arguments["format"]
		if strings.TrimSpace(rawFormat) == "" {
			rawFormat = req.Params.Arguments["platform"]
		}
		formatID, formatDisplay := resolveFormatInput(rawFormat)

		version := strings.ToLower(strings.TrimSpace(req.Params.Arguments["version"]))
		if version != "ipv4" && version != "ipv6" && version != "any" {
			version = "any"
		}
		access := strings.ToLower(strings.TrimSpace(req.Params.Arguments["access"]))
		if access != "deny" {
			access = "allow"
		}
		listName := strings.TrimSpace(req.Params.Arguments["list_name"])
		if listName == "" {
			listName = isoCode
		}
		useCase := strings.ToLower(strings.TrimSpace(req.Params.Arguments["use_case"]))
		if useCase == "" {
			useCase = "firewall-and-routing"
		}

		promptText := fmt.Sprintf(
			"درخواست: **لیست IP %s برای %s**\n\n"+
				"لطفاً با استفاده از ابزار `country_resources` (`code: %q`, `format: %q`, `version: %q`, `access: %q`, `listName: %q`)، لیست IP %s برای %s را دریافت کن و یک راهنمای کامل و کاربردی به زبان فارسی ارائه بده:\n\n"+
				"1. **آمار کامل رنج‌های آی‌پی %s (`%s`)**: تعداد کل بلاک‌های CIDR در IPv4 و IPv6، تعداد ASNهای فعال، و ظرفیت تخمینی تعداد آدرس‌های IPv4.\n"+
				"2. **قوانین تولیدشده برای %s (`%s`)**: نمایش بخشی از خروجی تولیدشده با نام لیست `%s` به همراه تعداد کل قوانین.\n"+
				"3. **لینک دانلود مستقیم و ایمپورت خودکار در %s**:\n"+
				"   - لینک دانلود مستقیم: `https://ip-hub.ir/dl?country=%s&format=%s&version=%s&access=%s&listName=%s`\n"+
				"   - دستورات CLI جهت دانلود و بارگذاری مستقیم فایل در `%s`.\n"+
				"4. **پیاده‌سازی سناریوی `%s` در %s**:\n"+
				"   - دستورات عملیاتی برای استفاده از لیست `%s` جهت تفکیک ترافیک (Split Tunneling / PBR)، محدودسازی دسترسی (Whitelist) یا مسدودسازی (Blacklist).\n"+
				"5. **بروزرسانی خودکار**: نحوه تنظیم اسکریپت زمان‌بندی‌شده (Scheduler / Cronjob) برای آپدیت دوره‌ای لیست IP %s برای %s.",
			countryDisplay, formatDisplay,
			isoCode, formatID, version, access, listName, countryDisplay, formatDisplay,
			countryDisplay, isoCode,
			formatDisplay, formatID, listName,
			formatDisplay,
			isoCode, formatID, version, access, listName, formatDisplay,
			useCase, formatDisplay, listName,
			countryDisplay, formatDisplay,
		)

		return &mcp.GetPromptResult{
			Description: fmt.Sprintf("لیست IP %s برای %s (%s)", countryDisplay, formatDisplay, isoCode),
			Messages: []*mcp.PromptMessage{
				{
					Role: "user",
					Content: &mcp.TextContent{
						Text: promptText,
					},
				},
			},
		}, nil
	})

	// Prompt 2: {country} IP List for {format} (Parameterized English & Bilingual Country Firewall Prompt)
	server.AddPrompt(&mcp.Prompt{
		Name:        "generate_country_firewall_config",
		Title:       "{country} IP List for {format} (Country Firewall Policy Generator)",
		Description: "Generates {country} IP list and firewall configuration rules for {format} (mikrotik, cisco, freebsd-pf, ipset, fortigate, htaccess, json) in English or Persian.",
		Arguments: []*mcp.PromptArgument{
			{
				Name:        "country",
				Title:       "Country or ISO Code",
				Description: "Country name or two-letter ISO 3166-1 alpha-2 code (e.g. IR, DE, US, GB, NL)",
				Required:    true,
			},
			{
				Name:        "format",
				Title:       "Firewall Format",
				Description: "Target firewall or export format (mikrotik, cisco, freebsd-pf, ipset, fortigate, htaccess, json)",
				Required:    true,
			},
			{
				Name:        "policy",
				Title:       "Access Policy",
				Description: "Traffic policy: allow or deny (default: allow)",
				Required:    false,
			},
			{
				Name:        "version",
				Title:       "IP Version",
				Description: "IP version filter: any, ipv4, or ipv6 (default: any)",
				Required:    false,
			},
			{
				Name:        "list_name",
				Title:       "List / ACL Name",
				Description: "Optional custom address list or ACL name (defaults to country code)",
				Required:    false,
			},
			{
				Name:        "lang",
				Title:       "Response Language",
				Description: "Output language: en (English) or fa (Persian/فارسی)",
				Required:    false,
			},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		lang := req.Params.Arguments["lang"]
		preferFa := isPersianLang(lang)

		rawCountry := req.Params.Arguments["country"]
		if strings.TrimSpace(rawCountry) == "" {
			rawCountry = req.Params.Arguments["country_code"]
		}
		isoCode, countryDisplay := resolveCountryInput(rawCountry, preferFa)

		rawFormat := req.Params.Arguments["format"]
		if strings.TrimSpace(rawFormat) == "" {
			rawFormat = req.Params.Arguments["platform"]
		}
		formatID, formatDisplay := resolveFormatInput(rawFormat)

		policy := strings.ToLower(strings.TrimSpace(req.Params.Arguments["policy"]))
		if policy == "" {
			policy = strings.ToLower(strings.TrimSpace(req.Params.Arguments["access"]))
		}
		if policy != "deny" {
			policy = "allow"
		}
		version := strings.ToLower(strings.TrimSpace(req.Params.Arguments["version"]))
		if version != "ipv4" && version != "ipv6" && version != "any" {
			version = "any"
		}
		listName := strings.TrimSpace(req.Params.Arguments["list_name"])
		if listName == "" {
			listName = isoCode
		}

		var promptText string
		if isPersianLang(lang) {
			promptText = fmt.Sprintf(
				"درخواست: **لیست IP %s برای %s**\n\n"+
					"از ابزار `country_resources` برای دریافت لیست IP %s (`code: %q`) با فرمت `%s`، نسخه `%s`، سیاست `%s` و نام لیست `%s` استفاده کن و به زبان فارسی ارائه بده:\n\n"+
					"1. **خلاصه تخصیص آی‌پی %s (`%s`)**: تعداد بلاک‌های IPv4، پیشوندهای IPv6، تعداد ASNها و ظرفیت کل آدرس‌های IPv4.\n"+
					"2. **قوانین فایروال %s (`%s`)**: نمونه‌ای از قوانین تولیدشده و تعداد کل رکوردها.\n"+
					"3. **دستورات نصب و اتوماسیون**: دستورات CLI برای دانلود و اعمال مستقیم از `https://ip-hub.ir/dl?country=%s&format=%s&version=%s&access=%s&listName=%s`.",
				countryDisplay, formatDisplay,
				countryDisplay, isoCode, formatID, version, policy, listName,
				countryDisplay, isoCode,
				formatDisplay, formatID,
				isoCode, formatID, version, policy, listName,
			)
		} else {
			promptText = fmt.Sprintf(
				"Request: **%s IP list for %s**\n\n"+
					"Use the `country_resources` tool (`code: %q`, `format: %q`, `version: %q`, `access: %q`, `listName: %q`) to retrieve the IP allocations and formatted firewall rules for `%s` on `%s`.\n\n"+
					"Please provide:\n"+
					"1. **Allocation Summary**: Total delegated IPv4 CIDR blocks, IPv6 prefixes, Origin ASNs, and estimated IPv4 host capacity for `%s` (`%s`).\n"+
					"2. **Firewall Configuration**: A sample of the generated `%s` rules (list name `%s`) and the total rule count.\n"+
					"3. **Automated Deployment Commands**: CLI commands to fetch and apply the rules directly from `https://ip-hub.ir/dl?country=%s&format=%s&version=%s&access=%s&listName=%s`.",
				countryDisplay, formatDisplay,
				isoCode, formatID, version, policy, listName, countryDisplay, formatDisplay,
				countryDisplay, isoCode,
				formatDisplay, listName,
				isoCode, formatID, version, policy, listName,
			)
		}

		return &mcp.GetPromptResult{
			Description: fmt.Sprintf("%s IP list for %s (%s)", countryDisplay, formatDisplay, policy),
			Messages: []*mcp.PromptMessage{
				{
					Role: "user",
					Content: &mcp.TextContent{
						Text: promptText,
					},
				},
			},
		}, nil
	})

	// Prompt 3: Investigate Network Resource (English & Persian)
	server.AddPrompt(&mcp.Prompt{
		Name:        "investigate_network_resource",
		Title:       "Investigate IP, ASN, or CIDR Resource (بررسی WHOIS و مسیریابی BGP برای {target})",
		Description: "Generates a structured network intelligence and security audit prompt for inspecting an IPv4/IPv6 address, ASN, or CIDR prefix in English or Persian.",
		Arguments: []*mcp.PromptArgument{
			{
				Name:        "target",
				Title:       "Target Resource (آدرس IP، ASN یا CIDR)",
				Description: "IP address (e.g. 193.0.6.139), ASN (e.g. AS3333), or CIDR block (e.g. 193.0.0.0/21)",
				Required:    true,
			},
			{
				Name:        "lang",
				Title:       "Language (زبان پاسخ)",
				Description: "Output language: en (English) or fa (Persian/فارسی)",
				Required:    false,
			},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		target := strings.TrimSpace(req.Params.Arguments["target"])
		if target == "" {
			target = "193.0.6.139"
		}
		lang := req.Params.Arguments["lang"]

		var promptText string
		if isPersianLang(lang) {
			promptText = fmt.Sprintf(
				"لطفاً با استفاده از ابزار `whois_lookup` (و در صورت نیاز `subnet_calculator`)، یک بررسی کامل اطلاعات شبکه و امنیت برای منبع `%s` انجام بده و گزارش را به زبان فارسی در بخش‌های زیر ارائه کن:\n\n"+
					"1. **مالکیت و ثبت در RIPE**: نام شبکه (Netname)، سازمان یا دیتاسنتر مالک، کشور، وضعیت ثبت و Maintainerها.\n"+
					"2. **وضعیت مسیریابی BGP**: شماره سیستم مستقل مبدأ (Origin ASN)، پیشوند اعلان‌شده (Announced Prefix)، درصد دیده‌شدن در پیرهای RIS و وضعیت Announcement.\n"+
					"3. **اطلاعات تماس و گزارش تخلف (Abuse)**: ایمیل Abuse، هندل‌های IRT/NIC و مسئولین فنی و اداری.\n"+
					"4. **تحلیل ساب‌نت و موقعیت جغرافیایی**: محدوده CIDR، ظرفیت آدرس‌دهی، Reverse DNS (رکورد PTR) و موقعیت جغرافیایی.",
				target,
			)
		} else {
			promptText = fmt.Sprintf(
				"Please perform a comprehensive network intelligence and security audit for the resource %q using the `whois_lookup` tool (and `subnet_calculator` if it is an IP or CIDR block).\n\n"+
					"Include the following in your report:\n"+
					"1. **Ownership & Registration**: Netname, organization/holder, country, registration status, and maintainers.\n"+
					"2. **BGP Routing & Visibility**: Origin ASN, announced prefix, RIS peer visibility, and routing status.\n"+
					"3. **Abuse & Contacts**: Abuse contact email, IRT/NIC handles, and administrative/technical contacts.\n"+
					"4. **Subnet & Addressing Breakdown**: CIDR prefix boundaries, total host capacity, and reverse DNS if applicable.",
				target,
			)
		}

		return &mcp.GetPromptResult{
			Description: fmt.Sprintf("Network intelligence investigation for %s", target),
			Messages: []*mcp.PromptMessage{
				{
					Role: "user",
					Content: &mcp.TextContent{
						Text: promptText,
					},
				},
			},
		}, nil
	})

	// Prompt 4: Batch IP Security & Log Triage (English & Persian)
	server.AddPrompt(&mcp.Prompt{
		Name:        "batch_ip_security_triage",
		Title:       "Batch IP Log & Threat Triage (بررسی گروهی آدرس‌های IP و لاگ امنیتی)",
		Description: "Inspects multiple suspicious IP addresses from server or firewall logs in parallel using whois_batch, grouping them by country, ASN, and ISP.",
		Arguments: []*mcp.PromptArgument{
			{
				Name:        "ips",
				Title:       "IP Address List (لیست آدرس‌های IP)",
				Description: "Comma- or space-separated list of IPv4/IPv6 addresses (up to 50 IPs) extracted from logs",
				Required:    true,
			},
			{
				Name:        "format",
				Title:       "Firewall Format (فرمت فایروال جهت مسدودسازی)",
				Description: "Optional target firewall format for blocking rules (e.g. mikrotik, ipset, cisco, freebsd-pf, fortigate, htaccess)",
				Required:    false,
			},
			{
				Name:        "lang",
				Title:       "Language (زبان پاسخ)",
				Description: "Output language: en (English) or fa (Persian/فارسی)",
				Required:    false,
			},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		ips := strings.TrimSpace(req.Params.Arguments["ips"])
		if ips == "" {
			ips = "8.8.8.8, 1.1.1.1, 193.0.6.139"
		}
		_, formatDisplay := resolveFormatInput(req.Params.Arguments["format"])
		lang := req.Params.Arguments["lang"]

		var promptText string
		if isPersianLang(lang) {
			promptText = fmt.Sprintf(
				"لیست آدرس‌های IP زیر از لاگ فایروال یا سرور استخراج شده‌اند:\n`%s`\n\n"+
					"لطفاً با استفاده از ابزار `whois_batch` تمام این آی‌پی‌ها را به‌صورت هم‌زمان بررسی کن و گزارش تحلیلی زیر را به زبان فارسی ارائه بده:\n"+
					"1. **جدول خلاصه آی‌پی‌ها**: شامل آدرس IP، کشور، شماره ASN، نام سرویس‌دهنده/دیتاسنتر (Netname/AS Name)، محدوده شبکه و ایمیل گزارش تخلف (Abuse).\n"+
					"2. **خوشه‌بندی بر اساس کشور و ASN**: مشخص کن کدام آی‌پی‌ها متعلق به یک دیتاسنتر، ISP یا کشور مشترک هستند.\n"+
					"3. **پیشنهاد قوانین فایروال برای %s**: در صورت مشاهده ترافیک مشکوک از یک رنج یا کشور خاص، دستورات مسدودسازی در `%s` را پیشنهاد بده.",
				ips, formatDisplay, formatDisplay,
			)
		} else {
			promptText = fmt.Sprintf(
				"The following IP addresses were extracted from server or firewall logs:\n`%s`\n\n"+
					"Please inspect all of them in parallel using the `whois_batch` tool and provide a structured security triage report:\n"+
					"1. **Summary Table**: IP address, Country, Origin ASN, Organization/Netname, IP Range, and Abuse Contact Email.\n"+
					"2. **ASN & Geo Clustering**: Identify clusters of IPs originating from the same ASN, hosting provider, or country.\n"+
					"3. **Mitigation & Blocking Recommendations (%s)**: Suggest CIDR-level or country-level firewall rules for `%s` if coordinated malicious activity is indicated.",
				ips, formatDisplay, formatDisplay,
			)
		}

		return &mcp.GetPromptResult{
			Description: "Batch IP WHOIS security and log triage analysis",
			Messages: []*mcp.PromptMessage{
				{
					Role: "user",
					Content: &mcp.TextContent{
						Text: promptText,
					},
				},
			},
		}, nil
	})

	// Prompt 5: ASN & BGP Prefix Portfolio Analysis (English & Persian)
	server.AddPrompt(&mcp.Prompt{
		Name:        "asn_bgp_peering_analysis",
		Title:       "ASN & BGP Prefix Portfolio Analysis (تحلیل شبکه و پیشوندهای BGP برای {asn})",
		Description: "Audits an Autonomous System Number (ASN) to inspect its holder, announced IPv4/IPv6 prefixes, BGP routing status, and abuse contacts.",
		Arguments: []*mcp.PromptArgument{
			{
				Name:        "asn",
				Title:       "Autonomous System Number (شماره ASN)",
				Description: "ASN identifier (e.g. AS12880, AS58224, AS3333, or 15169)",
				Required:    true,
			},
			{
				Name:        "format",
				Title:       "Firewall Format (فرمت فایروال)",
				Description: "Optional target firewall format for prefix filtering (mikrotik, cisco, ipset, freebsd-pf, fortigate)",
				Required:    false,
			},
			{
				Name:        "lang",
				Title:       "Language (زبان پاسخ)",
				Description: "Output language: en (English) or fa (Persian/فارسی)",
				Required:    false,
			},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		asn := strings.TrimSpace(req.Params.Arguments["asn"])
		if asn == "" {
			asn = "AS3333"
		}
		_, formatDisplay := resolveFormatInput(req.Params.Arguments["format"])
		lang := req.Params.Arguments["lang"]

		var promptText string
		if isPersianLang(lang) {
			promptText = fmt.Sprintf(
				"لطفاً با استفاده از ابزار `whois_lookup`، اطلاعات کامل سیستم مستقل (ASN) به شماره `%s` را استخراج کن و به زبان فارسی تحلیل زیر را ارائه بده:\n\n"+
					"1. **مشخصات سازمان مالک (Holder)**: نام سازمان، کشور ثبت‌شده، توضیحات و وضعیت کلی اعلان در BGP.\n"+
					"2. **پیشوندهای اعلان‌شده (Announced Prefixes)**: تعداد کل رنج‌های IP (IPv4 و IPv6) که توسط `%s` در جداول BGP اعلان می‌شوند به‌همراه فهرست مهم‌ترین بلاک‌های CIDR.\n"+
					"3. **کاربرد در %s و مسیریابی**: نحوه استفاده از پیشوندهای این ASN در `%s` یا BGP فیلترینگ و اطلاعات تماس Abuse.",
				asn, asn, formatDisplay, formatDisplay,
			)
		} else {
			promptText = fmt.Sprintf(
				"Please use the `whois_lookup` tool to inspect Autonomous System `%s` and provide a comprehensive BGP & prefix portfolio analysis:\n\n"+
					"1. **ASN Holder & Metadata**: Organization name, country of registration, description, and active BGP announcement status.\n"+
					"2. **Announced Prefix Breakdown**: Total count and summary of announced IPv4 and IPv6 CIDR blocks originated by `%s`.\n"+
					"3. **Operational & Abuse Details (%s)**: Abuse contact details and guidance on filtering or routing traffic for this ASN on `%s`.",
				asn, asn, formatDisplay, formatDisplay,
			)
		}

		return &mcp.GetPromptResult{
			Description: fmt.Sprintf("ASN and BGP prefix analysis for %s", asn),
			Messages: []*mcp.PromptMessage{
				{
					Role: "user",
					Content: &mcp.TextContent{
						Text: promptText,
					},
				},
			},
		}, nil
	})

	// Prompt 6: Subnet Planning Assistant (English & Persian)
	server.AddPrompt(&mcp.Prompt{
		Name:        "subnet_planning_assistant",
		Title:       "CIDR Subnet Planning Assistant (محاسبه ساب‌نت و CIDR برای {cidr})",
		Description: "Analyzes a CIDR block and provides subnetting breakdown, usable host ranges, netmask, and ACL wildcard masks in English or Persian.",
		Arguments: []*mcp.PromptArgument{
			{
				Name:        "cidr",
				Title:       "CIDR Block (رنج CIDR یا آدرس IP)",
				Description: "IPv4 or IPv6 CIDR block to analyze (e.g. 10.20.0.0/16 or 2001:db8::/48)",
				Required:    true,
			},
			{
				Name:        "lang",
				Title:       "Language (زبان پاسخ)",
				Description: "Output language: en (English) or fa (Persian/فارسی)",
				Required:    false,
			},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		cidr := strings.TrimSpace(req.Params.Arguments["cidr"])
		if cidr == "" {
			cidr = "192.168.1.0/24"
		}
		lang := req.Params.Arguments["lang"]

		var promptText string
		if isPersianLang(lang) {
			promptText = fmt.Sprintf(
				"لطفاً با فراخوانی ابزار `subnet_calculator` برای `%s`، محاسبات دقیق مهندسی شبکه و ساب‌نتینگ را به زبان فارسی ارائه بده:\n"+
					"- آدرس شبکه (Network Address) و آدرس برادکست (Broadcast Address)\n"+
					"- ساب‌نت مسک (Netmask) و وایلدکارد مسک سیسکو (Wildcard Mask)\n"+
					"- اولین و آخرین آدرس IP قابل استفاده برای هاست‌ها (Usable Host Range)\n"+
					"- تعداد کل آی‌پی‌ها و تعداد هاست‌های قابل استفاده\n"+
					"- نحوه تعریف این ساب‌نت در فایروال و روتر.",
				cidr,
			)
		} else {
			promptText = fmt.Sprintf(
				"Call the `subnet_calculator` tool for `%s` and present a clear network engineering breakdown including:\n"+
					"- Network and Broadcast addresses\n"+
					"- Netmask and Cisco Wildcard Mask\n"+
					"- First and Last usable host IP addresses\n"+
					"- Total and usable host capacity\n"+
					"- Recommendations for partitioning or firewall ACL matching.",
				cidr,
			)
		}

		return &mcp.GetPromptResult{
			Description: fmt.Sprintf("CIDR subnet analysis for %s", cidr),
			Messages: []*mcp.PromptMessage{
				{
					Role: "user",
					Content: &mcp.TextContent{
						Text: promptText,
					},
				},
			},
		}, nil
	})

	// Prompt 7: GeoIP DDoS Mitigation & Access Control Guide (Parameterized by {country} and {format})
	server.AddPrompt(&mcp.Prompt{
		Name:        "ddos_geoip_mitigation_guide",
		Title:       "GeoIP DDoS Mitigation & Access Control (مقابله با حملات DDoS با لیست IP {country} برای {format})",
		Description: "Provides an incident response playbook for mitigating DDoS attacks using country IP whitelisting or blacklisting for {country} on {format}.",
		Arguments: []*mcp.PromptArgument{
			{
				Name:        "country",
				Title:       "Target Country (کشور هدف)",
				Description: "Country name or 2-letter ISO country code to whitelist or blacklist (e.g. IR، ایران، DE، US)",
				Required:    true,
			},
			{
				Name:        "format",
				Title:       "Firewall Format (فرمت فایروال)",
				Description: "Firewall appliance or OS: mikrotik, ipset, freebsd-pf, cisco, fortigate, or htaccess",
				Required:    true,
			},
			{
				Name:        "strategy",
				Title:       "Mitigation Strategy (استراتژی مقابله)",
				Description: "whitelist (فقط مجاز کردن ترافیک کشور هدف) or blacklist (مسدود کردن ترافیک کشور هدف)",
				Required:    false,
			},
			{
				Name:        "lang",
				Title:       "Language (زبان پاسخ)",
				Description: "Output language: en (English) or fa (Persian/فارسی)",
				Required:    false,
			},
		},
	}, func(ctx context.Context, req *mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
		lang := strings.TrimSpace(req.Params.Arguments["lang"])
		preferFa := isPersianLang(lang)

		rawCountry := req.Params.Arguments["country"]
		if strings.TrimSpace(rawCountry) == "" {
			rawCountry = req.Params.Arguments["country_code"]
		}
		isoCode, countryDisplay := resolveCountryInput(rawCountry, preferFa)

		rawFormat := req.Params.Arguments["format"]
		if strings.TrimSpace(rawFormat) == "" {
			rawFormat = req.Params.Arguments["platform"]
		}
		formatID, formatDisplay := resolveFormatInput(rawFormat)

		strategy := strings.ToLower(strings.TrimSpace(req.Params.Arguments["strategy"]))
		if strategy != "blacklist" {
			strategy = "whitelist"
		}
		accessPolicy := "allow"
		if strategy == "blacklist" {
			accessPolicy = "deny"
		}

		var promptText string
		if isPersianLang(lang) {
			promptText = fmt.Sprintf(
				"برای مقابله با حملات DDoS و مدیریت ترافیک ورودی با استفاده از **لیست IP %s برای %s**، ابزار `country_resources` را برای کشور `%s` با فرمت `%s` و سیاست `%s` فراخوانی کن و یک راهنمای عملیاتی به زبان فارسی بنویس:\n\n"+
					"1. **دریافت لیست IP %s برای %s**: نمایش آمار رنج‌های IPv4/IPv6 و لینک دانلود مستقیم (`https://ip-hub.ir/dl?country=%s&format=%s&access=%s`).\n"+
					"2. **پیاده‌سازی استراتژی `%s` در %s**:\n"+
					"   - اگر `whitelist` است: دستورات دقیق مجاز کردن ترافیک `%s`، حفظ ارتباطات Established/Related و Drop کردن سایر ترافیک‌ها در `%s`.\n"+
					"   - اگر `blacklist` است: دستورات مسدودسازی سریع ترافیک ورودی از `%s` با کمترین مصرف منابع در `%s`.\n"+
					"3. **نکات جلوگیری از قطع دسترسی مدیر شبکه (Lockout Prevention)**: توصیه‌های امنیتی قبل از فعال‌سازی قوانین فایروال.",
				countryDisplay, formatDisplay, isoCode, formatID, accessPolicy,
				countryDisplay, formatDisplay, isoCode, formatID, accessPolicy,
				strategy, formatDisplay,
				countryDisplay, formatDisplay,
				countryDisplay, formatDisplay,
			)
		} else {
			promptText = fmt.Sprintf(
				"To mitigate DDoS traffic and enforce GeoIP access control using the **%s IP list for %s**, call `country_resources` for country `%s` with format `%s` and access policy `%s`, then provide a step-by-step incident response guide:\n\n"+
					"1. **Country Prefix Inventory (%s)**: Summary of delegated IPv4/IPv6 CIDR blocks and direct download URL (`https://ip-hub.ir/dl?country=%s&format=%s&access=%s`).\n"+
					"2. **Applying the `%s` Strategy on `%s`**:\n"+
					"   - For `whitelist`: Commands to allow traffic from `%s` and established sessions while dropping unsolicited flood traffic.\n"+
					"   - For `blacklist`: High-performance rules to drop traffic originating from `%s` with minimal CPU overhead.\n"+
					"3. **Lockout Prevention Checklist**: Safeguards to ensure administrative access is not interrupted.",
				countryDisplay, formatDisplay, isoCode, formatID, accessPolicy,
				countryDisplay, isoCode, formatID, accessPolicy,
				strategy, formatDisplay, countryDisplay, countryDisplay,
			)
		}

		return &mcp.GetPromptResult{
			Description: fmt.Sprintf("GeoIP DDoS mitigation (%s) for %s on %s", strategy, countryDisplay, formatDisplay),
			Messages: []*mcp.PromptMessage{
				{
					Role: "user",
					Content: &mcp.TextContent{
						Text: promptText,
					},
				},
			},
		}, nil
	})
}

// SetupMCP mounts the MCP Streamable HTTP transport handler onto the Fiber app at /mcp.
// Direct browser navigation (GET/HEAD without Mcp-Session-Id and not requesting text/event-stream)
// is passed through to the SPA and Markdown negotiation middleware so /mcp also serves the web guide.
func (h *Handler) SetupMCP(app *fiber.App) *mcp.Server {
	mcpServer := h.NewMCPServer()
	httpHandler := mcp.NewStreamableHTTPHandler(func(r *http.Request) *mcp.Server {
		return mcpServer
	}, &mcp.StreamableHTTPOptions{
		SessionTimeout:             10 * time.Minute,
		DisableLocalhostProtection: true,
	})
	mcpAdapter := adaptor.HTTPHandler(httpHandler)

	app.All("/mcp", func(c fiber.Ctx) error {
		method := c.Method()
		if (method == fiber.MethodGet || method == fiber.MethodHead) &&
			c.Get("Mcp-Session-Id") == "" &&
			!strings.Contains(strings.ToLower(c.Get("Accept")), "text/event-stream") {
			return c.Next()
		}
		return mcpAdapter(c)
	})
	return mcpServer
}
