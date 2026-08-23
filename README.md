<div align="center">

# 🌐 IP-Hub

**Real-time WHOIS Intelligence & Country IP List Generator**

[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev)
[![Fiber](https://img.shields.io/badge/Fiber-v3.5-00ACD7?style=flat-square&logo=go&logoColor=white)](https://gofiber.io)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com)
[![GHCR](https://img.shields.io/badge/GHCR-Package-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/kzeedev/IP-Hub/pkgs/container/ip-hub)
[![Version](https://img.shields.io/github/v/tag/kzeedev/IP-Hub?label=version&style=flat-square&color=brightgreen)](https://github.com/kzeedev/IP-Hub/tags)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

A self-hosted, open-source network intelligence platform powered by **RIPE NCC** data. Query WHOIS records, explore country IP allocations, generate firewall rules for MikroTik/Cisco/iptables, and perform batch lookups — all from a single, blazing-fast interface.

<br/>

<img src="web/public/img/logo.webp" alt="IP-Hub Logo" width="128" />

<br/>

🔗 **Live Demo** — [ip-hub.ir](https://ip-hub.ir)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **WHOIS Lookup** | Real-time IP, ASN, and CIDR prefix lookups via RIPE NCC RIPEstat API |
| 🌍 **Country IP Explorer** | Browse complete IPv4/IPv6 allocations per country with filtering and search |
| 🧱 **Firewall Rule Generator** | Export IP lists as **MikroTik** address-lists, **Cisco ACL**, **.htaccess**, **iptables**, or **FreeBSD PF** rules |
| 📦 **Batch Inspector** | Query up to 50 IPs/ASNs at once with CSV/JSON export |
| 🧮 **Subnet Calculator** | Compute network range, broadcast, subnet mask, wildcard, and binary breakdown |
| 🛡️ **Turnstile Protection** | Cloudflare Turnstile CAPTCHA on all API endpoints |
| 🌐 **Multi Language** | Full English and Persian (فارسی) interface with RTL support |
| ⚡ **Redis Caching** | Smart caching layer for fast repeat queries and reduced upstream load |
| 🔌 **Plugin System** | Dynamic Go plugin architecture for custom firewall output formats |

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                   Browser (SPA)                  │
│         React 19 · Vite · Tailwind CSS 4         │
└────────────────────┬─────────────────────────────┘
                     │  POST JSON + Turnstile Token
                     ▼
┌──────────────────────────────────────────────────┐
│               Go Fiber v3 Backend                │
│   ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│   │  WHOIS   │  │ Country  │  │   Batch      │   │
│   │  Lookup  │  │ Explorer │  │  Inspector   │   │
│   └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│        │             │               │           │
│   ┌────▼─────────────▼───────────────▼───────┐   │
│   │           Redis Cache Layer              │   │
│   └────────────────┬─────────────────────────┘   │
│                    │                             │
│   ┌────────────────▼─────────────────────────┐   │
│   │     RIPE NCC RIPEstat API (upstream)     │   │
│   └──────────────────────────────────────────┘   │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │  Dynamic Plugins (.so)                   │   │
│   │  MikroTik · Cisco · iptables · PF        │   │
│   └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Go** ≥ 1.25
- **Node.js** ≥ 20
- **Redis** server running

### 1. Clone & Configure

```bash
git clone https://github.com/kzeedev/IP-Hub.git
cd IP-Hub
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3000
REDIS_URL=redis://localhost:6379/1
TURNSTILE_SECRET=your_cloudflare_turnstile_secret_key
TURNSTILE_HOSTNAMES=localhost,127.0.0.1
VITE_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key
```

### 2. Build Frontend

```bash
cd web
npm install
npm run build
cd ..
```

### 3. Run Backend

```bash
go run .
```

The server starts at **http://localhost:3000**.

## 🐳 Docker

### Using GitHub Container Registry

```bash
docker pull ghcr.io/kzeedev/ip-hub:latest
```

```bash
docker run -d \
  --name ip-hub \
  -p 3000:3000 \
  -e REDIS_URL=redis://host.docker.internal:6379/1 \
  -e TURNSTILE_SECRET=your_secret \
  -e TURNSTILE_HOSTNAMES=your-domain.com \
  ghcr.io/kzeedev/ip-hub:latest
```

### Build Locally

```bash
docker build -t ip-hub --build-arg Version=v2.1.1 .
docker run -d -p 3000:3000 --env-file .env ip-hub
```

## 🔌 Building Plugins

IP-Hub features an extensible dynamic Go plugin architecture. Plugins allow developers to export country IP allocations, prefixes, and WHOIS data into custom firewall formats, routing scripts, or access-control lists (e.g., MikroTik, Cisco, iptables, nftables, UFW, pfSense).

### Built-in Plugins

| Plugin | Identifier | Output Format |
|---|---|---|
| **MikroTik** | `mikrotik` | MikroTik RouterOS `/ip firewall address-list` |
| **Cisco** | `cisco` | Cisco IOS `ip access-list` ACL entries |
| **Linux ipset** | `ipset` | Linux `ipset` / `iptables` rules |
| **FreeBSD PF** | `freebsd-pf` | FreeBSD `pf.conf` table definitions |

---

### Plugin Architecture

Plugins are written in Go as `package main`, compiled into shared object libraries (`.so`), and loaded dynamically at startup via Go's standard `plugin` package.

Each plugin implements the `Plugin` interface defined in [`pluginBase`](pluginBase/base.go):

```go
package pluginBase

type Lookup struct {
	CountryCode string   // ISO 3166-1 alpha-2 code (e.g., "DE", "US", "IR")
	CountryName string   // Full country name (e.g., "Germany", "United States")
	ASN         []string // List of allocated ASNs
	IPv4        []string // Allocated IPv4 CIDR prefixes
	IPv6        []string // Allocated IPv6 CIDR prefixes
	UpdatedAt   string   // Timestamp from upstream RIPE NCC
}

type IPVersion string

const (
	Any  IPVersion = "any"
	IPv4 IPVersion = "ipv4"
	IPv6 IPVersion = "ipv6"
)

type Plugin interface {
	// GetID returns the unique identifier of the plugin (e.g., "ufw")
	GetID() string

	// GetName returns the human-readable display name (e.g., "Ubuntu UFW")
	GetName() string

	// Format processes the lookup data and returns formatted firewall rules
	Format(lookup Lookup, version IPVersion, access bool) string
}
```

---

### Step-by-Step Guide to Creating a Custom Plugin

#### 1. Create a Plugin Directory

Create a dedicated folder for your plugin inside the `plugins/` directory:

```bash
mkdir -p plugins/ufw
```

#### 2. Implement the Plugin Code

Create `plugins/ufw/ufw.go` in `package main`:

```go
package main

import (
	"fmt"

	"github.com/kzeedev/IP-Hub/pluginBase"
)

const (
	id   string = "ufw"
	name string = "Ubuntu UFW"
)

// UfwPlugin implements the pluginBase.Plugin interface
type UfwPlugin struct {
	*pluginBase.BasePlugin
}

// NewUfwPlugin creates a new instance of UfwPlugin
func NewUfwPlugin() *UfwPlugin {
	return &UfwPlugin{
		BasePlugin: pluginBase.NewBasePlugin(id, name),
	}
}

// Format generates UFW firewall commands for the given IP blocks
func (p *UfwPlugin) Format(data pluginBase.Lookup, ipVersion pluginBase.IPVersion, access bool) string {
	action := "allow"
	if !access {
		action = "deny"
	}

	var rules string

	if ipVersion == pluginBase.IPv4 || ipVersion == pluginBase.Any {
		for _, ip := range data.IPv4 {
			rules += fmt.Sprintf("ufw %s from %s to any\n", action, ip)
		}
	}

	if ipVersion == pluginBase.IPv6 || ipVersion == pluginBase.Any {
		for _, ip := range data.IPv6 {
			rules += fmt.Sprintf("ufw %s from %s to any\n", action, ip)
		}
	}

	return fmt.Sprintf("# Updated at: %s\n# Country: %s (%s)\n%s",
		data.UpdatedAt, data.CountryName, data.CountryCode, rules)
}

// Export the plugin symbol (MUST be an exported variable named 'Plugin')
var Plugin pluginBase.Plugin = NewUfwPlugin()
```

> [!IMPORTANT]
> - The package name **must** be `main`.
> - The file **must** export a package-level variable named `Plugin` of type `pluginBase.Plugin`.
> - You can embed `*pluginBase.BasePlugin` using `pluginBase.NewBasePlugin(id, name)` for default `GetID()` and `GetName()` implementations.

#### 3. Compile the Plugin

Compile your plugin into a Go shared object (`.so`):

```bash
go build -buildmode=plugin -ldflags="-s -w" -trimpath -o plugins/ufw/ufw.so plugins/ufw/ufw.go
```

> [!NOTE]
> Go plugin compilation requires `CGO_ENABLED=1` and is supported on Linux systems. If you are building with Docker, the multi-stage [`Dockerfile`](Dockerfile) will automatically discover and compile all `.go` files inside `plugins/*/*.go` into their respective `.so` files.

#### 4. Run and Test

Place the compiled `.so` file inside `plugins/<plugin-name>/` (or let Docker handle it). When IP-Hub starts, `loadPlugins()` automatically discovers all `.so` binaries in the `plugins/` directory and registers them.

## 🛠️ Development

### Frontend Dev Server

```bash
cd web
npm run dev
```

Vite dev server runs at `http://localhost:5173` with hot module replacement.

### Type Checking

```bash
cd web
npm run lint
```

### Backend with Live Reload

```bash
go run .
```

## 🌍 Internationalization

IP-Hub ships with full support for:

- 🇬🇧 **English** — Default language
- 🇮🇷 **فارسی (Persian)** — Complete RTL layout with localized strings

Language can be toggled from the settings modal in the UI.

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `REDIS_URL` | ✅ | Redis connection string |
| `TURNSTILE_SECRET` | ✅ | Cloudflare Turnstile secret key |
| `TURNSTILE_HOSTNAMES` | ❌ | Comma-separated allowed hostnames for Turnstile |
| `PORT` | ❌ | Server port (default: `3000`) |
| `VITE_TURNSTILE_SITE_KEY` | ✅ | Turnstile site key (frontend build-time) |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ using Go, React & RIPE NCC data

[Report Bug](https://github.com/kzeedev/IP-Hub/issues) · [Request Feature](https://github.com/kzeedev/IP-Hub/issues)

</div>
