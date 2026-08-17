package main

import (
	"fmt"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

const id string = "cisco"
const name string = "Cisco access-list"

// CiscoPlugin implements the Plugin interface
type CiscoPlugin struct {
	*pluginBase.BasePlugin
}

// NewCiscoPlugin creates a new instance of CiscoPlugin
func NewCiscoPlugin() *CiscoPlugin {
	return &CiscoPlugin{
		BasePlugin: pluginBase.NewBasePlugin(id, name),
	}
}

// Format implements the Plugin interface Format method
func (p *CiscoPlugin) Format(data pluginBase.Lookup, ipVersion pluginBase.IPVersion, access bool) string {
	IPv4 := ""
	IPv6 := ""
	_access := "permit"
	if !access {
		_access = "deny"
	}

	if ipVersion == "ipv4" || ipVersion == "any" {
		for _, ip := range data.IPv4 {
			IPv4 += fmt.Sprintf("ip access-list %v %s %v\n", data.CountryCode, _access, ip)
		}
	}
	if ipVersion == "ipv6" || ipVersion == "any" {
		for _, ip := range data.IPv6 {
			IPv6 += fmt.Sprintf("ipv6 access-list %v %s any %v any any\n", data.CountryCode, _access, ip)
		}
	}

	switch ipVersion {
	case "ipv4":
		return fmt.Sprintf(`# Updated at: %v
# Country: %v
%v`,
			data.UpdatedAt, data.CountryName, IPv4)
	case "ipv6":
		return fmt.Sprintf(`# Updated at: %v
# Country: %v
%v`,
			data.UpdatedAt, data.CountryName, IPv6)
	default:
		return fmt.Sprintf(`# Updated at: %v
# Country: %v
# IPv4
%v
# IPv6
%v`,
			data.UpdatedAt, data.CountryName, IPv4, IPv6)
	}
}

var Plugin pluginBase.Plugin = NewCiscoPlugin()
