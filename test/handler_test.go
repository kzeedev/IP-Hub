package test

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/kzeedev/IP-Hub/handler"
	"github.com/kzeedev/IP-Hub/models"
	"github.com/kzeedev/IP-Hub/pluginBase"
)

// MockWhoisService implements handler.WhoisService for testing.
type MockWhoisService struct {
	LookupIPFunc        func(query string) (*models.WhoisRecord, error)
	ResolveClientIPFunc func(clientIP string) string
	LookupASNFunc       func(query string) (*models.AsnRecord, error)
	IsAsnQueryFunc      func(q string) bool
	LookupCountryFunc   func(code string) (*models.CountryIpResource, error)
	ResolveOrgsFunc     func(asns []interface{}, prefixes []string) map[string]string
	ComputeSubnetFunc   func(input string, customCidr *int) *models.SubnetBreakdown
	BatchLookupFunc     func(items []string) []models.BatchItemResult
	FormatCountryFunc       func(resource *models.CountryIpResource, format, version, access, listName string) *models.FormatResult
	GetAvailablePluginsFunc func() []models.PluginInfo
}

func (m *MockWhoisService) LookupIP(query string) (*models.WhoisRecord, error) {
	if m.LookupIPFunc != nil {
		return m.LookupIPFunc(query)
	}
	return &models.WhoisRecord{Query: query, Netname: "MOCK-NET"}, nil
}

func (m *MockWhoisService) ResolveClientIP(clientIP string) string {
	if m.ResolveClientIPFunc != nil {
		return m.ResolveClientIPFunc(clientIP)
	}
	return clientIP
}

func (m *MockWhoisService) LookupASN(query string) (*models.AsnRecord, error) {
	if m.LookupASNFunc != nil {
		return m.LookupASNFunc(query)
	}
	return &models.AsnRecord{Asn: query, Holder: "Mock ASN Holder"}, nil
}

func (m *MockWhoisService) IsAsnQuery(q string) bool {
	if m.IsAsnQueryFunc != nil {
		return m.IsAsnQueryFunc(q)
	}
	return handler.IsAsnQuery(q)
}

func (m *MockWhoisService) LookupCountry(code string) (*models.CountryIpResource, error) {
	if m.LookupCountryFunc != nil {
		return m.LookupCountryFunc(code)
	}
	return &models.CountryIpResource{CountryCode: code, CountryName: "Mockland"}, nil
}

func (m *MockWhoisService) ResolveOrgs(asns []interface{}, prefixes []string) map[string]string {
	if m.ResolveOrgsFunc != nil {
		return m.ResolveOrgsFunc(asns, prefixes)
	}
	return map[string]string{"AS13335": "Cloudflare"}
}

func (m *MockWhoisService) ComputeSubnet(input string, customCidr *int) *models.SubnetBreakdown {
	if m.ComputeSubnetFunc != nil {
		return m.ComputeSubnetFunc(input, customCidr)
	}
	return handler.ComputeSubnet(input, customCidr)
}

func (m *MockWhoisService) BatchLookup(items []string) []models.BatchItemResult {
	if m.BatchLookupFunc != nil {
		return m.BatchLookupFunc(items)
	}
	res := make([]models.BatchItemResult, len(items))
	for i, item := range items {
		res[i] = models.BatchItemResult{Query: item, Status: "success"}
	}
	return res
}

func (m *MockWhoisService) FormatCountry(resource *models.CountryIpResource, format, version, access, listName string) *models.FormatResult {
	if m.FormatCountryFunc != nil {
		return m.FormatCountryFunc(resource, format, version, access, listName)
	}
	return &models.FormatResult{
		Text:      "mock formatted text",
		Filename:  "mock.txt",
		RuleCount: 10,
	}
}

func (m *MockWhoisService) GetAvailablePlugins() []models.PluginInfo {
	if m.GetAvailablePluginsFunc != nil {
		return m.GetAvailablePluginsFunc()
	}
	return []models.PluginInfo{
		{ID: "mikrotik", Name: "Mikrotik address-list"},
		{ID: "json", Name: "JSON Data"},
		{ID: "htaccess", Name: "Apache .htaccess"},
	}
}

func TestNewHandlerDependencyInjection(t *testing.T) {
	mockSvc := &MockWhoisService{}
	h := handler.New(mockSvc)
	if h.Service() != mockSvc {
		t.Fatalf("Expected injected mock service, got different service instance")
	}

	hDefault := handler.New(nil)
	if hDefault.Service() == nil {
		t.Fatalf("Expected default service when nil is passed to New, got nil")
	}
}

func TestIsAsnQuery(t *testing.T) {
	valid := []string{"AS15169", "15169", "AS1", "1", "4294967295", "AS4294967295", "as13335"}
	for _, q := range valid {
		if !handler.IsAsnQuery(q) {
			t.Errorf("Expected IsAsnQuery(%q) to be true", q)
		}
	}

	invalid := []string{"AS0", "0", "-1", "AS-1", "AS", "ASabc", "1.1.1.1", "AS99999999999999", "", "  "}
	for _, q := range invalid {
		if handler.IsAsnQuery(q) {
			t.Errorf("Expected IsAsnQuery(%q) to be false", q)
		}
	}
}

func TestComputeSubnet(t *testing.T) {
	// IPv4 /24
	res := handler.ComputeSubnet("192.168.1.50/24", nil)
	if res == nil {
		t.Fatalf("Expected valid subnet result, got nil")
	}
	if res.NetworkAddress != "192.168.1.0" {
		t.Errorf("Expected network address 192.168.1.0, got %s", res.NetworkAddress)
	}
	if res.BroadcastAddress != "192.168.1.255" {
		t.Errorf("Expected broadcast address 192.168.1.255, got %s", res.BroadcastAddress)
	}
	if res.FirstUsableIP != "192.168.1.1" || res.LastUsableIP != "192.168.1.254" {
		t.Errorf("Expected usable range 192.168.1.1 - 192.168.1.254, got %s - %s", res.FirstUsableIP, res.LastUsableIP)
	}
	if res.UsableHosts != "254" {
		t.Errorf("Expected 254 usable hosts, got %s", res.UsableHosts)
	}

	// IPv4 /31 (Point-to-point)
	res31 := handler.ComputeSubnet("10.0.0.0/31", nil)
	if res31 == nil || res31.UsableHosts != "2" {
		t.Errorf("Expected /31 to have 2 usable hosts, got %+v", res31)
	}

	// IPv4 /32 (Single host)
	res32 := handler.ComputeSubnet("10.0.0.1/32", nil)
	if res32 == nil || res32.UsableHosts != "1" {
		t.Errorf("Expected /32 to have 1 usable host, got %+v", res32)
	}

	// IPv6 /64
	res6 := handler.ComputeSubnet("2001:db8::1/64", nil)
	if res6 == nil || res6.IPVersion != 6 {
		t.Errorf("Expected valid IPv6 breakdown, got %+v", res6)
	}

	// Invalid input
	if invalid := handler.ComputeSubnet("not-an-ip", nil); invalid != nil {
		t.Errorf("Expected nil for invalid input, got %+v", invalid)
	}
}

func TestMarkdownNegotiation(t *testing.T) {
	app := fiber.New()
	mockSvc := &MockWhoisService{}
	h := handler.New(mockSvc)

	app.Use(h.MarkdownNegotiationMiddleware())
	app.Get("/country/IR", func(c fiber.Ctx) error {
		return c.SendString("<html>HTML version</html>")
	})

	// Test standard HTML request without markdown header
	reqHTML := httptest.NewRequest(http.MethodGet, "/country/IR", nil)
	reqHTML.Header.Set("Accept", "text/html,application/xhtml+xml")
	respHTML, err := app.Test(reqHTML)
	if err != nil {
		t.Fatalf("HTML test failed: %v", err)
	}
	bodyHTML, _ := io.ReadAll(respHTML.Body)
	if !strings.Contains(string(bodyHTML), "HTML version") {
		t.Errorf("Expected HTML response for standard request, got %s", string(bodyHTML))
	}

	// Test Markdown for Agents request
	reqMD := httptest.NewRequest(http.MethodGet, "/country/IR", nil)
	reqMD.Header.Set("Accept", "text/markdown")
	respMD, err := app.Test(reqMD)
	if err != nil {
		t.Fatalf("MD test failed: %v", err)
	}
	if ct := respMD.Header.Get("Content-Type"); !strings.Contains(ct, "text/markdown") {
		t.Errorf("Expected Content-Type text/markdown, got %s", ct)
	}
	if cs := respMD.Header.Get("Content-Signal"); cs != handler.ContentSignalHeaderValue {
		t.Errorf("Expected Content-Signal header, got %s", cs)
	}
	bodyMD, _ := io.ReadAll(respMD.Body)
	if !strings.Contains(string(bodyMD), "Delegated IP Ranges & Firewall Rules") {
		t.Errorf("Expected Markdown content for country, got %s", string(bodyMD))
	}
}

func TestOpenAPIRoutes(t *testing.T) {
	app := fiber.New()
	mockSvc := &MockWhoisService{}
	h := handler.New(mockSvc)
	h.SetupOpenAPI(app)

	// Test RFC 9727 API Catalog
	reqCatalog := httptest.NewRequest(http.MethodGet, "/.well-known/api-catalog", nil)
	respCatalog, err := app.Test(reqCatalog)
	if err != nil {
		t.Fatalf("Catalog request failed: %v", err)
	}
	if respCatalog.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", respCatalog.StatusCode)
	}
	if ct := respCatalog.Header.Get("Content-Type"); ct != "application/linkset+json" {
		t.Errorf("Expected Content-Type application/linkset+json, got %s", ct)
	}

	// Test Subnet API endpoint
	reqSubnet := httptest.NewRequest(http.MethodGet, "/api/whois/subnet?ip=192.168.1.0&cidr=24", nil)
	respSubnet, err := app.Test(reqSubnet)
	if err != nil {
		t.Fatalf("Subnet request failed: %v", err)
	}
	if respSubnet.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", respSubnet.StatusCode)
	}

	var subnetResult struct {
		Data *models.SubnetBreakdown `json:"data"`
	}
	bodySubnet, _ := io.ReadAll(respSubnet.Body)
	if err := json.Unmarshal(bodySubnet, &subnetResult); err != nil {
		t.Fatalf("Failed to parse subnet response JSON: %v", err)
	}
	if subnetResult.Data == nil || subnetResult.Data.NetworkAddress != "192.168.1.0" {
		t.Errorf("Expected network address 192.168.1.0, got %+v", subnetResult.Data)
	}
}

func TestServerSidePlugins(t *testing.T) {
	app := fiber.New()
	mockSvc := &MockWhoisService{}
	h := handler.New(mockSvc)
	h.SetupOpenAPI(app)

	// Test Country query with complete format parameters
	reqCountry := httptest.NewRequest(http.MethodPost, "/api/whois/country", strings.NewReader(`{"code":"IR","format":"mikrotik","version":"any","access":"allow","listName":"IR"}`))
	reqCountry.Header.Set("Content-Type", "application/json")
	respCountry, err := app.Test(reqCountry)
	if err != nil {
		t.Fatalf("Country request failed: %v", err)
	}
	if respCountry.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", respCountry.StatusCode)
	}

	var countryRes struct {
		Data   *models.CountryIpResource `json:"data"`
		Result *models.FormatResult      `json:"result"`
	}
	bodyCountry, _ := io.ReadAll(respCountry.Body)
	if err := json.Unmarshal(bodyCountry, &countryRes); err != nil {
		t.Fatalf("Failed to parse country response JSON: %v", err)
	}
	if countryRes.Data == nil || countryRes.Data.CountryCode != "IR" {
		t.Errorf("Expected country data for IR, got %+v", countryRes.Data)
	}
	if countryRes.Result == nil || countryRes.Result.Text == "" {
		t.Errorf("Expected non-empty formatted result from server, got %+v", countryRes.Result)
	}

	// Test Country endpoint with custom format options
	reqFormat := httptest.NewRequest(http.MethodPost, "/api/whois/country", strings.NewReader(`{"code":"IR","format":"cisco","version":"ipv4","access":"deny","listName":"IR_BLOCK"}`))
	reqFormat.Header.Set("Content-Type", "application/json")
	respFormat, err := app.Test(reqFormat)
	if err != nil {
		t.Fatalf("Format request failed: %v", err)
	}
	if respFormat.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", respFormat.StatusCode)
	}

	var formatRes struct {
		Data   *models.CountryIpResource `json:"data"`
		Result *models.FormatResult      `json:"result"`
	}
	bodyFormat, _ := io.ReadAll(respFormat.Body)
	if err := json.Unmarshal(bodyFormat, &formatRes); err != nil {
		t.Fatalf("Failed to parse format response JSON: %v", err)
	}
	if formatRes.Result == nil || formatRes.Result.Text == "" {
		t.Errorf("Expected non-empty format result, got %+v", formatRes.Result)
	}

	// Test validation: empty fields should return 400 Bad Request
	invalidBodies := []string{
		`{"code":"","format":"mikrotik","version":"any","access":"allow","listName":"IR"}`,
		`{"code":"IR","format":"","version":"any","access":"allow","listName":"IR"}`,
		`{"code":"IR","format":"mikrotik","version":"","access":"allow","listName":"IR"}`,
		`{"code":"IR","format":"mikrotik","version":"any","access":"","listName":"IR"}`,
		`{"code":"IR","format":"mikrotik","version":"any","access":"allow","listName":""}`,
		`{"code":"IR"}`,
	}
	for _, body := range invalidBodies {
		reqInv := httptest.NewRequest(http.MethodPost, "/api/whois/country", strings.NewReader(body))
		reqInv.Header.Set("Content-Type", "application/json")
		respInv, err := app.Test(reqInv)
		if err != nil {
			t.Fatalf("Request failed: %v", err)
		}
		if respInv.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected status 400 for body %s, got %d", body, respInv.StatusCode)
		}
	}
}

type mockPlugin struct {
	*pluginBase.BasePlugin
}

func newMockPlugin(id, name string) *mockPlugin {
	return &mockPlugin{
		BasePlugin: pluginBase.NewBasePlugin(id, name),
	}
}

func (m *mockPlugin) Format(data pluginBase.Lookup, ipVersion pluginBase.IPVersion, access bool) string {
	return fmt.Sprintf("rules for %s format=%s version=%s access=%v", data.CountryCode, m.GetID(), ipVersion, access)
}

func TestBuiltinPluginFormatting(t *testing.T) {
	handler.SetPlugins([]pluginBase.Plugin{
		newMockPlugin("mikrotik", "Mikrotik"),
		newMockPlugin("cisco", "Cisco"),
		newMockPlugin("freebsd-pf", "FreeBSD PF"),
		newMockPlugin("ipset", "Linux IPSet"),
	})

	svc := handler.NewWhoisService()
	res := &models.CountryIpResource{
		CountryCode: "IR",
		CountryName: "Iran",
		IPv4:        []string{"5.10.128.0/17", "37.152.160.0/19"},
		IPv6:        []string{"2a01:5ec0::/32"},
		QueryTime:   "2026-10-10 10:00:00",
	}

	formats := []struct {
		format      string
		expectedSub string
	}{
		{"mikrotik", "rules for IR format=mikrotik"},
		{"cisco", "rules for IR format=cisco"},
		{"pf", "rules for IR format=freebsd-pf"},
		{"freebsd-pf", "rules for IR format=freebsd-pf"},
		{"ipset", "rules for IR format=ipset"},
		{"htaccess", "Allow from 5.10.128.0/17"},
		{"json", `"CountryCode": "IR"`},
	}

	for _, tc := range formats {
		out := svc.FormatCountry(res, tc.format, "any", "allow", "")
		if out == nil {
			t.Fatalf("Format %s returned nil", tc.format)
		}
		if out.RuleCount != 3 {
			t.Errorf("Format %s: expected rule count 3, got %d", tc.format, out.RuleCount)
		}
		if !strings.Contains(out.Text, tc.expectedSub) {
			t.Errorf("Format %s: expected output containing %q, got: %s", tc.format, tc.expectedSub, out.Text)
		}
	}
}

func TestPluginsEndpoint(t *testing.T) {
	app := fiber.New()
	mockSvc := &MockWhoisService{}
	h := handler.New(mockSvc)
	h.SetupOpenAPI(app)

	req := httptest.NewRequest(http.MethodGet, "/api/system/plugins", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Plugins request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var res struct {
		Plugins []models.PluginInfo `json:"plugins"`
	}
	body, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(body, &res); err != nil {
		t.Fatalf("Failed to parse plugins response JSON: %v", err)
	}
	if len(res.Plugins) != 3 {
		t.Errorf("Expected 3 plugins, got %d", len(res.Plugins))
	}
	if res.Plugins[0].ID != "mikrotik" {
		t.Errorf("Expected first plugin ID mikrotik, got %s", res.Plugins[0].ID)
	}
}

func TestVersionEndpoint(t *testing.T) {
	app := fiber.New()
	mockSvc := &MockWhoisService{}
	h := handler.New(mockSvc)
	h.SetupOpenAPI(app)

	req := httptest.NewRequest(http.MethodGet, "/api/system/version", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Version request failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var res struct {
		Version string `json:"version"`
	}
	body, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(body, &res); err != nil {
		t.Fatalf("Failed to parse version response JSON: %v", err)
	}
	if res.Version == "" {
		t.Errorf("Expected non-empty version, got empty string")
	}
	if !strings.HasPrefix(res.Version, "v") && res.Version != "dev" {
		t.Errorf("Expected version to start with 'v' or be 'dev', got %s", res.Version)
	}
}

func TestGetAvailablePluginsRealService(t *testing.T) {
	handler.SetPlugins([]pluginBase.Plugin{
		newMockPlugin("mikrotik", "Mikrotik address-list"),
		newMockPlugin("cisco", "Cisco access-list"),
	})

	svc := handler.NewWhoisService()
	pluginsList := svc.GetAvailablePlugins()

	// Should contain loaded plugins + built-ins (json, htaccess)
	if len(pluginsList) != 4 {
		t.Errorf("Expected 4 plugins, got %d: %+v", len(pluginsList), pluginsList)
	}

	hasJSON := false
	hasHtaccess := false
	for _, p := range pluginsList {
		if p.ID == "json" {
			hasJSON = true
		}
		if p.ID == "htaccess" {
			hasHtaccess = true
		}
	}
	if !hasJSON || !hasHtaccess {
		t.Errorf("Expected json and htaccess in available plugins, got %+v", pluginsList)
	}
}
