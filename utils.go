package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"path/filepath"
	"plugin"
	"strings"

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
	client := &http.Client{}
	var data = strings.NewReader(`secret=0x4AAAAAABcvDFZIP0YMm9YRGQJC8wct55Q&response=` + turnstile)
	req, err := http.NewRequest("POST", "https://challenges.cloudflare.com/turnstile/v0/siteverify", data)
	if err != nil {
		log.Fatal(err)
		return false
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := client.Do(req)
	if err != nil {
		log.Fatal(err)
		return false
	}
	defer resp.Body.Close()

	var response models.TurnstileResponse
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		fmt.Println(err)
		return false
	}

	return response.Success
}
