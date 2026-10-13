package main

import (
	"strings"
	"testing"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

func TestIPSetPlugin(t *testing.T) {
	p := NewIPSetPlugin()

	if p.GetID() != "ipset" {
		t.Errorf("Expected ID 'ipset', got '%s'", p.GetID())
	}
	if p.GetExtension() != "sh" {
		t.Errorf("Expected extension 'sh', got '%s'", p.GetExtension())
	}

	dataDefault := pluginBase.Lookup{
		CountryCode: "IR",
		CountryName: "Iran",
		IPv4:        []string{"5.10.128.0/17"},
		IPv6:        []string{"2a01:5ec0::/32"},
		UpdatedAt:   "2026-10-10",
	}

	// 1. Default setName (country_ir) and ACCEPT
	outDefault := p.Format(dataDefault, pluginBase.Any, true)
	if !strings.Contains(outDefault, "ipset create country_ir hash:net") {
		t.Errorf("Expected default set name country_ir, got:\n%s", outDefault)
	}
	if !strings.Contains(outDefault, "ipset add country_ir 5.10.128.0/17 -exist") {
		t.Errorf("Expected rule with country_ir, got:\n%s", outDefault)
	}
	if !strings.Contains(outDefault, "ACCEPT") {
		t.Errorf("Expected target ACCEPT for access=true, got:\n%s", outDefault)
	}

	// 2. Custom ListName and DROP
	dataCustom := pluginBase.Lookup{
		CountryCode: "IR",
		CountryName: "Iran",
		ListName:    "blocked_countries",
		IPv4:        []string{"5.10.128.0/17"},
		IPv6:        []string{"2a01:5ec0::/32"},
		UpdatedAt:   "2026-10-10",
	}
	outCustom := p.Format(dataCustom, pluginBase.IPv4, false)
	if !strings.Contains(outCustom, "ipset create blocked_countries hash:net") {
		t.Errorf("Expected custom set name blocked_countries, got:\n%s", outCustom)
	}
	if !strings.Contains(outCustom, "ipset add blocked_countries 5.10.128.0/17 -exist") {
		t.Errorf("Expected rule with blocked_countries, got:\n%s", outCustom)
	}
	if !strings.Contains(outCustom, "DROP") {
		t.Errorf("Expected target DROP for access=false, got:\n%s", outCustom)
	}
}
