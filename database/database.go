package database

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/kzeedev/IP-Hub/config"
	"github.com/kzeedev/IP-Hub/pluginBase"
)

type LookupCache struct {
	client *redis.Client
	ctx    context.Context
}

func New() (*LookupCache, error) {
	opt, err := redis.ParseURL(config.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse cache URL: %w", err)
	}

	// Configure connection pool

	client := redis.NewClient(opt)
	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to cache: %w", err)
	}

	return &LookupCache{
		client: client,
		ctx:    ctx,
	}, nil
}

func (c *LookupCache) Set(lookup pluginBase.Lookup) error {
	key := "country:" + lookup.CountryCode

	// Set the data using JSON
	_, err := c.client.JSONSet(c.ctx, key, "$", lookup).Result()
	if err != nil {
		return err
	}

	// Calculate the duration until the next 6-hour mark in UTC.
	// Add 1-minute to make sure source is updated
	now := time.Now().UTC()
	next := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()-(now.Hour()%6)+6, 1, 0, 0, time.UTC)
	duration := next.Sub(now)

	// Set expiration
	err = c.client.Expire(c.ctx, key, duration).Err()
	return err
}

func (c *LookupCache) Get(countryCode string) (*pluginBase.Lookup, error) {
	key := "country:" + countryCode

	if c.client == nil {
		fmt.Println("client is nil")
		return nil, nil
	}

	var lookup pluginBase.Lookup
	jsonText, err := c.client.JSONGet(c.ctx, key, "$").Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, err
	}
	if jsonText == "" {
		return nil, nil
	}
	jsonText = strings.TrimLeft(jsonText, "[")
	jsonText = strings.TrimRight(jsonText, "]")
	json.Unmarshal([]byte(jsonText), &lookup)

	return &lookup, nil
}

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

	err = c.Set(*lookup)
	if err != nil {
		return nil, err
	}

	return lookup, nil
}

func (c *LookupCache) Delete(countryCode string) error {
	key := "country:" + countryCode
	return c.client.Del(c.ctx, key).Err()
}

func (c *LookupCache) Health() error {
	return c.client.Ping(c.ctx).Err()
}

func (c *LookupCache) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}
