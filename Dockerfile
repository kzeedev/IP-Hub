# ==========================================
# Stage 1: Build Modern React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build

# ==========================================
# Stage 2: Build Go Backend & Dynamic Plugins
# ==========================================
FROM golang:alpine AS backend-builder

RUN apk add --no-cache build-base ca-certificates

ARG Version
ARG LookupEndpoint
ENV GOCACHE=/root/.cache/go-build

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build main Go application binary
RUN go build -ldflags="-X 'github.com/kzeedev/IP-Hub/config.Version=${Version}' -X 'github.com/kzeedev/IP-Hub/config.LookupEndpoint=${LookupEndpoint}' -s -w" -trimpath -o /dist/app

# Build dynamic Go plugins
RUN for f in plugins/*/*.go; do \
        if [ -f "$f" ]; then \
            echo "Building plugin $f"; \
            dir=$(dirname "$f"); \
            mkdir -p "/dist/$dir"; \
            go build -buildmode=plugin -ldflags='-s -w' -trimpath -o "/dist/${f%.go}.so" "$f"; \
        fi \
    done

# Copy required dynamic shared libraries for musl / scratch execution
RUN ldd /dist/app 2>/dev/null | tr -s '[:blank:]' '\n' | grep '^/' | xargs -I % install -D % /dist/% || true
RUN mkdir -p /dist/lib && \
    if [ -f /lib/ld-musl-x86_64.so.1 ]; then \
        install -D /lib/ld-musl-x86_64.so.1 /dist/lib/ld-musl-x86_64.so.1 && \
        ln -sf ld-musl-x86_64.so.1 /dist/lib/libc.musl-x86_64.so.1; \
    fi

# Setup directories, SSL certificates, public assets, and compiled frontend SPA
RUN mkdir -p /dist/etc/ssl/certs /dist/public /dist/dist
RUN cp /etc/ssl/certs/ca-certificates.crt /dist/etc/ssl/certs/
RUN cp -r /build/public/* /dist/public/ 2>/dev/null || true
COPY --from=frontend-builder /app/dist /dist/dist

# ==========================================
# Stage 3: Minimal Production Image
# ==========================================
FROM scratch AS final

COPY --from=backend-builder /dist /

EXPOSE 3000
ENTRYPOINT ["/app"]
