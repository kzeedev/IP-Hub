package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"plugin"
	"strings"
	"time"

	country "github.com/mikekonan/go-countries"
	"github.com/kzeedev/IP-Hub/config"
	"github.com/kzeedev/IP-Hub/models"
	"github.com/kzeedev/IP-Hub/pluginBase"
)

func lookup(countryCode string) pluginBase.Lookup {
	url := fmt.Sprintf("%s%v", config.LookupEndpoint, countryCode)
	fmt.Println(url)
	res, err := http.Get(url)
	if err != nil {
		fmt.Println(err)
	}
	defer res.Body.Close()

	var response models.RipeResult

	err = json.NewDecoder(res.Body).Decode(&response)
	if err != nil {
		fmt.Println(err)
	}

	countryName, ok := country.ByAlpha2Code(country.Alpha2Code(countryCode))

	result := pluginBase.Lookup{
		UpdatedAt:   response.Data.QueryTime,
		CountryCode: countryCode,
		ASN:         response.Data.Resources.Asn,
		IPv4:        response.Data.Resources.Ipv4,
		IPv6:        response.Data.Resources.Ipv6,
	}
	if ok {
		result.CountryName = countryName.NameStr()
	} else {
		result.CountryName = countryCode
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

func ValidateCaptcha(turnstile string) bool {
	if turnstile == "" {
		return false
	}

	secret := strings.TrimSpace(os.Getenv("TURNSTILE_SECRET"))
	if secret == "" {
		log.Println("Error: TURNSTILE_SECRET environment variable is not set")
		return false
	}

	client := &http.Client{Timeout: 5 * time.Second}
	var data = strings.NewReader(fmt.Sprintf("secret=%s&response=%s", secret, turnstile))
	req, err := http.NewRequest("POST", "https://challenges.cloudflare.com/turnstile/v0/siteverify", data)
	if err != nil {
		log.Printf("Turnstile request creation error: %v\n", err)
		return false
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Turnstile verification HTTP error: %v\n", err)
		return false
	}
	defer resp.Body.Close()

	var response models.TurnstileResponse
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		log.Printf("Turnstile response decode error: %v\n", err)
		return false
	}

	return response.Success
}
