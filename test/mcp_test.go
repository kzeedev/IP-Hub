package test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/kzeedev/IP-Hub/handler"
	"github.com/kzeedev/IP-Hub/models"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func setupMCPTestSession(t *testing.T, svc handler.WhoisService) (*mcp.ClientSession, func()) {
	t.Helper()
	h := handler.New(svc)
	server := h.NewMCPServer()

	clientTransport, serverTransport := mcp.NewInMemoryTransports()
	ctx := context.Background()

	serverSession, err := server.Connect(ctx, serverTransport, nil)
	if err != nil {
		t.Fatalf("Failed to connect MCP server: %v", err)
	}

	client := mcp.NewClient(&mcp.Implementation{
		Name:    "test-mcp-client",
		Version: "v1.0.0",
	}, nil)

	clientSession, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		t.Fatalf("Failed to connect MCP client: %v", err)
	}

	cleanup := func() {
		_ = clientSession.Close()
		_ = serverSession.Close()
	}

	return clientSession, cleanup
}

func TestMCPTools(t *testing.T) {
	mockSvc := &MockWhoisService{
		LookupIPFunc: func(query string) (*models.WhoisRecord, error) {
			return &models.WhoisRecord{
				Query:       query,
				Netname:     "RIPE-NCC",
				CountryCode: "NL",
			}, nil
		},
		LookupASNFunc: func(query string) (*models.AsnRecord, error) {
			return &models.AsnRecord{
				Asn:         "AS3333",
				AsnNumber:   3333,
				Holder:      "RIPE-NCC-AS",
				CountryCode: "NL",
			}, nil
		},
		LookupCountryFunc: func(code string) (*models.CountryIpResource, error) {
			return &models.CountryIpResource{
				CountryCode: code,
				CountryName: "Iran",
				IPv4Count:   2,
				IPv4:        []string{"2.144.0.0/14", "5.52.0.0/16"},
			}, nil
		},
	}

	session, cleanup := setupMCPTestSession(t, mockSvc)
	defer cleanup()

	ctx := context.Background()

	// 1. Verify ListTools returns all 6 registered tools
	toolsRes, err := session.ListTools(ctx, nil)
	if err != nil {
		t.Fatalf("ListTools failed: %v", err)
	}
	expectedTools := map[string]bool{
		"whois_lookup":      false,
		"whois_batch":       false,
		"country_resources": false,
		"subnet_calculator": false,
		"system_status":     false,
		"list_plugins":      false,
	}
	for _, tool := range toolsRes.Tools {
		if _, exists := expectedTools[tool.Name]; exists {
			expectedTools[tool.Name] = true
		}
	}
	for name, found := range expectedTools {
		if !found {
			t.Errorf("Expected MCP tool %q to be registered", name)
		}
	}

	// 2. Call whois_lookup for IP
	ipRes, err := session.CallTool(ctx, &mcp.CallToolParams{
		Name:      "whois_lookup",
		Arguments: map[string]any{"query": "193.0.6.139"},
	})
	if err != nil {
		t.Fatalf("CallTool whois_lookup (IP) failed: %v", err)
	}
	if ipRes.IsError || len(ipRes.Content) == 0 {
		t.Fatalf("Unexpected error or empty content from whois_lookup (IP)")
	}
	ipText := ipRes.Content[0].(*mcp.TextContent).Text
	if !strings.Contains(ipText, "RIPE-NCC") {
		t.Errorf("Expected whois_lookup response to contain RIPE-NCC, got: %s", ipText)
	}

	// 3. Call whois_lookup for ASN
	asnRes, err := session.CallTool(ctx, &mcp.CallToolParams{
		Name:      "whois_lookup",
		Arguments: map[string]any{"query": "AS3333"},
	})
	if err != nil {
		t.Fatalf("CallTool whois_lookup (ASN) failed: %v", err)
	}
	asnText := asnRes.Content[0].(*mcp.TextContent).Text
	if !strings.Contains(asnText, "RIPE-NCC-AS") {
		t.Errorf("Expected whois_lookup ASN response to contain RIPE-NCC-AS, got: %s", asnText)
	}

	// 4. Call whois_batch
	batchRes, err := session.CallTool(ctx, &mcp.CallToolParams{
		Name:      "whois_batch",
		Arguments: map[string]any{"items": []string{"8.8.8.8", "1.1.1.1"}},
	})
	if err != nil {
		t.Fatalf("CallTool whois_batch failed: %v", err)
	}
	batchText := batchRes.Content[0].(*mcp.TextContent).Text
	if !strings.Contains(batchText, "8.8.8.8") || !strings.Contains(batchText, "1.1.1.1") {
		t.Errorf("Expected whois_batch output to include queried IPs, got: %s", batchText)
	}

	// 5. Call country_resources with format
	countryRes, err := session.CallTool(ctx, &mcp.CallToolParams{
		Name: "country_resources",
		Arguments: map[string]any{
			"code":   "IR",
			"format": "mikrotik",
		},
	})
	if err != nil {
		t.Fatalf("CallTool country_resources failed: %v", err)
	}
	countryText := countryRes.Content[0].(*mcp.TextContent).Text
	if !strings.Contains(countryText, "2.144.0.0/14") || !strings.Contains(countryText, "mock formatted text") {
		t.Errorf("Expected country_resources output to contain prefixes and formatted rules, got: %s", countryText)
	}

	// 6. Call subnet_calculator
	subnetRes, err := session.CallTool(ctx, &mcp.CallToolParams{
		Name:      "subnet_calculator",
		Arguments: map[string]any{"ip": "192.168.1.0/24"},
	})
	if err != nil {
		t.Fatalf("CallTool subnet_calculator failed: %v", err)
	}
	subnetText := subnetRes.Content[0].(*mcp.TextContent).Text
	if !strings.Contains(subnetText, "192.168.1.255") {
		t.Errorf("Expected subnet_calculator output to contain broadcast address 192.168.1.255, got: %s", subnetText)
	}

	// 7. Call system_status & list_plugins
	statusRes, err := session.CallTool(ctx, &mcp.CallToolParams{
		Name: "system_status",
	})
	if err != nil || statusRes.IsError {
		t.Fatalf("CallTool system_status failed: %v", err)
	}

	pluginsRes, err := session.CallTool(ctx, &mcp.CallToolParams{
		Name: "list_plugins",
	})
	if err != nil || pluginsRes.IsError {
		t.Fatalf("CallTool list_plugins failed: %v", err)
	}
	pluginsText := pluginsRes.Content[0].(*mcp.TextContent).Text
	if !strings.Contains(pluginsText, "mikrotik") {
		t.Errorf("Expected list_plugins output to include mikrotik, got: %s", pluginsText)
	}
}

func TestMCPResourcesAndTemplates(t *testing.T) {
	mockSvc := &MockWhoisService{}
	session, cleanup := setupMCPTestSession(t, mockSvc)
	defer cleanup()

	ctx := context.Background()

	// 1. List static resources
	resList, err := session.ListResources(ctx, nil)
	if err != nil {
		t.Fatalf("ListResources failed: %v", err)
	}
	if len(resList.Resources) < 3 {
		t.Fatalf("Expected at least 3 static resources, got %d", len(resList.Resources))
	}

	// 2. List resource templates
	tplList, err := session.ListResourceTemplates(ctx, nil)
	if err != nil {
		t.Fatalf("ListResourceTemplates failed: %v", err)
	}
	if len(tplList.ResourceTemplates) < 2 {
		t.Fatalf("Expected at least 2 resource templates, got %d", len(tplList.ResourceTemplates))
	}

	// 3. Read static resource: iphub://system/status
	sysStatus, err := session.ReadResource(ctx, &mcp.ReadResourceParams{
		URI: "iphub://system/status",
	})
	if err != nil {
		t.Fatalf("ReadResource iphub://system/status failed: %v", err)
	}
	if len(sysStatus.Contents) == 0 || !strings.Contains(sysStatus.Contents[0].Text, "reachable") {
		t.Errorf("Unexpected content for iphub://system/status: %+v", sysStatus.Contents)
	}

	// 4. Read dynamic resource template: iphub://country/IR
	countryRes, err := session.ReadResource(ctx, &mcp.ReadResourceParams{
		URI: "iphub://country/IR",
	})
	if err != nil {
		t.Fatalf("ReadResource iphub://country/IR failed: %v", err)
	}
	if len(countryRes.Contents) == 0 || !strings.Contains(countryRes.Contents[0].Text, "Mockland") {
		t.Errorf("Unexpected content for iphub://country/IR: %+v", countryRes.Contents)
	}

	// 5. Read dynamic firewall rule template: iphub://country/IR/rules/mikrotik
	rulesRes, err := session.ReadResource(ctx, &mcp.ReadResourceParams{
		URI: "iphub://country/IR/rules/mikrotik",
	})
	if err != nil {
		t.Fatalf("ReadResource iphub://country/IR/rules/mikrotik failed: %v", err)
	}
	if len(rulesRes.Contents) == 0 || !strings.Contains(rulesRes.Contents[0].Text, "mock formatted text") {
		t.Errorf("Unexpected content for iphub://country/IR/rules/mikrotik: %+v", rulesRes.Contents)
	}
}

func TestMCPPrompts(t *testing.T) {
	mockSvc := &MockWhoisService{}
	session, cleanup := setupMCPTestSession(t, mockSvc)
	defer cleanup()

	ctx := context.Background()

	promptsList, err := session.ListPrompts(ctx, nil)
	if err != nil {
		t.Fatalf("ListPrompts failed: %v", err)
	}
	expectedPrompts := map[string]bool{
		"country_ip_list_fa":               false,
		"generate_country_firewall_config": false,
		"investigate_network_resource":     false,
		"batch_ip_security_triage":         false,
		"asn_bgp_peering_analysis":         false,
		"subnet_planning_assistant":        false,
		"ddos_geoip_mitigation_guide":      false,
	}
	for _, p := range promptsList.Prompts {
		if _, ok := expectedPrompts[p.Name]; ok {
			expectedPrompts[p.Name] = true
		}
	}
	for name, found := range expectedPrompts {
		if !found {
			t.Errorf("Expected MCP prompt %q to be registered", name)
		}
	}

	// Test English prompt with full English country name ("Germany") or ISO code
	promptRes, err := session.GetPrompt(ctx, &mcp.GetPromptParams{
		Name: "generate_country_firewall_config",
		Arguments: map[string]string{
			"country": "Germany",
			"format":  "ipset",
			"policy":  "deny",
		},
	})
	if err != nil {
		t.Fatalf("GetPrompt generate_country_firewall_config failed: %v", err)
	}
	if len(promptRes.Messages) == 0 {
		t.Fatalf("Expected prompt messages, got 0")
	}
	msgText := promptRes.Messages[0].Content.(*mcp.TextContent).Text
	if !strings.Contains(msgText, "Germany IP list for ipset") || !strings.Contains(msgText, `code: "DE"`) {
		t.Errorf("Expected prompt message to resolve Germany -> DE and contain 'Germany IP list for ipset', got: %s", msgText)
	}

	// Test parameterized Persian template with Persian country name ("آلمان"), English country name ("Iran"), and ISO code ("TR")
	faPromptRes, err := session.GetPrompt(ctx, &mcp.GetPromptParams{
		Name: "country_ip_list_fa",
		Arguments: map[string]string{
			"country": "آلمان",
			"format":  "سیسکو",
		},
	})
	if err != nil {
		t.Fatalf("GetPrompt country_ip_list_fa failed: %v", err)
	}
	if len(faPromptRes.Messages) == 0 {
		t.Fatalf("Expected Persian prompt messages, got 0")
	}
	faText := faPromptRes.Messages[0].Content.(*mcp.TextContent).Text
	if !strings.Contains(faText, "لیست IP آلمان برای سیسکو") || !strings.Contains(faText, `"DE"`) || !strings.Contains(faText, `"cisco"`) {
		t.Errorf("Expected Persian prompt to format 'لیست IP آلمان برای سیسکو' and map to DE/cisco, got: %s", faText)
	}

	// Test Persian template when user enters English country name "Iran" or 3-letter ISO code "IRN"
	faFromEnCountryRes, err := session.GetPrompt(ctx, &mcp.GetPromptParams{
		Name: "country_ip_list_fa",
		Arguments: map[string]string{
			"country": "Iran",
			"format":  "میکروتیک",
		},
	})
	if err != nil {
		t.Fatalf("GetPrompt country_ip_list_fa (Iran) failed: %v", err)
	}
	faFromEnText := faFromEnCountryRes.Messages[0].Content.(*mcp.TextContent).Text
	if !strings.Contains(faFromEnText, "لیست IP ایران برای میکروتیک") || !strings.Contains(faFromEnText, `code: "IR"`) || !strings.Contains(faFromEnText, `format: "mikrotik"`) {
		t.Errorf("Expected 'Iran' in Persian prompt to resolve to 'لیست IP ایران برای میکروتیک' and code IR, got: %s", faFromEnText)
	}

	// Test bilingual prompt with lang=fa
	invFaRes, err := session.GetPrompt(ctx, &mcp.GetPromptParams{
		Name: "investigate_network_resource",
		Arguments: map[string]string{
			"target": "193.0.6.139",
			"lang":   "fa",
		},
	})
	if err != nil {
		t.Fatalf("GetPrompt investigate_network_resource (fa) failed: %v", err)
	}
	invFaText := invFaRes.Messages[0].Content.(*mcp.TextContent).Text
	if !strings.Contains(invFaText, "193.0.6.139") || !strings.Contains(invFaText, "مسیریابی BGP") {
		t.Errorf("Expected Persian investigation prompt text, got: %s", invFaText)
	}
}

func TestMCPStreamableHTTPEndpointOnFiber(t *testing.T) {
	app := fiber.New()
	mockSvc := &MockWhoisService{}
	h := handler.New(mockSvc)
	h.SetupMCP(app)

	initPayload := map[string]any{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "initialize",
		"params": map[string]any{
			"protocolVersion": "2025-03-26",
			"capabilities":    map[string]any{},
			"clientInfo": map[string]any{
				"name":    "fiber-http-test",
				"version": "1.0.0",
			},
		},
	}
	bodyBytes, _ := json.Marshal(initPayload)

	req := httptest.NewRequest(http.MethodPost, "/mcp", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Fiber /mcp request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected status 200 OK from /mcp initialize, got %d: %s", resp.StatusCode, string(raw))
	}

	rawBody, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed reading /mcp response body: %v", err)
	}
	if !strings.Contains(string(rawBody), "ip-hub") {
		t.Errorf("Expected /mcp initialize response to contain server info 'ip-hub', got: %s", string(rawBody))
	}

	// Verify browser page refresh on /mcp and /fa/mcp falls through to SPA index.html without 403 Forbidden
	webDistFS := os.DirFS("../web/dist")
	app.Get("*", func(c fiber.Ctx) error {
		return c.SendFile("index.html", fiber.SendFile{
			FS: webDistFS,
		})
	})

	for _, pagePath := range []string{"/mcp", "/fa/mcp"} {
		for i := range 5 {
			pageReq := httptest.NewRequest(http.MethodGet, pagePath, nil)
			pageReq.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
			pageResp, err := app.Test(pageReq)
			if err != nil {
				t.Fatalf("GET %s (iteration %d) failed: %v", pagePath, i, err)
			}
			_ = pageResp.Body.Close()
			if pageResp.StatusCode != http.StatusOK {
				t.Fatalf("Expected status 200 OK on browser refresh GET %s (iteration %d), got %d", pagePath, i, pageResp.StatusCode)
			}
		}
	}
}
