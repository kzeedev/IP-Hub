package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"net/url"
	"path/filepath"
	"plugin"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/kzeedev/IP-Hub/config"
	"github.com/kzeedev/IP-Hub/models"
	"github.com/kzeedev/IP-Hub/pluginBase"
	country "github.com/mikekonan/go-countries"
)

var lookupHttpClient = &http.Client{
	Timeout: 7 * time.Second,
}

func lookup(countryCode string) pluginBase.Lookup {
	cleanCode := strings.ToUpper(strings.TrimSpace(countryCode))
	// Validate ISO 3166-1 alpha-2 country code
	if len(cleanCode) != 2 || cleanCode[0] < 'A' || cleanCode[0] > 'Z' || cleanCode[1] < 'A' || cleanCode[1] > 'Z' {
		return pluginBase.Lookup{
			CountryCode: cleanCode,
			CountryName: "Invalid Country",
		}
	}

	targetURL := fmt.Sprintf("%s%s", config.LookupEndpoint, url.QueryEscape(cleanCode))
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return pluginBase.Lookup{CountryCode: cleanCode}
	}
	req.Header.Set("User-Agent", "IP-Hub-Server/2.0")
	req.Header.Set("Accept", "application/json")

	res, err := lookupHttpClient.Do(req)
	if err != nil {
		fmt.Printf("Lookup HTTP error: %v\n", err)
		return pluginBase.Lookup{CountryCode: cleanCode}
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return pluginBase.Lookup{CountryCode: cleanCode}
	}

	var response models.RipeResult
	err = json.NewDecoder(res.Body).Decode(&response)
	if err != nil {
		fmt.Printf("Lookup JSON decode error: %v\n", err)
		return pluginBase.Lookup{CountryCode: cleanCode}
	}

	countryName, ok := country.ByAlpha2Code(country.Alpha2Code(cleanCode))

	result := pluginBase.Lookup{
		UpdatedAt:   response.Data.QueryTime,
		CountryCode: cleanCode,
		ASN:         response.Data.Resources.Asn,
		IPv4:        response.Data.Resources.Ipv4,
		IPv6:        response.Data.Resources.Ipv6,
	}
	if ok {
		result.CountryName = countryName.NameStr()
	} else {
		result.CountryName = cleanCode
	}

	return result
}

func arrayToString(array []string) string {
	return strings.Join(array, " ")
}

func WalkDir(root string, ext string) ([]string, error) {
	var files []string
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if d.IsDir() {
			return nil
		}

		if strings.HasSuffix(path, "."+ext) {
			files = append(files, path)
			return nil
		}

		return nil
	})
	return files, err
}

func loadPlugins() {
	pluginFiles, err := WalkDir("./plugins", "so")
	if err != nil {
		fmt.Printf("Error walking plugin directory: %v\n", err)
		return
	}

	for _, mod := range pluginFiles {
		fmt.Printf("Loading plugin: %s\n", mod)
		plug, err := plugin.Open(mod)
		if err != nil {
			fmt.Printf("Error opening plugin %s: %v\n", mod, err)
			continue
		}

		symPlugin, err := plug.Lookup("Plugin")
		if err != nil {
			fmt.Printf("Error looking up 'Plugin' symbol in %s: %v\n", mod, err)
			continue
		}

		// Type assert to Plugin interface instead of PluginBase struct
		if p, ok := symPlugin.(*pluginBase.Plugin); ok {
			plugins = append(plugins, *p)
		} else {
			fmt.Printf("Plugin %s does not implement the Plugin interface. Got type: %T\n", mod, symPlugin)
		}
	}

	if len(plugins) == 0 {
		fmt.Println("No plugins were loaded successfully")
	} else {
		fmt.Printf("Successfully loaded %d plugins\n", len(plugins))
	}
}

// ExtractClientIP extracts and validates the client IP from proxy headers or socket.
func ExtractClientIP(c fiber.Ctx) string {
	ip := c.Get("CF-Connecting-IP")
	if ip == "" {
		ip = c.Get("X-Forwarded-For")
	}
	if ip == "" {
		ip = c.Get("X-Real-IP")
	}
	if ip == "" {
		ip = c.IP()
	}
	if strings.Contains(ip, ",") {
		ip = strings.TrimSpace(strings.Split(ip, ",")[0])
	}
	ip = strings.TrimPrefix(ip, "::ffff:")
	if parsed := net.ParseIP(ip); parsed == nil {
		ip = c.IP()
	}
	return ip
}
