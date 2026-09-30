package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humafiber"
	"github.com/gofiber/fiber/v3"
	"github.com/kzeedev/IP-Hub/config"
	"github.com/kzeedev/IP-Hub/models"
)

type fiberContextKey struct{}

// WhoisLookupInput represents input parameters for unified WHOIS lookup
type WhoisLookupInput struct {
	Body struct {
		Query string `json:"query" doc:"IP address (IPv4/IPv6), Autonomous System Number (e.g. AS15169 or 15169), or CIDR prefix (e.g. 8.8.8.0/24)" example:"8.8.8.8"`
	}
}

// WhoisLookupOutput represents the result of a single WHOIS lookup
type WhoisLookupOutput struct {
	Body struct {
		Type string      `json:"type" doc:"Type of resource resolved: 'ip' or 'asn'" example:"ip"`
		Data interface{} `json:"data" doc:"Detailed record containing either IP WHOIS or ASN WHOIS and BGP routing data"`
	}
}

// WhoisMyIpInput represents headers that may indicate client IP
type WhoisMyIpInput struct {
	XForwardedFor string `header:"X-Forwarded-For" doc:"Client IP passed by upstream reverse proxies" example:"193.0.6.139"`
	XRealIP       string `header:"X-Real-IP" doc:"Client IP passed by upstream reverse proxies" example:"193.0.6.139"`
}

// WhoisMyIpOutput represents the client IP detection and WHOIS details
type WhoisMyIpOutput struct {
	Body struct {
		ClientIP string              `json:"clientIp" doc:"Detected public IP address of the client" example:"193.0.6.139"`
		Type     string              `json:"type" doc:"Resource type (always 'ip')" example:"ip"`
		Data     *models.WhoisRecord `json:"data" doc:"Detailed WHOIS, BGP routing, and geolocation record"`
	}
}

// WhoisCountryInput represents input for querying country IP blocks and ASNs
type WhoisCountryInput struct {
	Body struct {
		Code string `json:"code" doc:"Two-letter ISO 3166-1 alpha-2 country code (e.g. US, DE, IR, GB)" example:"IR"`
	}
}

// WhoisCountryOutput represents allocated prefixes and ASNs for a country
type WhoisCountryOutput struct {
	Body struct {
		Data *models.CountryIpResource `json:"data" doc:"Country IP prefixes, ASNs, and statistics"`
	}
}

// WhoisResolveOrgsInput represents input for bulk organization resolution
type WhoisResolveOrgsInput struct {
	Body struct {
		Prefixes []string      `json:"prefixes" doc:"List of CIDR prefixes to resolve organization names for"`
		Asns     []interface{} `json:"asns" doc:"List of ASNs (numbers or string format like AS15169) to resolve"`
	}
}

// WhoisResolveOrgsOutput represents mapping of resources to organization names
type WhoisResolveOrgsOutput struct {
	Body struct {
		Orgs map[string]string `json:"orgs" doc:"Map of resource identifier (e.g. AS15169 or prefix) to organization name"`
	}
}

// WhoisBatchInput represents input for batch IP inspection
type WhoisBatchInput struct {
	Body struct {
		Items []string `json:"items" doc:"List of IP addresses to inspect (max 50)" example:"[\"8.8.8.8\", \"1.1.1.1\"]"`
	}
}

// WhoisBatchOutput represents results of batch inspection
type WhoisBatchOutput struct {
	Body struct {
		Count int                      `json:"count" doc:"Number of processed items" example:"2"`
		Items []models.BatchItemResult `json:"items" doc:"List of inspection results"`
	}
}

// WhoisSubnetInput represents query parameters for subnet calculation
type WhoisSubnetInput struct {
	IP   string `query:"ip" doc:"IPv4 or IPv6 address (with optional CIDR prefix, e.g. 192.168.1.1/24)" example:"192.168.1.1/24"`
	CIDR string `query:"cidr" doc:"Optional CIDR prefix length (0-32 for IPv4)" example:"24"`
}

// WhoisSubnetOutput represents subnet calculation breakdown
type WhoisSubnetOutput struct {
	Body struct {
		Data *models.SubnetBreakdown `json:"data" doc:"Subnet breakdown calculations"`
	}
}

// setupOpenAPI initializes Huma v2 with GoFiber according to GoFiber OpenAPI recipes
func setupOpenAPI(app *fiber.App) huma.API {
	version := config.Version
	if version == "" {
		version = "1.0.0"
	}

	humaConfig := huma.DefaultConfig("IP-Hub API", version)
	humaConfig.OpenAPI.Info.Description = "Real-time WHOIS intelligence, country IP allocations, BGP routing inspection, and network utility tools powered by GoFiber and Huma."
	humaConfig.OpenAPI.Info.License = &huma.License{
		Name: "MIT",
		URL:  "https://opensource.org/licenses/MIT",
	}
	humaConfig.OpenAPI.Info.Contact = &huma.Contact{
		Name: "IP-Hub",
		URL:  "https://ip-hub.ir",
	}
	humaConfig.OpenAPI.Servers = []*huma.Server{
		{URL: "https://ip-hub.ir", Description: "Production API Server"},
		{URL: "http://localhost:3000", Description: "Local Development Server"},
	}

	humaConfig.DocsPath = "/docs"
	humaConfig.OpenAPIPath = "/openapi"
	humaConfig.SchemasPath = "/schemas"

	// Transformer to ensure error responses provide both RFC 9457 fields and legacy "error" field
	humaConfig.Transformers = append(humaConfig.Transformers, func(ctx huma.Context, status string, v any) (any, error) {
		if errModel, ok := v.(*huma.ErrorModel); ok {
			msg := errModel.Detail
			if msg == "" {
				msg = errModel.Title
			}
			return struct {
				*huma.ErrorModel
				Error string `json:"error"`
			}{
				ErrorModel: errModel,
				Error:      msg,
			}, nil
		}
		return v, nil
	})

	api := humafiber.New(app, humaConfig)

	// Context middleware to expose fiber.Ctx to Huma handlers
	api.UseMiddleware(func(ctx huma.Context, next func(huma.Context)) {
		fCtx := humafiber.Unwrap(ctx)
		ctx = huma.WithValue(ctx, fiberContextKey{}, fCtx)
		next(ctx)
	})

	// 1. GET /api/whois/myip
	huma.Register(api, huma.Operation{
		OperationID: "whois-myip",
		Method:      http.MethodGet,
		Path:        "/api/whois/myip",
		Summary:     "Inspect Client IP & WHOIS",
		Description: "Detects the client's public IP address (via proxy headers or direct socket) and returns detailed WHOIS ownership, geolocation, and BGP routing status.",
		Tags:        []string{"WHOIS"},
	}, func(ctx context.Context, input *WhoisMyIpInput) (*WhoisMyIpOutput, error) {
		var remoteIP string
		if fCtx, ok := ctx.Value(fiberContextKey{}).(fiber.Ctx); ok && fCtx != nil {
			remoteIP = fCtx.IP()
		}
		clientIP := input.XForwardedFor
		if clientIP == "" {
			clientIP = input.XRealIP
		}
		if clientIP == "" {
			clientIP = remoteIP
		}
		clientIP = resolveClientIP(clientIP)

		record, err := executeIpLookup(clientIP)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}

		resp := &WhoisMyIpOutput{}
		resp.Body.ClientIP = clientIP
		resp.Body.Type = "ip"
		resp.Body.Data = record
		return resp, nil
	})

	// 2. POST /api/whois/lookup
	huma.Register(api, huma.Operation{
		OperationID: "whois-lookup",
		Method:      http.MethodPost,
		Path:        "/api/whois/lookup",
		Summary:     "Lookup IP, ASN, or Prefix",
		Description: "Performs unified real-time WHOIS lookup for an IPv4 address, IPv6 address, Autonomous System Number (ASN), or CIDR prefix.",
		Tags:        []string{"WHOIS"},
	}, func(ctx context.Context, input *WhoisLookupInput) (*WhoisLookupOutput, error) {
		resource := strings.TrimSpace(input.Body.Query)
		if resource == "" {
			return nil, huma.Error400BadRequest("Missing IP, ASN, or prefix parameter")
		}

		if isAsnQuery(resource) {
			record, err := executeAsnLookup(resource)
			if err != nil {
				return nil, huma.Error500InternalServerError(err.Error())
			}
			resp := &WhoisLookupOutput{}
			resp.Body.Type = "asn"
			resp.Body.Data = record
			return resp, nil
		}

		record, err := executeIpLookup(resource)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		resp := &WhoisLookupOutput{}
		resp.Body.Type = "ip"
		resp.Body.Data = record
		return resp, nil
	})

	// 3. POST /api/whois/country
	huma.Register(api, huma.Operation{
		OperationID: "whois-country",
		Method:      http.MethodPost,
		Path:        "/api/whois/country",
		Summary:     "Query Country IP & ASN Resources",
		Description: "Fetches all allocated IPv4/IPv6 CIDR prefixes and Autonomous System Numbers (ASNs) registered for a two-letter ISO 3166-1 alpha-2 country code.",
		Tags:        []string{"Country Resources"},
	}, func(ctx context.Context, input *WhoisCountryInput) (*WhoisCountryOutput, error) {
		code := strings.ToUpper(strings.TrimSpace(input.Body.Code))
		if len(code) != 2 || code[0] < 'A' || code[0] > 'Z' || code[1] < 'A' || code[1] > 'Z' {
			return nil, huma.Error400BadRequest("Country code must be a 2-letter ISO 3166-1 alpha-2 code (e.g. US, DE, IR)")
		}

		res, err := executeCountryLookup(code)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}

		resp := &WhoisCountryOutput{}
		resp.Body.Data = res
		return resp, nil
	})

	// 4. POST /api/whois/resolve-orgs
	huma.Register(api, huma.Operation{
		OperationID: "whois-resolve-orgs",
		Method:      http.MethodPost,
		Path:        "/api/whois/resolve-orgs",
		Summary:     "Bulk Resolve Organization Names",
		Description: "Resolves holder and ISP organization names for lists of Autonomous System Numbers (ASNs) and CIDR prefixes.",
		Tags:        []string{"Country Resources"},
	}, func(ctx context.Context, input *WhoisResolveOrgsInput) (*WhoisResolveOrgsOutput, error) {
		if len(input.Body.Prefixes) > 50 || len(input.Body.Asns) > 50 {
			return nil, huma.Error400BadRequest("Exceeded maximum allowed items: limit is 50 prefixes and 50 ASNs per request")
		}

		orgs := executeResolveOrgs(input.Body.Asns, input.Body.Prefixes)
		resp := &WhoisResolveOrgsOutput{}
		resp.Body.Orgs = orgs
		return resp, nil
	})

	// 5. POST /api/whois/batch
	huma.Register(api, huma.Operation{
		OperationID: "whois-batch",
		Method:      http.MethodPost,
		Path:        "/api/whois/batch",
		Summary:     "Batch IP WHOIS Inspection",
		Description: "Inspects up to 50 IP addresses in parallel, returning concise network ownership, origin ASN, netname, country, and abuse contact information.",
		Tags:        []string{"WHOIS"},
	}, func(ctx context.Context, input *WhoisBatchInput) (*WhoisBatchOutput, error) {
		if len(input.Body.Items) == 0 {
			return nil, huma.Error400BadRequest("Request body must contain 'items' array")
		}
		if len(input.Body.Items) > 50 {
			return nil, huma.Error400BadRequest("Batch size exceeds maximum limit of 50 items")
		}

		results := executeBatchLookup(input.Body.Items)
		resp := &WhoisBatchOutput{}
		resp.Body.Count = len(results)
		resp.Body.Items = results
		return resp, nil
	})

	// 6. GET /api/whois/subnet
	huma.Register(api, huma.Operation{
		OperationID: "whois-subnet",
		Method:      http.MethodGet,
		Path:        "/api/whois/subnet",
		Summary:     "Calculate Subnet & CIDR Breakdown",
		Description: "Calculates network address, broadcast address, netmask, wildcard mask, usable host range, and total/usable host counts for an IP address and optional CIDR prefix.",
		Tags:        []string{"Network Tools"},
	}, func(ctx context.Context, input *WhoisSubnetInput) (*WhoisSubnetOutput, error) {
		ip := strings.TrimSpace(input.IP)
		if ip == "" {
			return nil, huma.Error400BadRequest("Query parameter 'ip' is required")
		}
		if len(ip) > 64 {
			return nil, huma.Error400BadRequest("Query parameter 'ip' exceeds maximum length")
		}

		var cidrPtr *int
		if strings.TrimSpace(input.CIDR) != "" {
			if cVal, err := strconv.Atoi(strings.TrimSpace(input.CIDR)); err == nil {
				cidrPtr = &cVal
			}
		}

		res := computeSubnet(ip, cidrPtr)
		if res == nil {
			return nil, huma.Error400BadRequest("Invalid IP or CIDR format")
		}

		resp := &WhoisSubnetOutput{}
		resp.Body.Data = res
		return resp, nil
	})

	// 7. RFC 9727 API Catalog Endpoint (/.well-known/api-catalog)
	app.Get("/.well-known/api-catalog", func(c fiber.Ctx) error {
		baseURL := "https://ip-hub.ir"
		if host := c.Hostname(); host != "" && !strings.Contains(host, "ip-hub.ir") {
			proto := "https"
			if strings.HasPrefix(host, "localhost") || strings.HasPrefix(host, "127.0.0.1") {
				proto = "http"
			}
			baseURL = fmt.Sprintf("%s://%s", proto, host)
		}

		catalog := fiber.Map{
			"linkset": []fiber.Map{
				{
					"anchor": baseURL + "/api/whois",
					"service-desc": []fiber.Map{
						{
							"href": baseURL + "/openapi.json",
							"type": "application/vnd.oai.openapi+json;version=3.1",
						},
						{
							"href": baseURL + "/openapi.yaml",
							"type": "application/vnd.oai.openapi;version=3.1",
						},
					},
					"service-doc": []fiber.Map{
						{
							"href": baseURL + "/docs",
							"type": "text/html",
						},
					},
					"status": []fiber.Map{
						{
							"href": baseURL + "/api/whois/myip",
						},
					},
				},
			},
		}

		data, err := json.Marshal(catalog)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString(err.Error())
		}

		c.Set("Content-Type", "application/linkset+json")
		return c.Send(data)
	})

	return api
}
