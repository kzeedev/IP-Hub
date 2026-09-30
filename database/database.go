package database

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/kzeedev/IP-Hub/config"
	"github.com/kzeedev/IP-Hub/pluginBase"
	"github.com/redis/go-redis/v9"
)

type LookupCache struct {
	client *redis.Client
	ctx    context.Context
}

// Global default instance
var DB *LookupCache

// Init initializes the global Redis connection pool.
func Init() (*LookupCache, error) {
	db, err := New()
	if err != nil {
		return nil, err
	}
	DB = db
	return db, nil
}

// New creates a new Redis LookupCache instance.
func New() (*LookupCache, error) {
	opt, err := redis.ParseURL(config.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL (%s): %w", config.RedisURL, err)
	}

	client := redis.NewClient(opt)
	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis (%s): %w", config.RedisURL, err)
	}

	cache := &LookupCache{
		client: client,
		ctx:    ctx,
	}
	DB = cache
	return cache, nil
}

// GetClient returns the underlying go-redis client.
func (c *LookupCache) GetClient() *redis.Client {
	return c.client
}

// SanitizeKey normalizes cache keys by stripping whitespace and control characters and enforcing a length limit.
func SanitizeKey(key string) string {
	clean := strings.Map(func(r rune) rune {
		if r <= 32 || r == 127 {
			return -1
		}
		return r
	}, key)
	if len(clean) > 128 {
		return clean[:128]
	}
	return clean
}

// SetJSON serializes any data structure to JSON and saves it in Redis with a TTL.
func (c *LookupCache) SetJSON(key string, data interface{}, ttl time.Duration) error {
	key = SanitizeKey(key)
	bytes, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal JSON for key %s: %w", key, err)
	}
	return c.client.Set(c.ctx, key, bytes, ttl).Err()
}

// GetJSON retrieves a JSON string from Redis and unmarshals it into target.
// Returns (true, nil) if key exists, (false, nil) if key was not found.
func (c *LookupCache) GetJSON(key string, target interface{}) (bool, error) {
	key = SanitizeKey(key)
	val, err := c.client.Get(c.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return false, nil
		}
		return false, err
	}
	if err := json.Unmarshal([]byte(val), target); err != nil {
		return false, fmt.Errorf("failed to unmarshal JSON for key %s: %w", key, err)
	}
	return true, nil
}

// SetString stores a raw string in Redis with a TTL.
func (c *LookupCache) SetString(key string, value string, ttl time.Duration) error {
	key = SanitizeKey(key)
	return c.client.Set(c.ctx, key, value, ttl).Err()
}

// GetString retrieves a raw string from Redis.
// Returns (value, true, nil) if key exists, ("", false, nil) if key was not found.
func (c *LookupCache) GetString(key string) (string, bool, error) {
	key = SanitizeKey(key)
	val, err := c.client.Get(c.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return "", false, nil
		}
		return "", false, err
	}
	return val, true, nil
}

// Delete removes one or more keys from Redis.
func (c *LookupCache) Delete(keys ...string) error {
	sanitized := make([]string, len(keys))
	for i, k := range keys {
		sanitized[i] = SanitizeKey(k)
	}
	return c.client.Del(c.ctx, sanitized...).Err()
}

// Set stores a pluginBase.Lookup object with expiration until the next 6-hour UTC block.
func (c *LookupCache) Set(lookup pluginBase.Lookup) error {
	key := "country:" + lookup.CountryCode

	now := time.Now().UTC()
	next := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()-(now.Hour()%6)+6, 1, 0, 0, time.UTC)
	duration := next.Sub(now)
	if duration <= 0 {
		duration = 6 * time.Hour
	}

	return c.SetJSON(key, lookup, duration)
}

// Get retrieves a cached pluginBase.Lookup object.
func (c *LookupCache) Get(countryCode string) (*pluginBase.Lookup, error) {
	key := "country:" + countryCode
	var lookup pluginBase.Lookup
	found, err := c.GetJSON(key, &lookup)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, nil
	}
	return &lookup, nil
}

// GetOrSet retrieves or fetches and caches a pluginBase.Lookup object.
func (c *LookupCache) GetOrSet(countryCode string, fetchFunc func() (*pluginBase.Lookup, error)) (*pluginBase.Lookup, error) {
	lookup, err := c.Get(countryCode)
	if err != nil {
		return nil, err
	}
	if lookup != nil {
		return lookup, nil
	}

	lookup, err = fetchFunc()
	if err != nil {
		return nil, err
	}

	if err := c.Set(*lookup); err != nil {
		return nil, err
	}

	return lookup, nil
}

// Health checks if Redis ping succeeds.
func (c *LookupCache) Health() error {
	return c.client.Ping(c.ctx).Err()
}

// Close closes the Redis connection pool.
func (c *LookupCache) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}

// Package-level convenience functions using global DB:

func SetJSON(key string, data interface{}, ttl time.Duration) error {
	if DB == nil {
		return fmt.Errorf("redis database client is not initialized")
	}
	return DB.SetJSON(key, data, ttl)
}

func GetJSON(key string, target interface{}) (bool, error) {
	if DB == nil {
		return false, fmt.Errorf("redis database client is not initialized")
	}
	return DB.GetJSON(key, target)
}

func SetString(key string, value string, ttl time.Duration) error {
	if DB == nil {
		return fmt.Errorf("redis database client is not initialized")
	}
	return DB.SetString(key, value, ttl)
}

func GetString(key string) (string, bool, error) {
	if DB == nil {
		return "", false, fmt.Errorf("redis database client is not initialized")
	}
	return DB.GetString(key)
}

func Delete(keys ...string) error {
	if DB == nil {
		return fmt.Errorf("redis database client is not initialized")
	}
	return DB.Delete(keys...)
}
