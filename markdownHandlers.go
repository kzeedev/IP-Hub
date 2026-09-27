package main

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/kzeedev/IP-Hub/config"
)

// Content-Signal header value complying with modern AI crawler and agent standards
const ContentSignalHeaderValue = "ai-train=yes, search=yes, ai-input=yes"

// Estimate token count for Markdown content (~4 characters per token heuristic)
func estimateTokens(s string) int {
	count := len(s) / 4
	if count < 1 && len(s) > 0 {
		return 1
	}
	return count
}

// Check if a requested path points to a static file or build asset
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

// Parse Accept header to extract q-factor for a specific media type
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

// wantsMarkdown inspects query parameters, file extensions, and Accept header for Markdown preference
func wantsMarkdown(c fiber.Ctx) bool {
	// 1. Explicit query parameter override (e.g. ?format=markdown or ?format=md or ?markdown=1)
	if strings.EqualFold(c.Query("format"), "markdown") || strings.EqualFold(c.Query("format"), "md") || c.Query("markdown") == "1" {
		return true
	}

	// 2. URL path extension (e.g. /country/IR.md, /subnet-calc.md)
	if strings.HasSuffix(strings.ToLower(c.Path()), ".md") {
		return true
	}

	// 3. HTTP Accept header content negotiation
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

	// If text/html is not mentioned, text/markdown wins
	if !strings.Contains(lower, "text/html") {
		return true
	}

	htmlQ := getAcceptQ(lower, "text/html")
	return mdQ >= htmlQ
}

// markdownNegotiationMiddleware handles content negotiation for agents requesting text/markdown
func markdownNegotiationMiddleware(c fiber.Ctx) error {
	method := c.Method()
	if method != fiber.MethodGet && method != fiber.MethodHead {
		return c.Next()
	}

	rawPath := c.Path()
	// Skip API routes and known static assets
	if strings.HasPrefix(rawPath, "/api/") || isStaticAsset(rawPath) {
		return c.Next()
	}

	// Don't intercept specific well-known text files like robots.txt or llms.txt
	if rawPath == "/robots.txt" || rawPath == "/llms.txt" || rawPath == "/sitemap.xml" {
		return c.Next()
	}

	// Check if the client requested Markdown
	if !wantsMarkdown(c) {
		// Ensure Vary: Accept is set on standard HTML responses for correct CDN & proxy caching
		c.Set("Vary", "Accept")
		return c.Next()
	}

	// Generate clean Markdown representation for the requested route
	mdContent := generateMarkdownForRoute(c)

	// Set headers as specified by Cloudflare Markdown for Agents standard
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

// generateMarkdownForRoute parses the URL and renders appropriate Markdown content
func generateMarkdownForRoute(c fiber.Ctx) string {
	rawPath := strings.TrimSpace(c.Path())
	// Strip .md extension if present
	if strings.HasSuffix(strings.ToLower(rawPath), ".md") {
		rawPath = rawPath[:len(rawPath)-3]
	}
	cleanPath := strings.Trim(rawPath, "/")

	lang := "en"
	segments := []string{}
	if cleanPath != "" {
		for _, s := range strings.Split(cleanPath, "/") {
			if s != "" {
				segments = append(segments, s)
			}
		}
	}

	// Check language prefix
	if len(segments) > 0 && strings.EqualFold(segments[0], "fa") {
		lang = "fa"
		segments = segments[1:]
	} else if len(segments) > 0 && strings.EqualFold(segments[0], "en") {
		lang = "en"
		segments = segments[1:]
	}

	if len(segments) == 0 {
		return renderHomeMarkdown(lang)
	}

	first := strings.ToLower(segments[0])
	rest := ""
	if len(segments) > 1 {
		rest = strings.Join(segments[1:], "/")
	}

	switch first {
	case "country", "countries", "country-ips":
		if rest != "" {
			return renderCountryMarkdown(rest, lang)
		}
		return renderCountryListMarkdown(lang)

	case "batch", "batch-inspector":
		return renderBatchMarkdown(lang)

	case "subnet-calc", "subnet", "calculator":
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
			return renderSubnetCalcWithQueryMarkdown(query, lang)
		}
		return renderSubnetCalcGuideMarkdown(lang)

	case "source", "about":
		return renderSourceMarkdown(lang)

	case "issues", "bugs":
		return renderIssuesMarkdown(lang)

	case "lookup", "ip", "asn", "prefix":
		query := rest
		if query == "" {
			query = c.Query("q")
		}
		if query != "" {
			return renderLookupMarkdown(query, lang)
		}
		return renderLookupGuideMarkdown(lang)

	default:
		// Check if first segment is directly an IP or ASN (e.g. /1.1.1.1 or /AS13335)
		if isAsnQuery(first) || strings.Contains(first, ".") || strings.Contains(first, ":") {
			return renderLookupMarkdown(first, lang)
		}
		return renderHomeMarkdown(lang)
	}
}

// 1. Home / Platform Overview Markdown
func renderHomeMarkdown(lang string) string {
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
- **بررسی دسته‌ای هویز (Batch)**: [https://ip-hub.ir/fa/batch](https://ip-hub.ir/fa/batch)
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
image: https://ip-hub.ir/img/logo.webp
---

# IP-Hub Network Intelligence Platform

> IP-Hub (https://ip-hub.ir/) is a high-performance network intelligence platform and country-level IP delegation directory. It provides real-time country IPv4 & IPv6 CIDR downloads, firewall rule generators (MikroTik RouterOS, Cisco ACL, FreeBSD Packet Filter, Linux ipset, Apache .htaccess, Nginx), live RIPE WHOIS inspection, Autonomous System (ASN) BGP routing analytics, multi-target batch auditing, and CIDR subnet calculation.

## Core Navigation & Tools

- **Country IP Explorer**: [https://ip-hub.ir/country-ips](https://ip-hub.ir/country-ips) or by ISO code such as [https://ip-hub.ir/country/IR](https://ip-hub.ir/country/IR), [https://ip-hub.ir/country/DE](https://ip-hub.ir/country/DE), [https://ip-hub.ir/country/US](https://ip-hub.ir/country/US).
- **Single WHOIS & ASN Lookup**: [https://ip-hub.ir/lookup](https://ip-hub.ir/lookup) (supports IPv4, IPv6, CIDR blocks, and ASNs like ` + "`/lookup/1.1.1.1`" + ` or ` + "`/lookup/AS13335`" + `).
- **Batch WHOIS Inspector**: [https://ip-hub.ir/batch](https://ip-hub.ir/batch) (concurrent lookup of up to 50 mixed targets).
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

// 2. Single Lookup Markdown (IP, CIDR, or ASN)
func renderLookupMarkdown(rawQuery, lang string) string {
	query := strings.TrimSpace(rawQuery)
	if decoded, err := url.PathUnescape(query); err == nil && decoded != "" {
		query = decoded
	}

	if query == "" {
		return renderLookupGuideMarkdown(lang)
	}

	if isAsnQuery(query) {
		record, err := executeAsnLookup(query)
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
		displayLimit := 25
		if count < displayLimit {
			displayLimit = count
		}
		for i := 0; i < displayLimit; i++ {
			fmt.Fprintf(&prefixList, "- `%s`\n", record.Prefixes[i])
		}
		if count > displayLimit {
			fmt.Fprintf(&prefixList, "- *... and %d more prefixes*\n", count-displayLimit)
		}

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

`+"```json\n"+`{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "%s",
  "description": "BGP routing and WHOIS data for %s"
}`+"\n```",
			record.Asn, record.Holder, record.Asn,
			record.Asn,
			record.Asn, record.Holder, record.OrgName, record.Country, record.CountryCode,
			statusStr, record.AnnouncedPrefixesCount, abuseEmail,
			count, prefixList.String(),
			record.RawWhoisText,
			record.Asn, record.Asn,
		)
	}

	// IP Lookup
	record, err := executeIpLookup(query)
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

`+"```json\n"+`{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "IP Intelligence for %s",
  "description": "Network registration, BGP routing, and WHOIS records for %s"
}`+"\n```",
		record.Query, record.Query,
		record.Query,
		record.Query, record.Netname, record.CIDR, record.Range, record.OrgName,
		record.Country, record.CountryCode, record.Status, record.ReverseDNS,
		routedStr, originAsn, record.Routing.AnnouncedPrefix, visStr,
		abuseEmail, record.AbuseContact.OrgName,
		subnetMd,
		record.RawWhoisText,
		record.Query, record.Query,
	)
}

// 3. Lookup Guide Markdown
func renderLookupGuideMarkdown(lang string) string {
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

// 4. Country IP Delegations Markdown
func renderCountryMarkdown(rawCode, lang string) string {
	code := strings.ToUpper(strings.TrimSpace(rawCode))
	if strings.HasSuffix(code, ".MD") {
		code = strings.TrimSuffix(code, ".MD")
	}

	res, err := executeCountryLookup(code)
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

	var ipv4Sample strings.Builder
	v4Display := 20
	if len(res.IPv4) < v4Display {
		v4Display = len(res.IPv4)
	}
	for i := 0; i < v4Display; i++ {
		fmt.Fprintf(&ipv4Sample, "- `%s`\n", res.IPv4[i])
	}
	if len(res.IPv4) > v4Display {
		fmt.Fprintf(&ipv4Sample, "- *... and %d more IPv4 prefixes*\n", len(res.IPv4)-v4Display)
	}

	var ipv6Sample strings.Builder
	v6Display := 20
	if len(res.IPv6) < v6Display {
		v6Display = len(res.IPv6)
	}
	for i := 0; i < v6Display; i++ {
		fmt.Fprintf(&ipv6Sample, "- `%s`\n", res.IPv6[i])
	}
	if len(res.IPv6) > v6Display {
		fmt.Fprintf(&ipv6Sample, "- *... and %d more IPv6 prefixes*\n", len(res.IPv6)-v6Display)
	}

	// Generate sample firewall scripts
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
`+"```\n\n"+` `+"```json\n"+`{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "%s IP Delegations",
  "description": "IPv4 and IPv6 delegated network blocks for %s (%s)"
}`+"\n```",
		res.CountryName, res.CountryCode, res.CountryName, res.CountryCode,
		res.CountryName, res.CountryCode, res.CountryName, res.CountryCode,
		res.CountryCode, res.CountryName, res.IPv4Count, res.IPv6Count, res.AsnCount, res.TotalEstimatedIPv4Addresses, res.QueryTime,
		mikrotikExample, ciscoExample, pfExample, ipsetExample,
		res.IPv4Count, ipv4Sample.String(),
		res.IPv6Count, ipv6Sample.String(),
		res.CountryCode,
		res.CountryName, res.CountryName, res.CountryCode,
	)
}

func getFirstPrefixOrFallback(list []string, fallback string) string {
	if len(list) > 0 {
		return list[0]
	}
	return fallback
}

// 5. Country Directory List Markdown
func renderCountryListMarkdown(lang string) string {
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

// 6. Batch Inspector Markdown
func renderBatchMarkdown(lang string) string {
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

// 7. Subnet Calculator with Query Markdown
func renderSubnetCalcWithQueryMarkdown(query, lang string) string {
	trimmed := strings.TrimSpace(query)
	res := computeSubnet(trimmed, nil)
	if res == nil {
		return renderSubnetCalcGuideMarkdown(lang)
	}

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
`+"```\n",
		res.CIDR, res.CIDR,
		res.CIDR,
		res.CIDR, res.IPVersion, res.PrefixLength, res.NetworkAddress,
		res.Netmask, res.WildcardMask, res.BroadcastAddress,
		res.FirstUsableIP, res.LastUsableIP, res.UsableHosts, res.TotalHosts,
		res.BinaryIP,
		url.QueryEscape(res.CIDR),
	)
}

// 8. Subnet Calculator Guide Markdown
func renderSubnetCalcGuideMarkdown(lang string) string {
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

// 9. Source & Architecture Markdown
func renderSourceMarkdown(lang string) string {
	return fmt.Sprintf(`---
title: Source Code & Architecture - IP-Hub
description: Open-source network intelligence platform architecture, Go Fiber v3 backend, React 19 frontend, Redis caching, and deployment instructions.
---

# Technical Architecture & Source Code

IP-Hub is built with performance and security at its core.

## System Components

- **Backend Framework**: Go (%s) with Fiber v3 (`+"`github.com/gofiber/fiber/v3`"+`).
- **Caching Layer**: Redis with daily end-of-day TTL and atomic key management.
- **Frontend**: React 19 SPA with Vite, Tailwind CSS, and Lucide icons.
- **Data Upstreams**: RIPE NCC REST API, RIPE Stat RIS peer routing analytics, and RDAP endpoints.
- **Content Negotiation**: Cloudflare **Markdown for Agents** compliance (`+"`Accept: text/markdown`"+`).

## Open Source Repository

- **GitHub**: [https://github.com/kzeedev/IP-Hub](https://github.com/kzeedev/IP-Hub)
`, config.Version)
}

// 10. Issues & Community Support Markdown
func renderIssuesMarkdown(lang string) string {
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
