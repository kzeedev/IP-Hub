package config

// LookupEndpoint is the hardcoded RIPEstat country resource list API endpoint
const LookupEndpoint = "https://stat.ripe.net/data/country-resource-list/data.json?resource="

// DefaultRedisURL is the default local Redis connection string
const DefaultRedisURL = "redis://localhost:6379/2"

var RedisURL string = DefaultRedisURL
var Version string
