package main

import (
	"strings"
	"testing"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

func TestCiscoPlugin(t *testing.T) {
	p := NewCiscoPlugin()

	if p.GetID() != "cisco" {
		t.Errorf("Expected ID 'cisco', got '%s'", p.GetID())
	}
	if p.GetExtension() != "txt" {
		t.Errorf("Expected extension 'txt', got '%s'", p.GetExtension())
	}

	dataDefault := pluginBase.Lookup{
		CountryCode: "IR",
		CountryName: "Iran",
		IPv4:        []string{"5.10.128.0/17"},
		IPv6:        []string{"2a01:5ec0::/32"},
		UpdatedAt:   "2026-10-10",
	}

	// 1. Default list name with permit (allow = true)
	outPermit := p.Format(dataDefault, pluginBase.Any, true)
	if !strings.Contains(outPermit, "ip access-list IR permit 5.10.128.0/17") {
		t.Errorf("Expected fallback list=IR with permit, got:\n%s", outPermit)
	}
	if !strings.Contains(outPermit, "ipv6 access-list IR permit any 2a01:5ec0::/32 any any") {
		t.Errorf("Expected fallback list=IR with permit for IPv6, got:\n%s", outPermit)
	}

	// 2. Custom list name with deny (allow = false)
	dataCustom := pluginBase.Lookup{
		CountryCode: "IR",
		CountryName: "Iran",
		ListName:    "GEO_IRAN",
		IPv4:        []string{"5.10.128.0/17"},
		IPv6:        []string{"2a01:5ec0::/32"},
		UpdatedAt:   "2026-10-10",
	}
	outDeny := p.Format(dataCustom, pluginBase.IPv4, false)
	if !strings.Contains(outDeny, "ip access-list GEO_IRAN deny 5.10.128.0/17") {
		t.Errorf("Expected custom list=GEO_IRAN with deny, got:\n%s", outDeny)
	}
	if strings.Contains(outDeny, "ipv6") {
		t.Errorf("Did not expect IPv6 rule in IPv4-only format")
	}
}
