package main

import (
	"fmt"
	"strings"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

const id string = "freebsd-pf"
const name string = "FreeBSD packet filter"

// FreeBSDPFPlugin implements the Plugin interface
type FreeBSDPFPlugin struct {
	*pluginBase.BasePlugin
}

// NewFreeBSDPFPlugin creates a new instance of FreeBSDPFPlugin
func NewFreeBSDPFPlugin() *FreeBSDPFPlugin {
	return &FreeBSDPFPlugin{
		BasePlugin: pluginBase.NewBasePlugin(id, name),
	}
}

// Format implements the Plugin interface Format method
func (p *FreeBSDPFPlugin) Format(data pluginBase.Lookup, ipVersion pluginBase.IPVersion, access bool) string {
	IPv4 := ""
	IPv6 := ""

	if ipVersion == pluginBase.IPv4 || ipVersion == pluginBase.Any {
		for _, ip := range data.IPv4 {
			IPv4 += fmt.Sprintf("    %v,\n", ip)
		}
	}
	if ipVersion == pluginBase.IPv6 || ipVersion == pluginBase.Any {
		for _, ip := range data.IPv6 {
			IPv6 += fmt.Sprintf("    %v,\n", ip)
		}
	}

	ruleAction := "pass"
	if !access {
		ruleAction = "block"
	}

	tableName := fmt.Sprintf("ips_%v", strings.ToLower(data.CountryCode))

	switch ipVersion {
	case pluginBase.IPv4:
		return fmt.Sprintf(`# Updated at: %v
# Country: %v (%v)
# FreeBSD Packet Filter (pf.conf) Table
table <%v> persist {
%v}

# Rule:
# %v in quick from <%v> to any
`,
			data.UpdatedAt, data.CountryName, data.CountryCode, tableName, IPv4, ruleAction, tableName)
	case pluginBase.IPv6:
		return fmt.Sprintf(`# Updated at: %v
# Country: %v (%v)
# FreeBSD Packet Filter (pf.conf) Table
table <%v> persist {
%v}

# Rule:
# %v in quick from <%v> to any
`,
			data.UpdatedAt, data.CountryName, data.CountryCode, tableName, IPv6, ruleAction, tableName)
	default:
		return fmt.Sprintf(`# Updated at: %v
# Country: %v (%v)
# FreeBSD Packet Filter (pf.conf) Tables
table <%v_v4> persist {
%v}

table <%v_v6> persist {
%v}

# Rules:
# %v in quick from <%v_v4> to any
# %v in quick from <%v_v6> to any
`,
			data.UpdatedAt, data.CountryName, data.CountryCode, tableName, IPv4, tableName, IPv6, ruleAction, tableName, ruleAction, tableName)
	}
}

// Export the plugin
var Plugin pluginBase.Plugin = NewFreeBSDPFPlugin()
