package config

var (
	LookupEndpoint string = "https://stat.ripe.net/data/country-resource-list/data.json?resource="
	Version        string = "dev"
	RedisURL       string
)

// GetVersion returns the application version, either set at build time (e.g. via -ldflags) or defaults to "dev".
func GetVersion() string {
	if Version != "" {
		return Version
	}
	return "dev"
}
