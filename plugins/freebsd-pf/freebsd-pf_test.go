package main

import (
	"strings"
	"testing"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

func TestFreeBSDPFPlugin(t *testing.T) {
	p := NewFreeBSDPFPlugin()

	if p.GetID() != "freebsd-pf" {
		t.Errorf("Expected ID 'freebsd-pf', got '%s'", p.GetID())
	}
	if p.GetExtension() != "conf" {
		t.Errorf("Expected extension 'conf', got '%s'", p.GetExtension())
	}

	dataDefault := pluginBase.Lookup{
		CountryCode: "IR",
		CountryName: "Iran",
		IPv4:        []string{"5.10.128.0/17"},
		IPv6:        []string{"2a01:5ec0::/32"},
		UpdatedAt:   "2026-10-10",
	}

	// 1. Default table name (ips_ir) and pass
	outDefault := p.Format(dataDefault, pluginBase.Any, true)
	if !strings.Contains(outDefault, "table <ips_ir_v4> persist") {
		t.Errorf("Expected default table name ips_ir_v4, got:\n%s", outDefault)
	}
	if !strings.Contains(outDefault, "table <ips_ir_v6> persist") {
		t.Errorf("Expected default table name ips_ir_v6, got:\n%s", outDefault)
	}
	if !strings.Contains(outDefault, "pass in quick") {
		t.Errorf("Expected rule pass in quick for access=true, got:\n%s", outDefault)
	}

	// 2. Custom ListName and block
	dataCustom := pluginBase.Lookup{
		CountryCode: "IR",
		CountryName: "Iran",
		ListName:    "pf_iran",
		IPv4:        []string{"5.10.128.0/17"},
		IPv6:        []string{"2a01:5ec0::/32"},
		UpdatedAt:   "2026-10-10",
	}
	outCustom := p.Format(dataCustom, pluginBase.IPv4, false)
	if !strings.Contains(outCustom, "table <pf_iran> persist") {
		t.Errorf("Expected custom table name pf_iran, got:\n%s", outCustom)
	}
	if !strings.Contains(outCustom, "block in quick from <pf_iran> to any") {
		t.Errorf("Expected block rule for access=false, got:\n%s", outCustom)
	}
}
