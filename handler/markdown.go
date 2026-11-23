package handler

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/kzeedev/IP-Hub/config"
)

// ContentSignalHeaderValue signals indexing and training permissions for AI agents.
const ContentSignalHeaderValue = "ai-train=yes, search=yes, ai-input=yes"

// estimateTokens estimates token count from character length.
func estimateTokens(s string) int {
	count := len(s) / 4
	if count < 1 && len(s) > 0 {
		return 1
	}
	return count
}

// isStaticAsset reports whether the path targets a static asset file.
func isStaticAsset(path string) bool {
	clean := strings.ToLower(path)
	if strings.HasPrefix(clean, "/assets/") || strings.HasPrefix(clean, "/img/") || strings.HasPrefix(clean, "/public/") {
		return true
	}
	exts := []string{
		".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg",
		".ico", ".woff", ".woff2", ".ttf", ".eot", ".map", ".json",
		".xml", ".webp", ".avif", ".wasm",
	}
	for _, ext := range exts {
		if strings.HasSuffix(clean, ext) {
			return true
		}
	}
	return false
}

// getAcceptQ extracts the q-factor for a media type from an Accept header.
func getAcceptQ(header, mediaType string) float64 {
	parts := strings.Split(header, ",")
	for _, part := range parts {
		subParts := strings.Split(part, ";")
		if len(subParts) == 0 {
			continue
		}
		itemType := strings.TrimSpace(subParts[0])
		if itemType == mediaType {
			q := 1.0
			for _, param := range subParts[1:] {
				param = strings.TrimSpace(param)
				if strings.HasPrefix(param, "q=") {
					if val, err := strconv.ParseFloat(param[2:], 64); err == nil {
						q = val
					}
				}
			}
			return q
		}
	}
	return 0.0
}

// wantsMarkdown reports whether the request prefers Markdown.
func (h *Handler) wantsMarkdown(c fiber.Ctx) bool {
	if strings.EqualFold(c.Query("format"), "markdown") || strings.EqualFold(c.Query("format"), "md") || c.Query("markdown") == "1" {
		return true
	}

	if strings.HasSuffix(strings.ToLower(c.Path()), ".md") {
		return true
	}

	accept := c.Get("Accept")
	if accept == "" {
		return false
	}

	lower := strings.ToLower(accept)
	if !strings.Contains(lower, "text/markdown") {
		return false
	}

	mdQ := getAcceptQ(lower, "text/markdown")
	if mdQ <= 0 {
		return false
	}

	if !strings.Contains(lower, "text/html") {
		return true
	}

	htmlQ := getAcceptQ(lower, "text/html")
	return mdQ >= htmlQ
}

// MarkdownNegotiationMiddleware handles content negotiation for text/markdown.
func (h *Handler) MarkdownNegotiationMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		method := c.Method()
		if method != fiber.MethodGet && method != fiber.MethodHead {
			return c.Next()
		}

		rawPath := c.Path()
		if strings.HasPrefix(rawPath, "/api/") || strings.HasPrefix(rawPath, "/openapi") || strings.HasPrefix(rawPath, "/docs") || strings.HasPrefix(rawPath, "/schemas") || strings.HasPrefix(rawPath, "/.well-known/") || isStaticAsset(rawPath) {
			return c.Next()
		}

		if rawPath == "/robots.txt" || rawPath == "/llms.txt" || rawPath == "/sitemap.xml" {
			return c.Next()
		}

		if !h.wantsMarkdown(c) {
			c.Set("Vary", "Accept")
			return c.Next()
		}

		mdContent := h.generateMarkdownForRoute(c)

		c.Set("Content-Type", "text/markdown; charset=utf-8")
		c.Set("Vary", "Accept")
		c.Set("x-markdown-tokens", strconv.Itoa(estimateTokens(mdContent)))
		c.Set("Content-Signal", ContentSignalHeaderValue)

		if method == fiber.MethodHead {
			c.Set("Content-Length", strconv.Itoa(len(mdContent)))
			return c.SendStatus(fiber.StatusOK)
		}

		return c.SendString(mdContent)
	}
}

func (h *Handler) generateMarkdownForRoute(c fiber.Ctx) string {
	rawPath := strings.TrimSpace(c.Path())
	if strings.HasSuffix(strings.ToLower(rawPath), ".md") {
		rawPath = rawPath[:len(rawPath)-3]
	}
	cleanPath := strings.Trim(rawPath, "/")

	lang := "en"
	var segments []string
	if cleanPath != "" {
		for _, s := range strings.Split(cleanPath, "/") {
			if s != "" {
				segments = append(segments, s)
			}
		}
	}

	if len(segments) > 0 && strings.EqualFold(segments[0], "fa") {
		lang = "fa"
		segments = segments[1:]
	} else if len(segments) > 0 && strings.EqualFold(segments[0], "en") {
		lang = "en"
		segments = segments[1:]
	}

	if len(segments) == 0 {
		return h.renderHomeMarkdown(lang)
	}

	first := strings.ToLower(segments[0])
	rest := ""
	if len(segments) > 1 {
		rest = strings.Join(segments[1:], "/")
	}

	switch first {
	case "country":
		if rest != "" {
			return h.renderCountryMarkdown(c, rest, lang)
		}
		return h.renderHomeMarkdown(lang)

	case "country-ips":
		return h.renderCountryListMarkdown(lang)

	case "batch-inspector":
		return h.renderBatchMarkdown(lang)

	case "subnet-calc":
		query := rest
		if query == "" {
			if qIP := c.Query("ip"); qIP != "" {
				query = qIP
				if qCIDR := c.Query("cidr"); qCIDR != "" {
					query += "/" + qCIDR
				}
			}
		}
		if query != "" {
			return h.renderSubnetCalcWithQueryMarkdown(query, lang)
		}
		return h.renderSubnetCalcGuideMarkdown(lang)

	case "source":
		return h.renderSourceMarkdown(lang)

	case "mcp":
		return h.renderMcpMarkdown(lang)

	case "issues":
		return h.renderIssuesMarkdown(lang)

	case "settings":
		return h.renderSettingsMarkdown(lang)

	case "lookup":
		query := rest
		if query == "" {
			query = c.Query("q")
		}
		if query != "" {
			return h.renderLookupMarkdown(query, lang)
		}
		return h.renderLookupGuideMarkdown(lang)

	default:
		return h.renderHomeMarkdown(lang)
	}
}

func (h *Handler) renderHomeMarkdown(lang string) string {
	if lang == "fa" {
		return `---
title: آی‌پی هاب - سامانه هوش شبکه، رصد BGP و دایرکتوری رنج IP کشورها
description: پلتفرم متن‌باز و پرسرعت هوش شبکه، استعلام زنده هویز RIPE، وضعیت روتینگ جهانی BGP، دریافت رنج‌های آی‌پی کشورها و تولید کانفیگ فایروال میکروتیک، سیسکو و لینوکس.
---

# سامانه هوش شبکه آی‌پی هاب (IP-Hub)

> آی‌پی هاب (https://ip-hub.ir/) سامانه تخصصی هوش شبکه و مسیریابی اینترنت است. این سامانه امکان دریافت آنلاین رنج‌های IPv4 و IPv6 تفویض‌شده به تمام کشورهای جهان، تولید کدهای آماده فایروال (MikroTik RouterOS، Cisco ACL، FreeBSD PF، Linux ipset/iptables، Apache .htaccess و Nginx)، استعلام بلادرنگ پایگاه داده RIPE WHOIS، تحلیل وضعیت روتینگ BGP و سامانه RIS، بررسی دسته‌ای اهداف و محاسبه‌گر پیشرفته ساب‌نت CIDR را فراهم می‌آورد.

## ابزارها و مسیرهای کلیدی

- **دایرکتوری آی‌پی کشورها**: [https://ip-hub.ir/fa/country-ips](https://ip-hub.ir/fa/country-ips) یا کد کشور مانند [https://ip-hub.ir/fa/country/IR](https://ip-hub.ir/fa/country/IR)
- **استعلام هویز و روتینگ BGP**: [https://ip-hub.ir/fa/lookup](https://ip-hub.ir/fa/lookup) (پشتیبانی از IPv4، IPv6 و شماره ASN مانند /fa/lookup/1.1.1.1 یا /fa/lookup/AS13335)
- **بررسی دسته‌ای هویز (Batch)**: [https://ip-hub.ir/fa/batch-inspector](https://ip-hub.ir/fa/batch-inspector)
- **محاسبه‌گر ساب‌نت CIDR**: [https://ip-hub.ir/fa/subnet-calc](https://ip-hub.ir/fa/subnet-calc)
- **مستندات و سورس‌کد**: [https://ip-hub.ir/fa/source](https://ip-hub.ir/fa/source)
- **گزارش خطا و بازخورد**: [https://ip-hub.ir/fa/issues](https://ip-hub.ir/fa/issues)

## مستندات وب‌سرویس (API)

تمامی قابلیت‌ها از طریق وب‌سرویس REST مبتنی بر JSON نیز در دسترس هستند:

| عملکرد | متد | اندپوینت | نمونه ورودی |
| :--- | :--- | :--- | :--- |
| استعلام آی‌پی یا ASN | POST | ` + "`/api/whois/lookup`" + ` | ` + "`{\"query\": \"1.1.1.1\"}`" + ` |
| دریافت رنج‌های یک کشور | POST | ` + "`/api/whois/country`" + ` | ` + "`{\"code\": \"IR\"}`" + ` |
| استعلام دسته‌ای (حداکثر ۵۰ هدف) | POST | ` + "`/api/whois/batch`" + ` | ` + "`{\"targets\": [\"1.1.1.1\", \"AS13335\"]}`" + ` |
| محاسبه ساب‌نت | GET | ` + "`/api/whois/subnet?ip=192.168.1.0&cidr=24`" + ` | - |
| دریافت آی‌پی کلاینت | GET | ` + "`/api/whois/myip`" + ` | - |

## پشتیبانی از نمایندگی محتوا (Markdown for Agents)

این سامانه از استاندارد ` + "`Accept: text/markdown`" + ` پشتیبانی می‌کند. هر عامل هوشمند (AI Agent) یا خزنده با ارسال این هدر می‌تواند محتوای بهینه‌سازی‌شده و عاری از کدهای اضافی فرانت‌اند دریافت نماید.

` + "```json\n" + `{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "IP-Hub",
  "url": "https://ip-hub.ir/",
  "applicationCategory": "NetworkingApplication",
  "operatingSystem": "All",
  "description": "سامانه تخصصی هوش شبکه، استعلام هویز، رصد BGP و رنج IP کشورها"
}` + "\n```"
	}

	return `---
title: IP-Hub - Autonomous System & IP Intelligence Platform
description: High-performance network intelligence platform, real-time BGP routing, live WHOIS lookup, country CIDR delegations, and edge firewall rule generator.
image: https://ip-hub.ir/assets/img/logo.webp
---

# IP-Hub Network Intelligence Platform

> IP-Hub (https://ip-hub.ir/) is a high-performance network intelligence platform and country-level IP delegation directory. It provides real-time country IPv4 & IPv6 CIDR downloads, firewall rule generators (MikroTik RouterOS, Cisco ACL, FreeBSD Packet Filter, Linux ipset, Apache .htaccess, Nginx), live RIPE WHOIS inspection, Autonomous System (ASN) BGP routing analytics, multi-target batch auditing, and CIDR subnet calculation.

## Core Navigation & Tools

- **Country IP Explorer**: [https://ip-hub.ir/country-ips](https://ip-hub.ir/country-ips) or by ISO code such as [https://ip-hub.ir/country/IR](https://ip-hub.ir/country/IR), [https://ip-hub.ir/country/DE](https://ip-hub.ir/country/DE), [https://ip-hub.ir/country/US](https://ip-hub.ir/country/US).
- **Single WHOIS & ASN Lookup**: [https://ip-hub.ir/lookup](https://ip-hub.ir/lookup) (supports IPv4, IPv6, CIDR blocks, and ASNs like ` + "`/lookup/1.1.1.1`" + ` or ` + "`/lookup/AS13335`" + `).
- **Batch WHOIS Inspector**: [https://ip-hub.ir/batch-inspector](https://ip-hub.ir/batch-inspector) (concurrent lookup of up to 50 mixed targets).
- **CIDR Subnet Calculator**: [https://ip-hub.ir/subnet-calc](https://ip-hub.ir/subnet-calc) (interactive or direct ` + "`/subnet-calc/192.168.1.0/24`" + `).
- **Source Code & Architecture**: [https://ip-hub.ir/source](https://ip-hub.ir/source).
- **Issue Tracker**: [https://ip-hub.ir/issues](https://ip-hub.ir/issues).

## REST API Reference

All features are natively accessible via JSON REST endpoints:

### 1. Single WHOIS & BGP Lookup
- **Endpoint**: ` + "`POST /api/whois/lookup`" + `
- **Payload**: ` + "`{\"query\": \"1.1.1.1\"}`" + ` or ` + "`{\"query\": \"AS13335\"}`" + `
- **Response**: Full WHOIS object, organization details, BGP routing status, and abuse contacts.

### 2. Country IP Delegations
- **Endpoint**: ` + "`POST /api/whois/country`" + `
- **Payload**: ` + "`{\"code\": \"IR\"}`" + `
- **Response**: Array of delegated IPv4 prefixes, IPv6 prefixes, registered ASNs, and estimated total address volume.

### 3. Batch Inspector
- **Endpoint**: ` + "`POST /api/whois/batch`" + `
- **Payload**: ` + "`{\"targets\": [\"1.1.1.1\", \"8.8.8.8\", \"AS13335\"]}`" + `
- **Response**: Array of structured records for each target.

### 4. Subnet Calculator
- **Endpoint**: ` + "`GET /api/whois/subnet?ip=192.168.1.0&cidr=24`" + `
- **Response**: Network address, netmask, wildcard mask, broadcast address, and usable host count.

### 5. Client IP Discovery
- **Endpoint**: ` + "`GET /api/whois/myip`" + `
- **Response**: Detected client IP address and connection details.

## Content Negotiation (Markdown for Agents)

IP-Hub fully adheres to the Cloudflare **Markdown for Agents** standard. Sending ` + "`Accept: text/markdown`" + ` returns clean, token-efficient Markdown representations of any page or resource on this platform.

` + "```json\n" + `{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "IP-Hub",
  "url": "https://ip-hub.ir/",
  "applicationCategory": "NetworkingApplication",
  "operatingSystem": "All",
  "description": "High-performance network intelligence platform, live WHOIS lookup, BGP routing, and country IP delegation directory."
}` + "\n```"
}

func (h *Handler) renderLookupMarkdown(rawQuery, lang string) string {
	query := strings.TrimSpace(rawQuery)
	if decoded, err := url.PathUnescape(query); err == nil && decoded != "" {
		query = decoded
	}

	if query == "" {
		return h.renderLookupGuideMarkdown(lang)
	}

	if h.svc.IsAsnQuery(query) {
		record, err := h.svc.LookupASN(query)
		if err != nil || record == nil {
			return fmt.Sprintf(`---
title: ASN Lookup Error - %s - IP-Hub
description: Lookup error for Autonomous System %s.
---

# ASN Lookup Error: %s

Unable to retrieve Autonomous System details: %s.

Please check that the ASN format is valid (e.g. `+"`AS13335`"+` or `+"`13335`"+`).
`, query, query, query, err)
		}

		statusStr := "Unannounced"
		if record.RoutingStatus.Announced {
			statusStr = "Globally Routed (BGP Announced)"
		}

		abuseEmail := "Not listed"
		if record.AbuseContact != nil && record.AbuseContact.Email != "" {
			abuseEmail = record.AbuseContact.Email
		}

		var prefixList strings.Builder
		count := len(record.Prefixes)
		displayLimit := min(count, 25)
		samplePrefixes := make([]string, 0, min(count, 10))
		for i := range displayLimit {
			fmt.Fprintf(&prefixList, "- `%s`\n", record.Prefixes[i])
			if i < 10 {
				samplePrefixes = append(samplePrefixes, record.Prefixes[i])
			}
		}
		if count > displayLimit {
			fmt.Fprintf(&prefixList, "- *... and %d more prefixes*\n", count-displayLimit)
		}

		datasetSchema := map[string]any{
			"@context":            "https://schema.org",
			"@type":               "Dataset",
			"@id":                 fmt.Sprintf("https://ip-hub.ir/lookup/%s#dataset", url.PathEscape(record.Asn)),
			"name":                fmt.Sprintf("%s (%s) BGP Routing & RIPE WHOIS Dataset", record.Asn, record.Holder),
			"description":         fmt.Sprintf("Original RIPE WHOIS registration and BGP routing dataset for Autonomous System %s (%s, %s) announcing %d prefixes.", record.Asn, record.Holder, record.CountryCode, record.AnnouncedPrefixesCount),
			"url":                 fmt.Sprintf("https://ip-hub.ir/lookup/%s", url.PathEscape(record.Asn)),
			"license":             "https://opensource.org/licenses/MIT",
			"isAccessibleForFree": true,
			"creator": map[string]any{
				"@type": "Organization",
				"@id":   "https://ip-hub.ir/#organization",
				"name":  "IP-Hub",
				"url":   "https://ip-hub.ir/",
			},
			"variableMeasured": []map[string]any{
				{"@type": "PropertyValue", "name": "ASN", "value": record.Asn},
				{"@type": "PropertyValue", "name": "Holder", "value": record.Holder},
				{"@type": "PropertyValue", "name": "Organization", "value": record.OrgName},
				{"@type": "PropertyValue", "name": "Country", "value": record.CountryCode},
				{"@type": "PropertyValue", "name": "BGP Status", "value": statusStr},
				{"@type": "PropertyValue", "name": "Announced Prefixes Count", "value": record.AnnouncedPrefixesCount},
				{"@type": "PropertyValue", "name": "Abuse Contact", "value": abuseEmail},
				{"@type": "PropertyValue", "name": "Sample Prefixes", "value": strings.Join(samplePrefixes, ", ")},
			},
			"distribution": []map[string]any{
				{
					"@type":          "DataDownload",
					"encodingFormat": "application/json",
					"name":           fmt.Sprintf("%s WHOIS JSON API", record.Asn),
					"contentUrl":     "https://ip-hub.ir/api/whois/lookup",
				},
			},
		}
		schemaBytes, _ := json.MarshalIndent(datasetSchema, "", "  ")

		return fmt.Sprintf(`---
title: %s (%s) - Autonomous System Routing & WHOIS - IP-Hub
description: BGP announcement state, announced prefix count, registered organization, and abuse contact for %s.
---

# Autonomous System: %s

## Overview & Routing Summary

| Property | Value |
| :--- | :--- |
| **ASN** | %s |
| **Holder Name** | %s |
| **Organization** | %s |
| **Country** | %s (%s) |
| **BGP Announcement Status** | %s |
| **Total Announced Prefixes** | %d |
| **Abuse Contact Mailbox** | %s |

## Announced BGP Prefixes (%d total)

%s

## RIPE / NIR Database Objects

`+"```text\n%s\n```"+`

`+"```json\n%s\n```",
			record.Asn, record.Holder, record.Asn,
			record.Asn,
			record.Asn, record.Holder, record.OrgName, record.Country, record.CountryCode,
			statusStr, record.AnnouncedPrefixesCount, abuseEmail,
			count, prefixList.String(),
			record.RawWhoisText,
			string(schemaBytes),
		)
	}

	record, err := h.svc.LookupIP(query)
	if err != nil || record == nil {
		return fmt.Sprintf(`---
title: IP Lookup Error - %s - IP-Hub
description: Lookup error for query %s.
---

# IP Lookup Error: %s

Unable to retrieve WHOIS / routing intelligence: %s.

Verify that the target is a valid IPv4, IPv6, or CIDR address.
`, query, query, query, err)
	}

	routedStr := "Unannounced / Internal"
	if record.Routing.IsAnnounced {
		routedStr = "Globally Routed (BGP Active)"
	}

	visStr := "N/A"
	if record.Routing.IsAnnounced {
		visStr = fmt.Sprintf("%d%% (%d of %d RIS peer collectors)", record.Routing.BgpVisibilityPercentage, record.Routing.RisPeersSeen, record.Routing.TotalRisPeers)
	}

	originAsn := record.Routing.OriginAsn
	if originAsn == "" {
		originAsn = "Unrouted"
	}

	abuseEmail := record.AbuseContact.Email
	if abuseEmail == "" {
		abuseEmail = "Not published"
	}

	subnetMd := ""
	if record.Subnet != nil {
		subnetMd = fmt.Sprintf(`
### Subnet Breakdown
- **CIDR**: `+"`%s`"+`
- **Network Address**: `+"`%s`"+`
- **Netmask**: `+"`%s`"+`
- **Wildcard Mask**: `+"`%s`"+`
- **Usable Host Range**: `+"`%s`"+` - `+"`%s`"+`
- **Total Usable Hosts**: %s
`, record.Subnet.CIDR, record.Subnet.NetworkAddress, record.Subnet.Netmask, record.Subnet.WildcardMask, record.Subnet.FirstUsableIP, record.Subnet.LastUsableIP, record.Subnet.UsableHosts)
	}

	ipDatasetSchema := map[string]any{
		"@context":            "https://schema.org",
		"@type":               "Dataset",
		"@id":                 fmt.Sprintf("https://ip-hub.ir/lookup/%s#dataset", url.PathEscape(record.Query)),
		"name":                fmt.Sprintf("IP Intelligence Dataset for %s (%s)", record.Query, record.Netname),
		"description":         fmt.Sprintf("Original RIPE WHOIS allocation (%s / %s), organization (%s, %s), BGP origin routing (%s), and abuse contact dataset for %s.", record.CIDR, record.Range, record.OrgName, record.CountryCode, originAsn, record.Query),
		"url":                 fmt.Sprintf("https://ip-hub.ir/lookup/%s", url.PathEscape(record.Query)),
		"license":             "https://opensource.org/licenses/MIT",
		"isAccessibleForFree": true,
		"creator": map[string]any{
			"@type": "Organization",
			"@id":   "https://ip-hub.ir/#organization",
			"name":  "IP-Hub",
			"url":   "https://ip-hub.ir/",
		},
		"variableMeasured": []map[string]any{
			{"@type": "PropertyValue", "name": "Query Target", "value": record.Query},
			{"@type": "PropertyValue", "name": "Network Name", "value": record.Netname},
			{"@type": "PropertyValue", "name": "Allocated CIDR", "value": record.CIDR},
			{"@type": "PropertyValue", "name": "Allocated Range", "value": record.Range},
			{"@type": "PropertyValue", "name": "Organization", "value": record.OrgName},
			{"@type": "PropertyValue", "name": "Country", "value": record.CountryCode},
			{"@type": "PropertyValue", "name": "Origin ASN", "value": originAsn},
			{"@type": "PropertyValue", "name": "Routing State", "value": routedStr},
			{"@type": "PropertyValue", "name": "Abuse Contact", "value": abuseEmail},
		},
		"distribution": []map[string]any{
			{
				"@type":          "DataDownload",
				"encodingFormat": "application/json",
				"name":           fmt.Sprintf("%s WHOIS JSON API", record.Query),
				"contentUrl":     "https://ip-hub.ir/api/whois/lookup",
			},
		},
	}
	ipSchemaBytes, _ := json.MarshalIndent(ipDatasetSchema, "", "  ")

	return fmt.Sprintf(`---
title: WHOIS & BGP Intelligence: %s - IP-Hub
description: Real-time network intelligence, BGP origin routing, RIPE allocation records, and abuse contacts for %s.
---

# Network Intelligence: %s

## Network Registration & Allocation

| Attribute | Details |
| :--- | :--- |
| **Query Target** | `+"`%s`"+` |
| **Network Name (netname)** | %s |
| **Allocated CIDR Range** | `+"`%s`"+` (`+"`%s`"+`) |
| **Holder / Organization** | %s |
| **Allocated Country** | %s (%s) |
| **Status** | %s |
| **Reverse DNS (PTR)** | %s |

## BGP Global Routing & Origin ASN

| Routing Property | Details |
| :--- | :--- |
| **Routing State** | %s |
| **Origin Route ASN** | %s |
| **Announced Prefix** | `+"`%s`"+` |
| **RIPE RIS Peer Visibility** | %s |

## Incident Reporting & Abuse Contacts

- **Official Abuse Mailbox**: `+"`%s`"+`
- **Organization**: %s

%s

## Raw Database Objects

`+"```text\n%s\n```"+`

`+"```json\n%s\n```",
		record.Query, record.Query,
		record.Query,
		record.Query, record.Netname, record.CIDR, record.Range, record.OrgName,
		record.Country, record.CountryCode, record.Status, record.ReverseDNS,
		routedStr, originAsn, record.Routing.AnnouncedPrefix, visStr,
		abuseEmail, record.AbuseContact.OrgName,
		subnetMd,
		record.RawWhoisText,
		string(ipSchemaBytes),
	)
}

func (h *Handler) renderLookupGuideMarkdown(lang string) string {
	return `---
title: Single WHOIS & ASN Lookup - IP-Hub
description: Query real-time delegated IP prefixes, BGP origin routing, abuse contacts, and RIPE database objects.
---

# Single WHOIS & BGP Routing Lookup

Use this tool to inspect any IPv4 address, IPv6 address, CIDR prefix, or Autonomous System Number (ASN).

## Supported Query Formats

- **IPv4 Address**: ` + "`/lookup/1.1.1.1`" + ` or ` + "`/lookup/8.8.8.8`" + `
- **IPv6 Address**: ` + "`/lookup/2001:4860:4860::8888`" + `
- **CIDR Prefix**: ` + "`/lookup/193.0.0.0/21`" + `
- **Autonomous System**: ` + "`/lookup/AS13335`" + ` or ` + "`/lookup/AS3333`" + `

## JSON REST API Example

` + "```bash\n" + `curl -X POST https://ip-hub.ir/api/whois/lookup \
  -H "Content-Type: application/json" \
  -d '{"query": "1.1.1.1"}'
` + "```\n"
}

func (h *Handler) renderCountryMarkdown(c fiber.Ctx, rawCode, lang string) string {
	code := strings.ToUpper(strings.TrimSpace(rawCode))
	if before, ok := strings.CutSuffix(code, ".MD"); ok {
		code = before
	}

	res, err := h.svc.LookupCountry(code)
	if err != nil || res == nil {
		return fmt.Sprintf(`---
title: Country Not Found - %s - IP-Hub
description: Country code %s was not found or could not be loaded.
---

# Country Delegations Not Found: %s

Unable to retrieve delegated IP resources for ISO country code `+"`%s`"+`: %s.

Please use a valid ISO 3166-1 alpha-2 code (e.g. `+"`/country/IR`"+`, `+"`/country/DE`"+`, `+"`/country/US`"+`).
`, code, code, code, code, err)
	}

	reqFormat := strings.ToLower(strings.TrimSpace(c.Query("format")))
	if reqFormat == "" {
		reqFormat = "mikrotik"
	}
	reqVersion := strings.ToLower(strings.TrimSpace(c.Query("version")))
	if reqVersion == "" {
		reqVersion = "any"
	}
	reqAccess := strings.ToLower(strings.TrimSpace(c.Query("access")))
	if reqAccess != "deny" {
		reqAccess = "allow"
	}
	reqListName := strings.TrimSpace(c.Query("listName"))
	if reqListName == "" {
		reqListName = res.CountryCode
	}

	formattedRes := h.svc.FormatCountry(res, reqFormat, reqVersion, reqAccess, reqListName)
	ruleCount := 0
	filename := fmt.Sprintf("%s_%s.txt", strings.ToLower(res.CountryCode), reqFormat)
	if formattedRes != nil {
		ruleCount = formattedRes.RuleCount
		if formattedRes.Filename != "" {
			filename = formattedRes.Filename
		}
	}

	var ipv4Sample strings.Builder
	v4Display := min(len(res.IPv4), 20)
	v4SampleSlice := make([]string, 0, min(len(res.IPv4), 10))
	for i := range v4Display {
		fmt.Fprintf(&ipv4Sample, "- `%s`\n", res.IPv4[i])
		if i < 10 {
			v4SampleSlice = append(v4SampleSlice, res.IPv4[i])
		}
	}
	if len(res.IPv4) > v4Display {
		fmt.Fprintf(&ipv4Sample, "- *... and %d more IPv4 prefixes*\n", len(res.IPv4)-v4Display)
	}

	var ipv6Sample strings.Builder
	v6Display := min(len(res.IPv6), 20)
	v6SampleSlice := make([]string, 0, min(len(res.IPv6), 5))
	for i := range v6Display {
		fmt.Fprintf(&ipv6Sample, "- `%s`\n", res.IPv6[i])
		if i < 5 {
			v6SampleSlice = append(v6SampleSlice, res.IPv6[i])
		}
	}
	if len(res.IPv6) > v6Display {
		fmt.Fprintf(&ipv6Sample, "- *... and %d more IPv6 prefixes*\n", len(res.IPv6)-v6Display)
	}

	asnSampleSlice := make([]string, 0, min(len(res.ASNs), 10))
	for i := range min(len(res.ASNs), 10) {
		asnSampleSlice = append(asnSampleSlice, fmt.Sprintf("AS%d", res.ASNs[i]))
	}

	mikrotikExample := fmt.Sprintf(`/ip firewall address-list
add list=COUNTRY_%s address=%s comment="%s delegated range"`,
		code, getFirstPrefixOrFallback(res.IPv4, "1.0.0.0/24"), res.CountryName)

	ciscoExample := fmt.Sprintf(`ip access-list standard COUNTRY_%s_ACL
 permit %s 0.0.0.255`,
		code, strings.Split(getFirstPrefixOrFallback(res.IPv4, "1.0.0.0/24"), "/")[0])

	pfExample := fmt.Sprintf(`table <ips_%s> persist {
  %s
}`, strings.ToLower(code), getFirstPrefixOrFallback(res.IPv4, "1.0.0.0/24"))

	ipsetExample := fmt.Sprintf(`ipset create country_%s hash:net
ipset add country_%s %s`, strings.ToLower(code), strings.ToLower(code), getFirstPrefixOrFallback(res.IPv4, "1.0.0.0/24"))

	dlURL := fmt.Sprintf("https://ip-hub.ir/dl?country=%s&format=%s&version=%s&access=%s&listName=%s",
		url.QueryEscape(res.CountryCode),
		url.QueryEscape(reqFormat),
		url.QueryEscape(reqVersion),
		url.QueryEscape(reqAccess),
		url.QueryEscape(reqListName),
	)

	countryDatasetSchema := map[string]any{
		"@context":            "https://schema.org",
		"@type":               "Dataset",
		"@id":                 fmt.Sprintf("https://ip-hub.ir/country/%s#dataset-%s-%s-%s", res.CountryCode, reqFormat, reqVersion, reqAccess),
		"name":                fmt.Sprintf("%s (%s) IP List formatted for %s (%s, %s)", res.CountryName, res.CountryCode, reqFormat, strings.ToUpper(reqVersion), strings.ToUpper(reqAccess)),
		"description":         fmt.Sprintf("Original RIR-delegated IP dataset for %s (%s) containing %d IPv4 prefixes, %d IPv6 prefixes, and %d ASNs, formatted with parameters: format=%s, version=%s, access=%s, listName=%s (%d generated rules).", res.CountryName, res.CountryCode, res.IPv4Count, res.IPv6Count, res.AsnCount, reqFormat, reqVersion, reqAccess, reqListName, ruleCount),
		"url":                 fmt.Sprintf("https://ip-hub.ir/country/%s", res.CountryCode),
		"license":             "https://opensource.org/licenses/MIT",
		"isAccessibleForFree": true,
		"spatialCoverage": map[string]any{
			"@type":      "Country",
			"name":       res.CountryName,
			"identifier": res.CountryCode,
		},
		"creator": map[string]any{
			"@type": "Organization",
			"@id":   "https://ip-hub.ir/#organization",
			"name":  "IP-Hub",
			"url":   "https://ip-hub.ir/",
		},
		"variableMeasured": []map[string]any{
			{"@type": "PropertyValue", "name": "Country Code", "value": res.CountryCode},
			{"@type": "PropertyValue", "name": "Format Parameter", "value": reqFormat},
			{"@type": "PropertyValue", "name": "IP Version Parameter", "value": reqVersion},
			{"@type": "PropertyValue", "name": "Access Policy Parameter", "value": reqAccess},
			{"@type": "PropertyValue", "name": "List Name Parameter", "value": reqListName},
			{"@type": "PropertyValue", "name": "Generated Firewall Rule Count", "value": ruleCount},
			{"@type": "PropertyValue", "name": "Delegated IPv4 CIDR Count", "value": res.IPv4Count},
			{"@type": "PropertyValue", "name": "Delegated IPv6 CIDR Count", "value": res.IPv6Count},
			{"@type": "PropertyValue", "name": "Origin ASN Count", "value": res.AsnCount},
			{"@type": "PropertyValue", "name": "Estimated IPv4 Addresses", "value": res.TotalEstimatedIPv4Addresses},
			{"@type": "PropertyValue", "name": "Sample IPv4 CIDR Prefixes", "value": strings.Join(v4SampleSlice, ", ")},
			{"@type": "PropertyValue", "name": "Sample IPv6 CIDR Prefixes", "value": strings.Join(v6SampleSlice, ", ")},
			{"@type": "PropertyValue", "name": "Sample Origin ASNs", "value": strings.Join(asnSampleSlice, ", ")},
		},
		"distribution": []map[string]any{
			{
				"@type":          "DataDownload",
				"encodingFormat": "text/plain",
				"name":           filename,
				"contentUrl":     dlURL,
			},
			{
				"@type":          "DataDownload",
				"encodingFormat": "application/json",
				"name":           fmt.Sprintf("%s (%s) Raw JSON Resource", res.CountryName, res.CountryCode),
				"contentUrl":     fmt.Sprintf("https://ip-hub.ir/dl?country=%s&format=json&version=%s&access=%s", url.QueryEscape(res.CountryCode), url.QueryEscape(reqVersion), url.QueryEscape(reqAccess)),
			},
		},
	}
	countrySchemaBytes, _ := json.MarshalIndent(countryDatasetSchema, "", "  ")

	return fmt.Sprintf(`---
title: %s (%s) IP Delegations & Firewall Rules - IP-Hub
description: Real-time official IPv4 and IPv6 delegated address blocks, registered ASNs, and ready-to-use edge firewall configurations for %s (%s).
---

# %s (%s) - Delegated IP Ranges & Firewall Rules

Official country-level network delegations allocated to organizations within **%s** (%s) from regional internet registries.

## Allocation Statistics

| Metric | Count |
| :--- | :--- |
| **Country Code** | %s |
| **Country Name** | %s |
| **IPv4 Delegated Prefixes** | %d |
| **IPv6 Delegated Prefixes** | %d |
| **Autonomous Systems (ASNs)** | %d |
| **Estimated IPv4 Addresses** | %d |
| **Query Timestamp** | %s |

## Ready-to-Use Edge Firewall Configurations

### 1. MikroTik RouterOS (`+"`.rsc`"+`)
`+"```rsc\n%s\n```"+`

### 2. Cisco IOS Access Control List (ACL)
`+"```cisco\n%s\n```"+`

### 3. FreeBSD / OpenBSD Packet Filter (`+"`pf.conf`"+`)
`+"```pf\n%s\n```"+`

### 4. Linux Netfilter (`+"`ipset`"+` / `+"`iptables`"+`)
`+"```bash\n%s\n```"+`

## Delegated IPv4 CIDR Prefixes (%d total)

%s

## Delegated IPv6 CIDR Prefixes (%d total)

%s

## REST API Download

You can fetch the complete list of prefixes programmatically via JSON:

`+"```bash\n"+`curl -X POST https://ip-hub.ir/api/whois/country \
  -H "Content-Type: application/json" \
  -d '{"code": "%s"}'
`+"```\n\n```json\n%s\n```",
		res.CountryName, res.CountryCode, res.CountryName, res.CountryCode,
		res.CountryName, res.CountryCode, res.CountryName, res.CountryCode,
		res.CountryCode, res.CountryName, res.IPv4Count, res.IPv6Count, res.AsnCount, res.TotalEstimatedIPv4Addresses, res.QueryTime,
		mikrotikExample, ciscoExample, pfExample, ipsetExample,
		res.IPv4Count, ipv4Sample.String(),
		res.IPv6Count, ipv6Sample.String(),
		res.CountryCode,
		string(countrySchemaBytes),
	)
}

func getFirstPrefixOrFallback(list []string, fallback string) string {
	if len(list) > 0 {
		return list[0]
	}
	return fallback
}

func (h *Handler) renderCountryListMarkdown(lang string) string {
	return `---
title: Country IP Delegations Directory - IP-Hub
description: Explore and download delegated IPv4 & IPv6 address prefixes by ISO country code, with multi-format firewall generator scripts.
---

# Country IP Delegations Directory

IP-Hub maintains real-time delegations of all IPv4 and IPv6 address prefixes officially assigned to countries across the globe.

## Popular Country Shortcuts

- [Iran (IR)](https://ip-hub.ir/country/IR) - MikroTik, Cisco, pf, ipset firewall rules
- [Germany (DE)](https://ip-hub.ir/country/DE)
- [United States (US)](https://ip-hub.ir/country/US)
- [United Kingdom (GB)](https://ip-hub.ir/country/GB)
- [France (FR)](https://ip-hub.ir/country/FR)
- [Netherlands (NL)](https://ip-hub.ir/country/NL)
- [Turkey (TR)](https://ip-hub.ir/country/TR)
- [Canada (CA)](https://ip-hub.ir/country/CA)
- [China (CN)](https://ip-hub.ir/country/CN)
- [Russia (RU)](https://ip-hub.ir/country/RU)

To query any other country, request ` + "`/country/{ISO_CODE}`" + ` (e.g. ` + "`/country/JP`" + ` or ` + "`/country/BR`" + `).

## API Integration

` + "```bash\n" + `curl -X POST https://ip-hub.ir/api/whois/country \
  -H "Content-Type: application/json" \
  -d '{"code": "IR"}'
` + "```\n"
}

func (h *Handler) renderBatchMarkdown(lang string) string {
	return `---
title: Batch WHOIS Inspector - IP-Hub
description: Concurrently query and audit up to 50 IP addresses, CIDR blocks, or ASNs with CSV/JSON export.
---

# Batch WHOIS & BGP Inspector

The Batch Inspector allows security operations centers (SOC), incident responders, and network administrators to audit up to 50 network targets concurrently.

## Capabilities

- Concurrently queries RIPE WHOIS and BGP routing databases.
- Supports mixed targets in a single request: IPv4, IPv6, CIDR blocks, and ASN numbers.
- Identifies network name, country, origin ASN, and designated abuse contact mailbox for every item.

## REST API Usage

` + "```bash\n" + `curl -X POST https://ip-hub.ir/api/whois/batch \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [
      "1.1.1.1",
      "8.8.8.8",
      "AS13335",
      "193.0.0.0/21"
    ]
  }'
` + "```\n"
}

func (h *Handler) renderSubnetCalcWithQueryMarkdown(query, lang string) string {
	trimmed := strings.TrimSpace(query)
	res := h.svc.ComputeSubnet(trimmed, nil)
	if res == nil {
		return h.renderSubnetCalcGuideMarkdown(lang)
	}

	subnetDatasetSchema := map[string]any{
		"@context":            "https://schema.org",
		"@type":               "Dataset",
		"@id":                 fmt.Sprintf("https://ip-hub.ir/subnet-calc/%s#dataset", url.PathEscape(res.CIDR)),
		"name":                fmt.Sprintf("CIDR Subnet Calculation Dataset for %s (IPv%d)", res.CIDR, res.IPVersion),
		"description":         fmt.Sprintf("Original CIDR subnet breakdown dataset for %s: Network Address %s, Netmask %s, Wildcard Mask %s, Broadcast %s, Usable Range %s to %s (%s usable hosts).", res.CIDR, res.NetworkAddress, res.Netmask, res.WildcardMask, res.BroadcastAddress, res.FirstUsableIP, res.LastUsableIP, res.UsableHosts),
		"url":                 fmt.Sprintf("https://ip-hub.ir/subnet-calc/%s", url.PathEscape(res.CIDR)),
		"license":             "https://opensource.org/licenses/MIT",
		"isAccessibleForFree": true,
		"creator": map[string]any{
			"@type": "Organization",
			"@id":   "https://ip-hub.ir/#organization",
			"name":  "IP-Hub",
			"url":   "https://ip-hub.ir/",
		},
		"variableMeasured": []map[string]any{
			{"@type": "PropertyValue", "name": "CIDR Notation", "value": res.CIDR},
			{"@type": "PropertyValue", "name": "IP Version", "value": fmt.Sprintf("IPv%d", res.IPVersion)},
			{"@type": "PropertyValue", "name": "Prefix Length", "value": fmt.Sprintf("/%d", res.PrefixLength)},
			{"@type": "PropertyValue", "name": "Network Address", "value": res.NetworkAddress},
			{"@type": "PropertyValue", "name": "Subnet Mask", "value": res.Netmask},
			{"@type": "PropertyValue", "name": "Wildcard Mask", "value": res.WildcardMask},
			{"@type": "PropertyValue", "name": "Broadcast Address", "value": res.BroadcastAddress},
			{"@type": "PropertyValue", "name": "Usable Host Range", "value": fmt.Sprintf("%s - %s", res.FirstUsableIP, res.LastUsableIP)},
			{"@type": "PropertyValue", "name": "Total Usable Hosts", "value": res.UsableHosts},
			{"@type": "PropertyValue", "name": "Total Address Space", "value": res.TotalHosts},
		},
		"distribution": []map[string]any{
			{
				"@type":          "DataDownload",
				"encodingFormat": "application/json",
				"name":           fmt.Sprintf("%s Subnet JSON Calculation", res.CIDR),
				"contentUrl":     fmt.Sprintf("https://ip-hub.ir/api/whois/subnet?ip=%s", url.QueryEscape(res.CIDR)),
			},
		},
	}
	subnetSchemaBytes, _ := json.MarshalIndent(subnetDatasetSchema, "", "  ")

	return fmt.Sprintf(`---
title: Subnet Calculation: %s - IP-Hub
description: Detailed CIDR calculation breakdown, usable host range, netmask, and wildcard mask for %s.
---

# Subnet Calculation Breakdown: %s

## Network Properties

| Property | Value |
| :--- | :--- |
| **Input CIDR Notation** | `+"`%s`"+` |
| **IP Version** | IPv%d |
| **Prefix Length** | /%d |
| **Network Address** | `+"`%s`"+` |
| **Subnet Mask (Netmask)** | `+"`%s`"+` |
| **Wildcard Mask** | `+"`%s`"+` |
| **Broadcast Address** | `+"`%s`"+` |
| **First Usable Host IP** | `+"`%s`"+` |
| **Last Usable Host IP** | `+"`%s`"+` |
| **Total Usable Hosts** | %s |
| **Total Address Space** | %s |

## Binary Representation

- **Binary IP**: `+"`%s`"+`

## REST API Query

`+"```bash\n"+`curl "https://ip-hub.ir/api/whois/subnet?ip=%s"
`+"```\n\n```json\n%s\n```\n",
		res.CIDR, res.CIDR,
		res.CIDR,
		res.CIDR, res.IPVersion, res.PrefixLength, res.NetworkAddress,
		res.Netmask, res.WildcardMask, res.BroadcastAddress,
		res.FirstUsableIP, res.LastUsableIP, res.UsableHosts, res.TotalHosts,
		res.BinaryIP,
		url.QueryEscape(res.CIDR),
		string(subnetSchemaBytes),
	)
}

func (h *Handler) renderSubnetCalcGuideMarkdown(lang string) string {
	return `---
title: CIDR Subnet Calculator - IP-Hub
description: Calculate network bounds, netmask, wildcard mask, broadcast address, and usable host ranges.
---

# CIDR Subnet Calculator

Calculate network parameters, wildcard masks, usable host ranges, and binary representations for any IPv4 or IPv6 subnet.

## Direct URL Access

You can calculate any subnet directly via the URL:
- ` + "`/subnet-calc/192.168.1.0/24`" + `
- ` + "`/subnet-calc/10.0.0.0/8`" + `
- ` + "`/subnet-calc/172.16.0.0/12`" + `

## REST API Endpoint

` + "```bash\n" + `curl "https://ip-hub.ir/api/whois/subnet?ip=192.168.1.0&cidr=24"
` + "```\n"
}

func (h *Handler) renderSourceMarkdown(lang string) string {
	return fmt.Sprintf(`---
title: Source Code & Architecture - IP-Hub
description: Open-source network intelligence platform architecture, Go Fiber v3 backend, React 19 frontend, Redis caching, and deployment instructions.
---

# Technical Architecture & Source Code

IP-Hub is built with performance and security at its core.

## System Components

- **Backend Framework**: Go (%s) with Fiber v3 (`+"`github.com/gofiber/fiber/v3`"+`).
- **Caching Layer**: Redis with daily end-of-day TTL and atomic key management.
- **Frontend**: React 19 SPA with Vite, Tailwind CSS, and Ant Design.
- **Data Upstreams**: RIPE NCC REST API, RIPE Stat RIS peer routing analytics, and RDAP endpoints.
- **Content Negotiation**: Cloudflare **Markdown for Agents** compliance (`+"`Accept: text/markdown`"+`).

## Open Source Repository

- **GitHub**: [https://github.com/kzeedev/IP-Hub](https://github.com/kzeedev/IP-Hub)
`, config.Version)
}

func (h *Handler) renderIssuesMarkdown(lang string) string {
	return `---
title: Issue Tracker & Community Support - IP-Hub
description: Community issue submission, bug reports, feature requests, and vulnerability reporting guidelines for IP-Hub.
---

# Issue Tracker & Community Support

To report bugs, submit feedback, or request features, please open an issue in the official GitHub repository:

- **GitHub Issues**: [https://github.com/kzeedev/IP-Hub/issues](https://github.com/kzeedev/IP-Hub/issues)

## Submitting a Bug Report

When submitting an issue, please include:
1. Target IP, ASN, or country code queried.
2. Expected behavior vs. observed behavior.
3. Client details (browser, curl command, or AI agent).
`
}

func (h *Handler) renderSettingsMarkdown(lang string) string {
	if strings.EqualFold(lang, "fa") {
		return fmt.Sprintf(`---
title: تنظیمات سامانه - IP-Hub
description: تنظیمات زبان، پوسته ظاهری و وضعیت سرویس‌ها.
---

# تنظیمات سامانه

- **نسخه**: %s
- **زبان‌های پشتیبانی‌شده**: انگلیسی (en) و فارسی (fa)
`, config.Version)
	}

	return fmt.Sprintf(`---
title: Settings - IP-Hub
description: Display language, theme preferences, and service status.
---

# Settings

- **Version**: %s
- **Supported Languages**: English (en) and Persian (fa)
`, config.Version)
}

func (h *Handler) renderMcpMarkdown(lang string) string {
	if strings.EqualFold(lang, "fa") {
		return `---
title: راهنمای سرور MCP آی‌پی هاب - اتصال هوش مصنوعی به WHOIS و لیست IP کشورها برای میکروتیک
description: مستندات اتصال Claude، Cursor و VS Code به سرور MCP آی‌پی هاب (https://ip-hub.ir/mcp) برای استعلام زنده RIPE WHOIS، مسیریابی BGP و تولید لیست IP ایران برای میکروتیک و سیسکو.
---

# سرور هوش مصنوعی MCP آی‌پی هاب (Model Context Protocol)

> سرور MCP آی‌پی هاب در آدرس ` + "`https://ip-hub.ir/mcp`" + ` از پروتکل استاندارد **Streamable HTTP** پشتیبانی می‌کند و به دستیارهای هوش مصنوعی (Claude، Cursor، VS Code Copilot، Windsurf و ایجنت‌های LLM) اجازه می‌دهد بدون نیاز به کلید API، به ۶ ابزار شبکه، ۵ منبع داده و ۷ قالب پرامپت دوزبانه (شامل قالب پرکاربرد **«لیست IP {country} برای {format}»**) دسترسی مستقیم داشته باشند.

## نحوه اتصال در کلاینت‌های هوش مصنوعی

### Cursor IDE (` + "`.cursor/mcp.json`" + `)
` + "```json\n" + `{
  "mcpServers": {
    "ip-hub": {
      "url": "https://ip-hub.ir/mcp"
    }
  }
}` + "\n```\n\n" + `### VS Code / GitHub Copilot (` + "`.vscode/mcp.json`" + `)
` + "```json\n" + `{
  "servers": {
    "ip-hub": {
      "type": "http",
      "url": "https://ip-hub.ir/mcp"
    }
  }
}` + "\n```\n\n" + `### Claude Code CLI
` + "```bash\n" + `claude mcp add --transport http ip-hub https://ip-hub.ir/mcp` + "\n```\n\n" + `## ابزارهای سرور (MCP Tools)

1. **` + "`whois_lookup`" + `**: استعلام جامع RIPE WHOIS، موقعیت جغرافیایی، ایمیل Abuse و وضعیت مسیریابی BGP برای IP، ASN یا CIDR.
2. **` + "`country_resources`" + `**: دریافت رنج‌های IPv4/IPv6 و ASNهای کشورها (با پشتیبانی از نام فارسی/انگلیسی کشور یا کد ISO) و تولید قوانین فایروال (` + "`mikrotik`" + `، ` + "`cisco`" + `، ` + "`ipset`" + `، ` + "`freebsd-pf`" + `، ` + "`fortigate`" + `، ` + "`htaccess`" + `، ` + "`json`" + `).
3. **` + "`whois_batch`" + `**: بررسی هم‌زمان تا ۵۰ آدرس IP به صورت موازی.
4. **` + "`subnet_calculator`" + `**: محاسبه مهندسی ساب‌نت، Netmask، وایلدکارد مسک سیسکو و بازه هاست‌ها.
5. **` + "`system_status`" + `**: وضعیت نسخه سرور، ارتباط با RIPE Stat و صف تکمیل نام سرویس‌دهندگان.
6. **` + "`list_plugins`" + `**: فهرست پلاگین‌ها و فرمت‌های خروجی فایروال.

## قالب‌های پرامپت دوزبانه (MCP Prompts)

- **` + "`country_ip_list_fa`" + `**: قالب پویا **«لیست IP {country} برای {format}»** (مثال: لیست IP ایران برای میکروتیک، لیست IP آلمان برای سیسکو).
- **` + "`generate_country_firewall_config`" + `**: قالب **«{country} IP List for {format}»**.
- **` + "`ddos_geoip_mitigation_guide`" + `**: راهنمای مقابله با حملات DDoS با لیست IP کشورها.
- **` + "`investigate_network_resource`" + `**: بررسی امنیتی و مسیریابی BGP برای IP/ASN/CIDR.
- **` + "`batch_ip_security_triage`" + `**: تحلیل گروهی لاگ امنیتی و آدرس‌های IP.
- **` + "`asn_bgp_peering_analysis`" + `**: تحلیل پیشوندهای BGP یک شماره ASN.
- **` + "`subnet_planning_assistant`" + `**: دستیار طراحی و محاسبه ساب‌نت CIDR.
`
	}

	return `---
title: IP-Hub MCP Server Guide - Model Context Protocol for RIPE WHOIS, BGP & Firewall Rules
description: Connect Claude, Cursor, VS Code, and AI agents to the IP-Hub MCP Server (https://ip-hub.ir/mcp) via Streamable HTTP for live RIPE WHOIS, BGP routing, and country firewall rules.
---

# IP-Hub Model Context Protocol (MCP) Server

> The IP-Hub MCP Server is available at ` + "`https://ip-hub.ir/mcp`" + ` over the standard **Streamable HTTP** transport. It enables AI assistants (Claude Desktop, Claude Code, Cursor, VS Code Copilot, Windsurf, Cline) to invoke 6 live network intelligence tools, read 5 static and templated URI resources, and use 7 bilingual (English & Persian) prompt templates with zero authentication required.

## Quick Start Configuration

### Cursor IDE (` + "`.cursor/mcp.json`" + `)
` + "```json\n" + `{
  "mcpServers": {
    "ip-hub": {
      "url": "https://ip-hub.ir/mcp"
    }
  }
}` + "\n```\n\n" + `### VS Code / GitHub Copilot (` + "`.vscode/mcp.json`" + `)
` + "```json\n" + `{
  "servers": {
    "ip-hub": {
      "type": "http",
      "url": "https://ip-hub.ir/mcp"
    }
  }
}` + "\n```\n\n" + `### Claude Code CLI
` + "```bash\n" + `claude mcp add --transport http ip-hub https://ip-hub.ir/mcp` + "\n```\n\n" + `## Available MCP Tools (6 Tools)

1. **` + "`whois_lookup`" + `** (` + "`query`" + `): Real-time RIPE WHOIS ownership, geolocation, abuse contacts, and BGP routing status for any IPv4, IPv6, ASN, or CIDR prefix.
2. **` + "`country_resources`" + `** (` + "`code`" + `, ` + "`format`" + `, ` + "`version`" + `, ` + "`access`" + `, ` + "`listName`" + `): Fetches delegated IPv4/IPv6 CIDR blocks and ASNs for any country (accepts English/Persian country names or 2-letter ISO codes) and generates firewall rules (` + "`mikrotik`" + `, ` + "`cisco`" + `, ` + "`freebsd-pf`" + `, ` + "`ipset`" + `, ` + "`fortigate`" + `, ` + "`htaccess`" + `, ` + "`json`" + `).
3. **` + "`whois_batch`" + `** (` + "`items`" + `): Parallel inspection of up to 50 IPv4/IPv6 addresses.
4. **` + "`subnet_calculator`" + `** (` + "`ip`" + `, ` + "`cidr`" + `): Computes network address, broadcast address, netmask, Cisco wildcard mask, usable host range, and host capacity.
5. **` + "`system_status`" + `**: Returns IP-Hub version, RIPE Stat API reachability, and background resolver queue progress.
6. **` + "`list_plugins`" + `**: Lists available firewall rule formatting plugins and export formats.

## MCP Resources & URI Templates

- ` + "`iphub://country/{code}`" + ` (` + "`application/json`" + `)
- ` + "`iphub://country/{code}/rules/{format}`" + ` (` + "`text/plain`" + ` / ` + "`application/json`" + `)
- ` + "`iphub://system/status`" + ` (` + "`application/json`" + `)
- ` + "`iphub://system/plugins`" + ` (` + "`application/json`" + `)
- ` + "`iphub://docs/llms.txt`" + ` (` + "`text/markdown`" + `)

## Parameterized Bilingual MCP Prompts

- **` + "`country_ip_list_fa`" + `**: Parameterized Persian template ` + "`لیست IP {country} برای {format}`" + `.
- **` + "`generate_country_firewall_config`" + `**: Parameterized template ` + "`{country} IP List for {format}`" + `.
- **` + "`ddos_geoip_mitigation_guide`" + `**: GeoIP DDoS mitigation playbook for ` + "`{country}`" + ` on ` + "`{format}`" + `.
- **` + "`investigate_network_resource`" + `**: Deep WHOIS & BGP audit for ` + "`{target}`" + `.
- **` + "`batch_ip_security_triage`" + `**: Parallel log and threat triage for ` + "`{ips}`" + `.
- **` + "`asn_bgp_peering_analysis`" + `**: BGP prefix portfolio analysis for ` + "`{asn}`" + `.
- **` + "`subnet_planning_assistant`" + `**: CIDR subnet engineering breakdown for ` + "`{cidr}`" + `.
`
}
