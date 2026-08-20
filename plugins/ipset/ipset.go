package main

import (
	"fmt"
	"strings"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

const id string = "ipset"
const name string = "Linux ipset"

// IPSetPlugin implements the Plugin interface
type IPSetPlugin struct {
	*pluginBase.BasePlugin
}

// NewIPSetPlugin creates a new instance of IPSetPlugin
func NewIPSetPlugin() *IPSetPlugin {
	return &IPSetPlugin{
		BasePlugin: pluginBase.NewBasePlugin(id, name),
	}
}

// Format implements the Plugin interface Format method
func (p *IPSetPlugin) Format(data pluginBase.Lookup, ipVersion pluginBase.IPVersion, access bool) string {
	target := "ACCEPT"
	if !access {
		target = "DROP"
	}

	setName := fmt.Sprintf("country_%s", strings.ToLower(data.CountryCode))

	v4Rules := ""
	v6Rules := ""

	if ipVersion == pluginBase.IPv4 || ipVersion == pluginBase.Any {
		for _, ip := range data.IPv4 {
			v4Rules += fmt.Sprintf("ipset add %s %s -exist\n", setName, ip)
		}
	}

	if ipVersion == pluginBase.IPv6 || ipVersion == pluginBase.Any {
		for _, ip := range data.IPv6 {
			v6Rules += fmt.Sprintf("ipset add %s_v6 %s -exist\n", setName, ip)
		}
	}

	switch ipVersion {
	case pluginBase.IPv4:
		return fmt.Sprintf(`#!/bin/sh
# Updated at: %s
# Country: %s (%s)
# Linux ipset (IPv4)

ipset create %s hash:net family inet -exist
%s
# Example iptables Rule:
# iptables -I INPUT -m set --match-set %s src -j %s
`,
			data.UpdatedAt, data.CountryName, data.CountryCode, setName, v4Rules, setName, target)

	case pluginBase.IPv6:
		return fmt.Sprintf(`#!/bin/sh
# Updated at: %s
# Country: %s (%s)
# Linux ipset (IPv6)

ipset create %s_v6 hash:net family inet6 -exist
%s
# Example ip6tables Rule:
# ip6tables -I INPUT -m set --match-set %s_v6 src -j %s
`,
			data.UpdatedAt, data.CountryName, data.CountryCode, setName, v6Rules, setName, target)

	default:
		return fmt.Sprintf(`#!/bin/sh
# Updated at: %s
# Country: %s (%s)
# Linux ipset (IPv4 & IPv6)

# IPv4 Set
ipset create %s hash:net family inet -exist
%s
# IPv6 Set
ipset create %s_v6 hash:net family inet6 -exist
%s
# Example iptables / ip6tables Rules:
# iptables -I INPUT -m set --match-set %s src -j %s
# ip6tables -I INPUT -m set --match-set %s_v6 src -j %s
`,
			data.UpdatedAt, data.CountryName, data.CountryCode, setName, v4Rules, setName, v6Rules, setName, target, setName, target)
	}
}

// Export the plugin
var Plugin pluginBase.Plugin = NewIPSetPlugin()
