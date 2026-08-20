package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	minifier "github.com/beyer-stefan/gofiber-minifier"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cache"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/kzeedev/IP-Hub/config"
	"github.com/kzeedev/IP-Hub/database"
	"github.com/kzeedev/IP-Hub/pluginBase"
)

var plugins []pluginBase.Plugin
var app *fiber.App

func init() {
	// Read and sanitize environment variables
	if redisEnv := strings.TrimSpace(os.Getenv("REDIS_URL")); redisEnv != "" {
		config.RedisURL = redisEnv
	} else if redisEnv := strings.TrimSpace(os.Getenv("REDIS_ADDR")); redisEnv != "" {
		if strings.HasPrefix(redisEnv, "redis://") {
			config.RedisURL = redisEnv
		} else {
			config.RedisURL = "redis://" + redisEnv + "/2"
		}
	} else if redisEnv := strings.TrimSpace(os.Getenv("redis")); redisEnv != "" {
		if strings.HasPrefix(redisEnv, "redis://") {
			config.RedisURL = redisEnv
		} else {
			config.RedisURL = "redis://" + redisEnv + "/2"
		}
	} else if config.RedisURL == "" {
		config.RedisURL = config.DefaultRedisURL
	}

	if versionEnv := strings.TrimSpace(os.Getenv("VERSION")); versionEnv != "" {
		config.Version = versionEnv
	} else if config.Version == "" {
		config.Version = fmt.Sprintf("%v-%v", time.Now().Month(), time.Now().Day())
	}

	// Load plugins
	loadPlugins()

	// Initialize Redis client (enforce Redis requirement)
	if _, err := database.Init(); err != nil {
		log.Fatalf("Fatal: Redis connection required. Could not connect to %s: %v", config.RedisURL, err)
	}

	app = fiber.New(fiber.Config{
		AppName: fmt.Sprintf("IP-Hub %s", config.Version),
	})

	// CORS Middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
		AllowMethods: "GET, POST, OPTIONS",
	}))

	// Configure rate limiter for /lookup and /api/whois/batch
	app.Use("/lookup", limiter.New(limiter.Config{
		Max:        100,
		Expiration: 1 * time.Minute,
	}))

	// Configure minifier
	app.Use(minifier.New(minifier.Config{
		MinifyHTML:       true,
		MinifyCSS:        true,
		MinifyJS:         true,
		MinifyJSON:       true,
		SuppressWarnings: true,
	}))

	// Configure cache for static assets
	app.Use("/assets", cache.New(cache.Config{
		Expiration:   24 * time.Hour,
		CacheControl: true,
	}))

	// Native Go WHOIS API Endpoints
	api := app.Group("/api/whois")
	api.Get("/myip", handleWhoisMyIp)
	api.Get("/lookup/*", handleWhoisLookup)
	api.Get("/lookup", handleWhoisLookup)
	api.Get("/country/:code", handleWhoisCountry)
	api.Post("/resolve-orgs", handleWhoisResolveOrgs)
	api.Post("/batch", handleWhoisBatch)
	api.Get("/subnet", handleWhoisSubnet)

	// Legacy IP-Hub plugin endpoint
	app.Post("/lookup", handleRequest)

	// Serve Frontend Single Page Application (web/dist/ and web/public/)
	app.Static("/", "./web/dist")
	app.Static("/", "./dist")
	app.Static("/public", "./web/public")

	// SPA fallback: Route all non-API GET requests to index.html
	app.Get("*", func(c *fiber.Ctx) error {
		if strings.HasPrefix(c.Path(), "/api") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Endpoint not found"})
		}
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
