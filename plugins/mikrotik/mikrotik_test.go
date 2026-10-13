package main

import (
	"strings"
	"testing"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

func TestMikrotikPlugin(t *testing.T) {
	p := NewMikrotikPlugin()

	if p.GetID() != "mikrotik" {
		t.Errorf("Expected ID 'mikrotik', got '%s'", p.GetID())
	}
	if p.GetExtension() != "rsc" {
		t.Errorf("Expected extension 'rsc', got '%s'", p.GetExtension())
	}

	dataDefault := pluginBase.Lookup{
		CountryCode: "IR",
		CountryName: "Iran",
		IPv4:        []string{"5.10.128.0/17"},
		IPv6:        []string{"2a01:5ec0::/32"},
		UpdatedAt:   "2026-10-10",
	}

	// 1. Default list name (should use CountryCode IR)
	outDefault := p.Format(dataDefault, pluginBase.Any, true)
	if !strings.Contains(outDefault, "add list=IR address=5.10.128.0/17") {
		t.Errorf("Expected fallback list=IR, got:\n%s", outDefault)
	}
	if !strings.Contains(outDefault, "add list=IR address=2a01:5ec0::/32") {
		t.Errorf("Expected fallback list=IR for IPv6, got:\n%s", outDefault)
	}

	// 2. Custom list name
	dataCustom := pluginBase.Lookup{
		CountryCode: "IR",
		CountryName: "Iran",
		ListName:    "MY_BLOCKLIST",
		IPv4:        []string{"5.10.128.0/17"},
		IPv6:        []string{"2a01:5ec0::/32"},
		UpdatedAt:   "2026-10-10",
	}
	outCustom := p.Format(dataCustom, pluginBase.IPv4, true)
	if !strings.Contains(outCustom, "add list=MY_BLOCKLIST address=5.10.128.0/17") {
		t.Errorf("Expected custom list=MY_BLOCKLIST, got:\n%s", outCustom)
	}
	if strings.Contains(outCustom, "2a01:5ec0::/32") {
		t.Errorf("Did not expect IPv6 rule in IPv4-only format")
	}
}
