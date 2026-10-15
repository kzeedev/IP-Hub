package main

import (
	"fmt"
	"strings"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

const id string = "fortigate"
const name string = "Fortigate Address List"
const extension string = "txt"

// FortigatePlugin implements the Plugin interface
type FortigatePlugin struct {
	*pluginBase.BasePlugin
}

// NewFortigatePlugin creates a new instance of FortigatePlugin
func NewFortigatePlugin() *FortigatePlugin {
	return &FortigatePlugin{
		BasePlugin: pluginBase.NewBasePlugin(id, name, extension),
	}
}

// Format implements the Plugin interface Format method
func (p *FortigatePlugin) Format(data pluginBase.Lookup, ipVersion pluginBase.IPVersion, _ bool) string {
	var IPv4, IPv6 string

	if ipVersion == pluginBase.IPv4 || ipVersion == pluginBase.Any {
		IPv4 = strings.Join(data.IPv4, "\n")
	}
	if ipVersion == pluginBase.IPv6 || ipVersion == pluginBase.Any {
		IPv6 = strings.Join(data.IPv6, "\n")
	}

	switch ipVersion {
	case pluginBase.IPv4:
		return IPv4
	case pluginBase.IPv6:
		return IPv6
	default:
		return fmt.Sprintf(`%v\n%v`, IPv4, IPv6)
	}
}

// Export the plugin
var Plugin pluginBase.Plugin = NewFortigatePlugin()
