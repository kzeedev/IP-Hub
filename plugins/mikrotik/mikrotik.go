package main

import (
	"fmt"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

const id string = "mikrotik"
const name string = "Mikrotik address-list"
const extension string = "rsc"

// MikrotikPlugin implements the Plugin interface
type MikrotikPlugin struct {
	*pluginBase.BasePlugin
}

// NewMikrotikPlugin creates a new instance of MikrotikPlugin
func NewMikrotikPlugin() *MikrotikPlugin {
	return &MikrotikPlugin{
		BasePlugin: pluginBase.NewBasePlugin(id, name, extension),
	}
}

// Format implements the Plugin interface Format method
func (p *MikrotikPlugin) Format(data pluginBase.Lookup, ipVersion pluginBase.IPVersion, _ bool) string {
	IPv4 := ""
	IPv6 := ""
	listName := data.GetListName()

	if ipVersion == pluginBase.IPv4 || ipVersion == pluginBase.Any {
		for _, ip := range data.IPv4 {
			ipOrg := data.PrefixORGs[ip]
			IPv4 += fmt.Sprintf("add list=%v address=%v comment=\"%v\"\n", listName, ip, ipOrg)
		}
	}
	if ipVersion == pluginBase.IPv6 || ipVersion == pluginBase.Any {
		for _, ip := range data.IPv6 {
			ipOrg := data.PrefixORGs[ip]
			IPv6 += fmt.Sprintf("add list=%v address=%v comment=\"%v\"\n", listName, ip, ipOrg)
		}
	}

	switch ipVersion {
	case pluginBase.IPv4:
		return fmt.Sprintf(`# Updated at: %v
# Country: %v
/ip/firewall/address-list/
%v`,
			data.UpdatedAt, data.CountryName, IPv4)
	case pluginBase.IPv6:
		return fmt.Sprintf(`# Updated at: %v
# Country: %v
/ipv6/firewall/address-list/
%v`,
			data.UpdatedAt, data.CountryName, IPv6)
	default:
		return fmt.Sprintf(`# Updated at: %v
# Country: %v
/ip/firewall/address-list/
%v
/ipv6/firewall/address-list/
%v`,
			data.UpdatedAt, data.CountryName, IPv4, IPv6)
	}
}

// Export the plugin
var Plugin pluginBase.Plugin = NewMikrotikPlugin()
