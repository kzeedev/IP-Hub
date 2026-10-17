package pluginBase

type Lookup struct {
	CountryCode string
	CountryName string
	ListName    string
	ASN         []string
	IPv4        []string
	IPv6        []string
	PrefixORGs  map[string]string
	UpdatedAt   string
}

// GetListName returns ListName if set, or falls back to CountryCode.
func (l Lookup) GetListName() string {
	if l.ListName != "" {
		return l.ListName
	}
	return l.CountryCode
}

type IPVersion string

const (
	Any  IPVersion = "any"
	IPv4 IPVersion = "ipv4"
	IPv6 IPVersion = "ipv6"
)

type Plugin interface {
	// GetID returns the unique identifier of the plugin
	GetID() string

	// GetName returns the display name of the plugin
	GetName() string

	// GetExtension returns the file extension for formatted output (e.g. "rsc", "txt", "json")
	GetExtension() string

	// Format processes the lookup data and returns a formatted string
	// based on the specified IP version filter
	Format(lookup Lookup, version IPVersion, access bool) string
}

// BasePlugin provides a basic implementation of the Plugin interface
type BasePlugin struct {
	id        string
	name      string
	extension string
}

// NewBasePlugin creates a new BasePlugin instance with optional file extension (defaults to "txt")
func NewBasePlugin(id, name string, extension ...string) *BasePlugin {
	ext := "txt"
	if len(extension) > 0 && extension[0] != "" {
		ext = extension[0]
	}
	return &BasePlugin{
		id:        id,
		name:      name,
		extension: ext,
	}
}

func (b *BasePlugin) GetID() string        { return b.id }
func (b *BasePlugin) GetName() string      { return b.name }
func (b *BasePlugin) GetExtension() string { return b.extension }
