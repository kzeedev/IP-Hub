package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cache"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/joho/godotenv"
	"github.com/kzeedev/IP-Hub/config"
	"github.com/kzeedev/IP-Hub/database"
	"github.com/kzeedev/IP-Hub/pluginBase"
)

var plugins []pluginBase.Plugin
var app *fiber.App

func init() {
	// 1. Load local .env file if present
	_ = godotenv.Load()

	// 2. Validate strictly required environment variables
	var missing []string
	redisURL := strings.TrimSpace(os.Getenv("REDIS_URL"))
	if redisURL == "" {
		missing = append(missing, "REDIS_URL")
	} else {
		config.RedisURL = redisURL
	}

	if len(missing) > 0 {
		log.Fatalf("Fatal: missing required environment variable(s): %s", strings.Join(missing, ", "))
	}

	// 3. Load dynamic plugins
	loadPlugins()

	// 4. Initialize Redis client (strictly required in production)
	isTest := strings.HasSuffix(os.Args[0], ".test") || strings.HasSuffix(os.Args[0], ".test.exe")
	if !isTest {
		for _, arg := range os.Args {
			if strings.HasPrefix(arg, "-test.") {
				isTest = true
				break
			}
		}
	}

	if _, err := database.Init(); err != nil {
		if isTest {
			log.Printf("Notice: Redis not connected during test run: %v", err)
		} else {
			log.Fatalf("Fatal: Redis connection required. Could not connect to %s: %v", config.RedisURL, err)
		}
	}

	// Configure Fiber with body size limit
	app = fiber.New(fiber.Config{
		AppName:   fmt.Sprintf("IP-Hub %s", config.Version),
		BodyLimit: 2 * 1024 * 1024,
	})

	// Security headers
	app.Use(helmet.New(helmet.Config{
		XSSProtection:             "0",
		ContentTypeNosniff:        "nosniff",
		XFrameOptions:             "SAMEORIGIN",
		ReferrerPolicy:            "strict-origin-when-cross-origin",
		CrossOriginOpenerPolicy:   "same-origin",
		CrossOriginResourcePolicy: "same-origin",
	}))

	// CORS middleware
	allowedOrigins := []string{"https://ip-hub.ir", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"}
	if envOrigins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); envOrigins != "" {
		if envOrigins == "*" {
			allowedOrigins = []string{"*"}
		} else {
			rawParts := strings.Split(envOrigins, ",")
			allowedOrigins = make([]string, 0, len(rawParts))
			for _, p := range rawParts {
				if trimmed := strings.TrimSpace(p); trimmed != "" {
					allowedOrigins = append(allowedOrigins, trimmed)
				}
			}
		}
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Forwarded-For", "CF-Connecting-IP"},
		AllowMethods: []string{"GET", "POST", "HEAD", "OPTIONS"},
	}))

	// Rate limiting
	app.Use("/lookup", limiter.New(limiter.Config{
		Max:        100,
		Expiration: 1 * time.Minute,
	}))
	app.Use("/api/whois/batch", limiter.New(limiter.Config{
		Max:        30,
		Expiration: 1 * time.Minute,
	}))
	app.Use("/api/whois/resolve-orgs", limiter.New(limiter.Config{
		Max:        30,
		Expiration: 1 * time.Minute,
	}))
	app.Use("/api", limiter.New(limiter.Config{
		Max:        150,
		Expiration: 1 * time.Minute,
	}))

	// Configure cache for static assets
	app.Use("/assets", cache.New(cache.Config{
		Expiration: 24 * time.Hour,
	}))

	// Configure compression
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestCompression,
	}))

	// Setup OpenAPI 3.1 & Interactive Docs via Huma v2 (GoFiber OpenAPI Recipe)
	setupOpenAPI(app)

	// Legacy IP-Hub plugin endpoint
	app.Post("/lookup", handleRequest)

	// Markdown for Agents content negotiation (RFC 7231 / Cloudflare standard)
	app.Use(markdownNegotiationMiddleware)

	// Serve Frontend Single Page Application (web/dist/ and web/public/)
	app.Use("/", static.New("./web/dist"))
	app.Use("/", static.New("./dist"))
	app.Use("/public", static.New("./web/public"))

	// SPA fallback: Route all non-API GET requests to index.html
	app.Get("*", func(c fiber.Ctx) error {
		if strings.HasPrefix(c.Path(), "/api") || strings.HasPrefix(c.Path(), "/openapi") || strings.HasPrefix(c.Path(), "/docs") || strings.HasPrefix(c.Path(), "/schemas") || strings.HasPrefix(c.Path(), "/.well-known") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Endpoint not found"})
		}
		c.Set("Vary", "Accept")
		if _, err := os.Stat("./web/dist/index.html"); err == nil {
			return c.SendFile("./web/dist/index.html")
		}
		return c.SendFile("./dist/index.html")
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	fmt.Printf("IP-Hub Server running on http://localhost:%s\n", port)
	log.Fatal(app.Listen(":" + port))
}
