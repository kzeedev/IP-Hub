package main

import (
	"strings"
	"testing"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

func TestFortigatePlugin(t *testing.T) {
	p := NewFortigatePlugin()

	if p.GetID() != "fortigate" {
		t.Errorf("Expected ID 'fortigate', got '%s'", p.GetID())
	}
	if p.GetExtension() != "txt" {
		t.Errorf("Expected extension 'txt', got '%s'", p.GetExtension())
	}

	data := pluginBase.Lookup{
		CountryCode: "IR",
		CountryName: "Iran",
		IPv4:        []string{"5.10.128.0/17", "37.152.160.0/19"},
		IPv6:        []string{"2a01:5ec0::/32"},
		UpdatedAt:   "2026-10-10",
	}

	outAny := p.Format(data, pluginBase.Any, true)
	if !strings.Contains(outAny, "5.10.128.0/17, 37.152.160.0/19") {
		t.Errorf("Expected IPv4 comma-separated list, got:\n%s", outAny)
	}
	if !strings.Contains(outAny, "2a01:5ec0::/32") {
		t.Errorf("Expected IPv6 in output, got:\n%s", outAny)
	}

	outV4 := p.Format(data, pluginBase.IPv4, true)
	if strings.Contains(outV4, "2a01:5ec0::/32") {
		t.Errorf("Did not expect IPv6 in IPv4-only format")
	}
}
