package test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/kzeedev/IP-Hub/handler"
	"github.com/kzeedev/IP-Hub/models"
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
