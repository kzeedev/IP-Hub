package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
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

// isPublicIP checks if an IP is a valid routable public IP
func isPublicIP(ipStr string) bool {
	ip := net.ParseIP(strings.TrimSpace(ipStr))
	if ip == nil {
		return false
	}
	return !ip.IsLoopback() && !ip.IsPrivate() && !ip.IsUnspecified() && !ip.IsLinkLocalUnicast() && !ip.IsLinkLocalMulticast()
}

// ExtractClientIP extracts the real client IP from Cloudflare or standard proxy headers
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
	return strings.TrimPrefix(ip, "::ffff:")
}

// ValidateCaptchaFull verifies a Cloudflare Turnstile token with action, hostname, and remote IP checks
func ValidateCaptchaFull(turnstile string, expectedAction string, remoteIP string) bool {
	turnstile = strings.TrimSpace(turnstile)
	if turnstile == "" || len(turnstile) > 2048 {
		log.Println("[Turnstile] Validation rejected: empty token or token length > 2048")
		return false
	}

	secret := strings.TrimSpace(os.Getenv("TURNSTILE_SECRET"))
	if secret == "" {
		log.Println("[Turnstile] Error: TURNSTILE_SECRET environment variable is not set")
		return false
	}

	form := url.Values{}
	form.Set("secret", secret)
	form.Set("response", turnstile)
	if remoteIP != "" && isPublicIP(remoteIP) {
		form.Set("remoteip", remoteIP)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", form)
	if err != nil {
		log.Printf("[Turnstile] Verification HTTP error: %v\n", err)
		return false
	}
	defer resp.Body.Close()

	var response models.TurnstileResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		log.Printf("[Turnstile] Response decode error: %v\n", err)
		return false
	}

	if !response.Success {
		log.Printf("[Turnstile] Verification failed from Cloudflare siteverify: error-codes=%v\n", response.ErrorCodes)
		return false
	}

	// Validate expected action if specified and returned
	if expectedAction != "" && response.Action != "" && response.Action != expectedAction {
		log.Printf("[Turnstile] Action mismatch: got %q, expected %q\n", response.Action, expectedAction)
		return false
	}

	// Validate expected hostname if TURNSTILE_HOSTNAMES is configured in env
	if hostnamesEnv := strings.TrimSpace(os.Getenv("TURNSTILE_HOSTNAMES")); hostnamesEnv != "" {
		allowedHostnames := make(map[string]bool)
		for _, h := range strings.Split(hostnamesEnv, ",") {
			if trimmed := strings.TrimSpace(h); trimmed != "" {
				allowedHostnames[trimmed] = true
			}
		}
		if len(allowedHostnames) > 0 && response.Hostname != "" && !allowedHostnames[response.Hostname] {
			log.Printf("[Turnstile] Hostname mismatch: got %q, not in allowed list\n", response.Hostname)
			return false
		}
	}

	log.Printf("[Turnstile] Token verified successfully (hostname=%q, action=%q)\n", response.Hostname, response.Action)
	return true
}

// ValidateCaptcha validates a token using default parameters
func ValidateCaptcha(turnstile string) bool {
	return ValidateCaptchaFull(turnstile, "", "")
}

// ExtractTurnstileToken extracts the Cloudflare Turnstile token from request headers, query parameters, or JSON body
func ExtractTurnstileToken(c fiber.Ctx) string {
	token := c.Get("CF-Turnstile-Response")
	if token == "" {
		token = c.Get("X-Turnstile-Token")
	}
	if token == "" {
		token = c.Query("cf-turnstile-response")
	}
	if token == "" {
		token = c.Query("turnstile")
	}
	if token == "" {
		var body struct {
			Turnstile string `json:"cf-turnstile-response"`
			Token     string `json:"turnstile"`
		}
		_ = json.Unmarshal(c.Body(), &body)
		if body.Turnstile != "" {
			token = body.Turnstile
		} else if body.Token != "" {
			token = body.Token
		}
	}
	return strings.TrimSpace(token)
}

// CaptchaMiddleware returns a Fiber handler that enforces valid Turnstile CAPTCHA verification
func CaptchaMiddleware(expectedAction ...string) fiber.Handler {
	var action string
	if len(expectedAction) > 0 {
		action = expectedAction[0]
	}
	return func(c fiber.Ctx) error {
		token := ExtractTurnstileToken(c)
		clientIP := ExtractClientIP(c)
		if !ValidateCaptchaFull(token, action, clientIP) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Captcha validation failed",
			})
		}
		return c.Next()
	}
}
