package test

import (
	"testing"

	"github.com/kzeedev/IP-Hub/database"
	"github.com/kzeedev/IP-Hub/handler"
)

// TestSecurityAsnValidation verifies ASN query edge cases and boundary validation.
func TestSecurityAsnValidation(t *testing.T) {
	validASNs := []string{
		"AS15169",
		"15169",
		"AS1",
		"1",
		"4294967295",
		"AS4294967295",
		"as13335",
	}

	for _, asn := range validASNs {
		if !handler.IsAsnQuery(asn) {
			t.Errorf("Expected IsAsnQuery(%q) to be true, got false", asn)
		}
	}

	invalidASNs := []string{
		"AS-1",
		"-1",
		"AS0",
		"0",
		"AS",
		"AS99999999999999",
		"ASabc",
		"1.1.1.1",
		"8.8.8.8/24",
		"",
		"   ",
		"AS 123",
	}

	for _, asn := range invalidASNs {
		if handler.IsAsnQuery(asn) {
			t.Errorf("Expected IsAsnQuery(%q) to be false, got true", asn)
		}
	}
}

// TestSanitizeKey verifies cache key sanitization and length restriction against injection attacks.
func TestSanitizeKey(t *testing.T) {
	dirty := "country:US\r\nSET malicious_key 1\n"
	sanitized := database.SanitizeKey(dirty)
	if sanitized != "country:USSETmalicious_key1" {
		t.Errorf("Unexpected sanitized key output: %q", sanitized)
	}

	longKey := "prefix_org_"
	for i := 0; i < 200; i++ {
		longKey += "x"
	}
	if len(database.SanitizeKey(longKey)) > 128 {
		t.Errorf("Expected sanitized key length <= 128, got %d", len(database.SanitizeKey(longKey)))
	}
}

// TestSecuritySubnetValidation verifies subnet computation handles invalid formats safely without panicking.
func TestSecuritySubnetValidation(t *testing.T) {
	res := handler.ComputeSubnet("invalid-ip", nil)
	if res != nil {
		t.Errorf("Expected nil for invalid IP string, got %+v", res)
	}

	valid := handler.ComputeSubnet("192.168.1.1/24", nil)
	if valid == nil || valid.NetworkAddress != "192.168.1.0" {
		t.Errorf("Expected subnet computation to succeed, got %+v", valid)
	}
}
