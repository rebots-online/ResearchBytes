# Migration Plan: Gemini → Fully Self-Hosted Open Source

## Executive Summary

This document outlines the migration strategy from Google Gemini proprietary inference to a **100% self-hosted, open-source stack** deployable entirely on Coolify homelab infrastructure.

**Core Principles:**
- 🏠 **Full Self-Hosting** — No third-party cloud dependencies
- 🚫 **No Cloudflare** — Ideological preference for sovereignty
- 🌐 **Self-Hosted DNS** — Technitium DNS Server
- 📝 **Namecheap Registrar** — Domain registration only (no hosting)
- 🔒 **Maximum Data Sovereignty** — All inference runs on your hardware
- 💰 **Zero Recurring SaaS Costs** — Only electricity and hardware amortization

**What We're Eliminating:**
- ❌ Google Gemini API
- ❌ Google Cloud Run
- ❌ Cloudflare (DNS/CDN/Tunnel)
- ❌ Netlify / Vercel / Surge.sh
- ❌ OpenRouter / Together.ai / Groq
- ❌ Replicate / FAL.ai
- ❌ Any paid inference APIs

---

## Architecture Overview

### Current State (Proprietary Dependencies)

```mermaid
graph LR
    subgraph "Current Architecture"
        A[React SPA] -->|Direct API Call| B[Google Gemini API]
        B --> C[gemini-3-pro-preview]
        B --> D[gemini-3-pro-image-preview]
        B --> E[veo-3.1-fast-generate]
        B --> F[Google Search Grounding]
    end

    style B fill:#f44336,stroke:#333,stroke-width:2px
    style C fill:#ff9800,stroke:#333
    style D fill:#ff9800,stroke:#333
    style E fill:#ff9800,stroke:#333
    style F fill:#ff9800,stroke:#333
```

### Target State (100% Self-Hosted)

```mermaid
graph TB
    subgraph "Public Internet"
        U[User Browser]
    end

    subgraph "DNS Layer - Self Hosted"
        NC[Namecheap<br/>NS Delegation Only]
        TD[Technitium DNS<br/>Self-Hosted :53]
    end

    subgraph "Homelab - Coolify Managed"
        direction TB

        subgraph "Edge Layer"
            CAD[Caddy Reverse Proxy<br/>Let's Encrypt SSL]
        end

        subgraph "Application Layer"
            SPA[React SPA<br/>Static Files]
            API[Hono API Gateway<br/>Node.js]
        end

        subgraph "Inference Layer"
            OL[Ollama<br/>Llama 3.3 / Qwen 2.5]
            CUI[ComfyUI<br/>FLUX.1 / SDXL]
            VID[Mochi / CogVideoX<br/>Video Generation]
        end

        subgraph "Support Services"
            SX[SearxNG<br/>Web Search]
            LLM[LiteLLM<br/>OpenAI-Compatible Gateway]
            RED[Redis / Valkey<br/>Cache + Queue]
            PG[PostgreSQL<br/>Persistence]
        end

        subgraph "Monitoring"
            UPT[Uptime Kuma]
            PROM[Prometheus]
            GRAF[Grafana]
        end
    end

    U -->|HTTPS| TD
    TD -->|Resolve| CAD
    NC -.->|NS Records| TD
    CAD --> SPA
    CAD --> API
    API --> LLM
    LLM --> OL
    API --> CUI
    API --> VID
    API --> SX
    API --> RED
    API --> PG

    style TD fill:#4caf50,stroke:#333,stroke-width:2px
    style CAD fill:#ff9800,stroke:#333,stroke-width:2px
    style OL fill:#2196f3,stroke:#333
    style CUI fill:#9c27b0,stroke:#333
    style VID fill:#e91e63,stroke:#333
    style SX fill:#00bcd4,stroke:#333
    style SPA fill:#8bc34a,stroke:#333
```

---

## Network Topology Map

```mermaid
graph TB
    subgraph "Internet Edge"
        ISP[ISP Router/Modem<br/>Port Forward 80,443,53]
        DDNS[ddclient<br/>Dynamic DNS Updater]
    end

    subgraph "Namecheap (Registration Only)"
        REG[Domain Registration]
        NS_REC[NS Records → Your IP]
        GLUE[Glue Records<br/>ns1/ns2.yourdomain.com]
    end

    subgraph "DMZ / Edge Network"
        FW[pfSense / OPNsense<br/>Firewall]
        TECH[Technitium DNS<br/>:53 UDP/TCP<br/>:5380 Web UI]
    end

    subgraph "Homelab Primary VLAN"
        subgraph "Coolify Control Plane"
            COOL[Coolify Dashboard<br/>:3000]
            DOCKER[Docker Engine]
        end

        subgraph "Web Tier"
            CAD[Caddy Proxy<br/>:443 :80]
            STATIC[Static File Server<br/>React SPA Build]
        end

        subgraph "API Tier"
            HONO[Hono API Server<br/>:3001]
            LITELLM[LiteLLM Gateway<br/>:4000]
        end
    end

    subgraph "GPU VLAN (Isolated)"
        subgraph "LLM Inference"
            GPU_OL[Ollama Server<br/>:11434<br/>GPU 0]
        end

        subgraph "Image Generation"
            GPU_COMFY[ComfyUI<br/>:8188<br/>GPU 1]
        end

        subgraph "Video Generation"
            GPU_VID[Mochi / CogVideoX<br/>:8000<br/>GPU 0+1]
        end
    end

    subgraph "Services VLAN"
        SEARX[SearxNG :8080]
        REDIS[Redis/Valkey :6379]
        POSTGRES[PostgreSQL :5432]
        MINIO[MinIO S3 :9000]
    end

    subgraph "Monitoring VLAN"
        UPTIME[Uptime Kuma :3001]
        PROMETHEUS[Prometheus :9090]
        GRAFANA[Grafana :3000]
    end

    ISP --> FW
    DDNS --> TECH
    REG --> NS_REC
    NS_REC --> GLUE
    GLUE --> TECH
    FW --> TECH
    FW --> CAD

    CAD --> STATIC
    CAD --> HONO
    HONO --> LITELLM
    LITELLM --> GPU_OL
    HONO --> GPU_COMFY
    HONO --> GPU_VID
    HONO --> SEARX
    HONO --> REDIS
    HONO --> POSTGRES
    HONO --> MINIO

    COOL --> DOCKER
    DOCKER --> CAD
    DOCKER --> HONO
    DOCKER --> GPU_OL
    DOCKER --> GPU_COMFY

    UPTIME --> CAD
    PROMETHEUS --> HONO
    GRAFANA --> PROMETHEUS

    style TECH fill:#4caf50,stroke:#333,stroke-width:3px
    style GPU_OL fill:#e91e63,stroke:#333,stroke-width:2px
    style GPU_COMFY fill:#9c27b0,stroke:#333,stroke-width:2px
    style GPU_VID fill:#ff5722,stroke:#333,stroke-width:2px
    style CAD fill:#ff9800,stroke:#333,stroke-width:2px
    style COOL fill:#2196f3,stroke:#333,stroke-width:2px
```

---

## Phased Implementation Timeline

```mermaid
gantt
    title Self-Hosted Migration - Implementation Phases
    dateFormat  YYYY-MM-DD
    section Phase 1: Infrastructure
        Coolify Installation           :p1a, 2024-01-01, 2d
        Technitium DNS Setup           :p1b, after p1a, 2d
        Namecheap NS Delegation        :p1c, after p1b, 1d
        Caddy Reverse Proxy            :p1d, after p1a, 1d
        SSL via Let's Encrypt          :p1e, after p1d, 1d
        ddclient Dynamic DNS           :p1f, after p1b, 1d
    section Phase 2: Core Services
        Redis/Valkey Cache             :p2a, after p1e, 1d
        PostgreSQL Database            :p2b, after p1e, 1d
        MinIO Object Storage           :p2c, after p1e, 1d
        SearxNG Search Engine          :p2d, after p2a, 2d
    section Phase 3: LLM Inference
        Ollama Installation            :p3a, after p2d, 2d
        Model Downloads                :p3b, after p3a, 3d
        LiteLLM Gateway                :p3c, after p3a, 1d
        Embedding Models               :p3d, after p3b, 1d
    section Phase 4: Image Generation
        ComfyUI Installation           :p4a, after p3c, 2d
        FLUX.1 Model Setup             :p4b, after p4a, 2d
        SDXL + LoRA Models             :p4c, after p4b, 1d
        Workflow Templates             :p4d, after p4c, 2d
    section Phase 5: Video Generation
        Mochi Installation             :p5a, after p4d, 3d
        CogVideoX Backup               :p5b, after p5a, 2d
        Video Queue System             :p5c, after p5b, 2d
    section Phase 6: API Development
        Hono API Scaffold              :p6a, after p3c, 2d
        Research Endpoint              :p6b, after p6a, 3d
        Image Endpoints                :p6c, after p4d, 2d
        Video Endpoints                :p6d, after p5c, 2d
    section Phase 7: Frontend
        Provider Abstraction           :p7a, after p6b, 2d
        Environment Config             :p7b, after p7a, 1d
        Static Build                   :p7c, after p7b, 1d
        Deploy to Coolify              :p7d, after p7c, 1d
    section Phase 8: Hardening
        Uptime Kuma Monitoring         :p8a, after p7d, 1d
        Prometheus Metrics             :p8b, after p8a, 2d
        Security Audit                 :p8c, after p8b, 2d
        Documentation                  :p8d, after p8c, 2d
```

---

## Phase Details

### Phase 1: Infrastructure Foundation

**Duration: 5-7 days**

#### 1.1 Coolify Installation

```mermaid
sequenceDiagram
    participant ADMIN as Admin
    participant SERVER as Homelab Server
    participant COOLIFY as Coolify
    participant DOCKER as Docker

    ADMIN->>SERVER: SSH into server
    ADMIN->>SERVER: curl -fsSL https://get.coolify.io | bash
    SERVER->>DOCKER: Install Docker Engine
    SERVER->>COOLIFY: Deploy Coolify containers
    COOLIFY->>ADMIN: Web UI available :3000
    ADMIN->>COOLIFY: Configure SSH keys
    ADMIN->>COOLIFY: Add server as destination
    Note over COOLIFY: Ready to deploy services
```

**Coolify Benefits for Self-Hosting:**
- Git-based deployments (GitHub/GitLab/Gitea)
- Automatic SSL via Let's Encrypt
- Built-in Docker Compose support
- Environment variable management
- Resource monitoring
- No vendor lock-in

#### 1.2 Technitium DNS Server

```yaml
# coolify/stacks/technitium.yaml
services:
  technitium:
    image: technitium/dns-server:latest
    container_name: technitium-dns
    hostname: ns1
    ports:
      - "53:53/udp"
      - "53:53/tcp"
      - "5380:5380/tcp"   # Admin UI
      - "53443:53443/tcp" # DNS-over-HTTPS
    volumes:
      - technitium_config:/etc/dns/config
      - technitium_logs:/etc/dns/logs
    environment:
      - DNS_SERVER_DOMAIN=ns1.${DOMAIN}
      - DNS_SERVER_ADMIN_PASSWORD=${DNS_ADMIN_PASSWORD}
      - DNS_SERVER_PREFER_IPV6=false
      - DNS_SERVER_LOG_USING_LOCAL_TIME=true
    restart: unless-stopped
    networks:
      - dns_network

  ddclient:
    image: lscr.io/linuxserver/ddclient:latest
    container_name: ddclient
    volumes:
      - ./ddclient.conf:/config/ddclient.conf
    restart: unless-stopped
    networks:
      - dns_network

volumes:
  technitium_config:
  technitium_logs:

networks:
  dns_network:
    driver: bridge
```

**ddclient.conf for Dynamic IP:**
```conf
# /config/ddclient.conf
daemon=300
syslog=yes
pid=/var/run/ddclient/ddclient.pid
ssl=yes

# Update Technitium DNS via HTTP API
use=web, web=checkip.amazonaws.com
protocol=dyndns2
server=localhost:5380
login=admin
password='${DNS_ADMIN_PASSWORD}'
ns1.${DOMAIN}, ns2.${DOMAIN}, api.${DOMAIN}, app.${DOMAIN}
```

#### 1.3 Namecheap Configuration

| Record Type | Host | Value | Notes |
|-------------|------|-------|-------|
| **NS** | @ | ns1.yourdomain.com | Primary nameserver |
| **NS** | @ | ns2.yourdomain.com | Secondary (same IP OK) |
| **Glue A** | ns1 | YOUR_PUBLIC_IP | Set in Advanced DNS |
| **Glue A** | ns2 | YOUR_PUBLIC_IP | Set in Advanced DNS |

**In Technitium, create zones:**
- `yourdomain.com` (Primary Zone)
  - A record: `@` → Internal Caddy IP
  - A record: `api` → Internal Caddy IP
  - A record: `app` → Internal Caddy IP
  - A record: `*.` → Internal Caddy IP (wildcard)

#### 1.4 Caddy Reverse Proxy

```yaml
# coolify/stacks/caddy.yaml
services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy-proxy
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    environment:
      - DOMAIN=${DOMAIN}
    restart: unless-stopped
    networks:
      - frontend
      - backend

volumes:
  caddy_data:
  caddy_config:

networks:
  frontend:
    external: true
  backend:
    external: true
```

**Caddyfile (Self-Hosted Frontend + API):**
```caddyfile
{
    email admin@{$DOMAIN}
    acme_ca https://acme-v02.api.letsencrypt.org/directory
}

# Main Application (React SPA)
app.{$DOMAIN} {
    root * /srv/app
    file_server
    try_files {path} /index.html

    encode gzip zstd

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}

# API Gateway
api.{$DOMAIN} {
    reverse_proxy hono-api:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }

    header {
        Access-Control-Allow-Origin "https://app.{$DOMAIN}"
        Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization"
    }
}

# ComfyUI (Protected)
comfyui.{$DOMAIN} {
    basicauth {
        admin $2a$14$Zkx3WDvK8Vs8Jkz... # bcrypt hash
    }
    reverse_proxy comfyui:8188
}

# SearxNG (Optional Public Access)
search.{$DOMAIN} {
    reverse_proxy searxng:8080
}

# Monitoring
status.{$DOMAIN} {
    reverse_proxy uptime-kuma:3001
}

# Coolify Dashboard (Protected)
coolify.{$DOMAIN} {
    reverse_proxy coolify:3000
}
```

---

### Phase 2: Support Services

**Duration: 3-4 days**

```mermaid
flowchart LR
    subgraph "Support Services Stack"
        subgraph "Caching"
            REDIS[Redis/Valkey<br/>In-Memory Cache]
        end

        subgraph "Persistence"
            PG[PostgreSQL 16<br/>Research Sessions]
            MINIO[MinIO<br/>Generated Media]
        end

        subgraph "Search"
            SEARX[SearxNG<br/>Meta Search Engine]
        end
    end

    API[Hono API] --> REDIS
    API --> PG
    API --> MINIO
    API --> SEARX

    style REDIS fill:#dc382d,stroke:#333
    style PG fill:#336791,stroke:#333
    style MINIO fill:#c72c48,stroke:#333
    style SEARX fill:#3498db,stroke:#333
```

```yaml
# coolify/stacks/support-services.yaml
services:
  # ============================================
  # Caching Layer
  # ============================================
  valkey:
    image: valkey/valkey:7-alpine
    container_name: valkey-cache
    command: valkey-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - valkey_data:/data
    restart: unless-stopped
    networks:
      - backend
    healthcheck:
      test: ["CMD", "valkey-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # ============================================
  # Database
  # ============================================
  postgres:
    image: postgres:16-alpine
    container_name: postgres-db
    environment:
      - POSTGRES_USER=${PG_USER}
      - POSTGRES_PASSWORD=${PG_PASSWORD}
      - POSTGRES_DB=messynah
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${PG_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================
  # Object Storage
  # ============================================
  minio:
    image: minio/minio:latest
    container_name: minio-storage
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    restart: unless-stopped
    networks:
      - backend

  # ============================================
  # Search Engine
  # ============================================
  searxng:
    image: searxng/searxng:latest
    container_name: searxng
    volumes:
      - ./searxng/settings.yml:/etc/searxng/settings.yml:ro
      - ./searxng/limiter.toml:/etc/searxng/limiter.toml:ro
    environment:
      - SEARXNG_BASE_URL=https://search.${DOMAIN}
      - SEARXNG_SECRET=${SEARXNG_SECRET}
    restart: unless-stopped
    networks:
      - backend
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID

volumes:
  valkey_data:
  postgres_data:
  minio_data:

networks:
  backend:
    external: true
```

**SearxNG Settings (searxng/settings.yml):**
```yaml
use_default_settings: true

general:
  instance_name: "Self-Hosted Search"
  enable_metrics: false

search:
  safe_search: 0
  autocomplete: "google"
  default_lang: "en"
  formats:
    - html
    - json  # Required for API access

server:
  secret_key: "${SEARXNG_SECRET}"
  limiter: true
  image_proxy: true
  http_protocol_version: "1.1"

outgoing:
  request_timeout: 6.0
  max_request_timeout: 15.0

engines:
  - name: google
    engine: google
    shortcut: g
    disabled: false

  - name: duckduckgo
    engine: duckduckgo
    shortcut: ddg
    disabled: false

  - name: wikipedia
    engine: wikipedia
    shortcut: wp
    disabled: false

  - name: arxiv
    engine: arxiv
    shortcut: arx
    disabled: false
```

---

### Phase 3: LLM Inference

**Duration: 5-6 days**

```mermaid
flowchart TB
    subgraph "LLM Inference Stack"
        subgraph "Gateway"
            LITELLM[LiteLLM<br/>OpenAI-Compatible API<br/>:4000]
        end

        subgraph "Ollama Instance"
            OL[Ollama Server<br/>:11434]

            subgraph "Models"
                M1[llama3.3:70b-instruct-q4_K_M<br/>~40GB VRAM]
                M2[qwen2.5:32b-instruct-q5_K_M<br/>~22GB VRAM]
                M3[nomic-embed-text<br/>~275MB]
                M4[llava:34b<br/>~20GB VRAM]
            end
        end
    end

    API[Hono API] --> LITELLM
    LITELLM --> OL
    OL --> M1
    OL --> M2
    OL --> M3
    OL --> M4

    style LITELLM fill:#4caf50,stroke:#333,stroke-width:2px
    style OL fill:#2196f3,stroke:#333,stroke-width:2px
    style M1 fill:#ff9800,stroke:#333
    style M2 fill:#ff9800,stroke:#333
```

```yaml
# coolify/stacks/llm-inference.yaml
services:
  # ============================================
  # Ollama - Local LLM Server
  # ============================================
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    volumes:
      - ollama_models:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
      - OLLAMA_ORIGINS=*
      - OLLAMA_NUM_PARALLEL=2
      - OLLAMA_MAX_LOADED_MODELS=2
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped
    networks:
      - inference
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ============================================
  # LiteLLM - OpenAI-Compatible Gateway
  # ============================================
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: litellm
    volumes:
      - ./litellm_config.yaml:/app/config.yaml:ro
    environment:
      - LITELLM_MASTER_KEY=${LITELLM_API_KEY}
      - LITELLM_LOG_LEVEL=INFO
    command: ["--config", "/app/config.yaml", "--port", "4000"]
    depends_on:
      ollama:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - inference
      - backend

  # ============================================
  # Model Preloader (Init Container)
  # ============================================
  ollama-init:
    image: ollama/ollama:latest
    container_name: ollama-init
    depends_on:
      ollama:
        condition: service_healthy
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        echo "Pulling models..."
        ollama pull llama3.3:70b-instruct-q4_K_M
        ollama pull qwen2.5:32b-instruct-q5_K_M
        ollama pull nomic-embed-text
        ollama pull llava:34b
        echo "All models ready!"
    environment:
      - OLLAMA_HOST=ollama:11434
    networks:
      - inference
    restart: "no"

volumes:
  ollama_models:

networks:
  inference:
    driver: bridge
  backend:
    external: true
```

**LiteLLM Configuration (100% Local):**
```yaml
# litellm_config.yaml
model_list:
  # Primary reasoning model
  - model_name: gpt-4
    litellm_params:
      model: ollama/llama3.3:70b-instruct-q4_K_M
      api_base: http://ollama:11434
    model_info:
      mode: chat
      max_tokens: 8192

  # Fast model for simple tasks
  - model_name: gpt-3.5-turbo
    litellm_params:
      model: ollama/qwen2.5:32b-instruct-q5_K_M
      api_base: http://ollama:11434
    model_info:
      mode: chat
      max_tokens: 32768

  # Embedding model
  - model_name: text-embedding-ada-002
    litellm_params:
      model: ollama/nomic-embed-text
      api_base: http://ollama:11434
    model_info:
      mode: embedding

  # Vision model
  - model_name: gpt-4-vision-preview
    litellm_params:
      model: ollama/llava:34b
      api_base: http://ollama:11434
    model_info:
      mode: chat

litellm_settings:
  drop_params: true
  set_verbose: false
  request_timeout: 600

router_settings:
  routing_strategy: "simple-shuffle"
  num_retries: 3
  timeout: 600
  retry_after: 5

  # Local-only fallback chain
  fallbacks:
    - gpt-4: [gpt-3.5-turbo]

general_settings:
  master_key: ${LITELLM_API_KEY}
```

---

### Phase 4: Image Generation

**Duration: 6-8 days**

```mermaid
flowchart LR
    subgraph "Image Generation Pipeline"
        REQ[API Request] --> PARSE[Parse Style]

        PARSE --> ROUTE{Route by Style}

        ROUTE -->|Photorealistic| FLUX[FLUX.1-dev<br/>~23GB VRAM]
        ROUTE -->|Fast Draft| SCHNELL[FLUX.1-schnell<br/>~23GB VRAM]
        ROUTE -->|Artistic| SDXL[SDXL 1.0<br/>~8GB VRAM]
        ROUTE -->|Anime| PONY[Pony Diffusion<br/>~8GB VRAM]

        FLUX --> COMFY[ComfyUI<br/>Workflow Engine]
        SCHNELL --> COMFY
        SDXL --> COMFY
        PONY --> COMFY

        COMFY --> QUEUE[Queue Manager]
        QUEUE --> GPU[GPU Execution]
        GPU --> SAVE[Save to MinIO]
        SAVE --> RESP[Return URL]
    end

    style FLUX fill:#9c27b0,stroke:#333,stroke-width:2px
    style COMFY fill:#ff9800,stroke:#333,stroke-width:2px
```

```yaml
# coolify/stacks/image-generation.yaml
services:
  # ============================================
  # ComfyUI - Image Generation Backend
  # ============================================
  comfyui:
    image: ghcr.io/ai-dock/comfyui:pytorch-2.3.0-py3.11-cuda-12.1.0-runtime-22.04
    container_name: comfyui
    volumes:
      - comfyui_output:/workspace/ComfyUI/output
      - comfyui_input:/workspace/ComfyUI/input
      - comfyui_models:/workspace/ComfyUI/models
      - ./workflows:/workspace/ComfyUI/user/default/workflows:ro
    environment:
      - CLI_ARGS=--listen 0.0.0.0 --port 8188
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
    networks:
      - inference
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8188/system_stats"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ============================================
  # Model Downloader (Init)
  # ============================================
  comfyui-models:
    image: alpine:latest
    container_name: comfyui-model-init
    volumes:
      - comfyui_models:/models
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        apk add --no-cache wget aria2

        # FLUX.1-dev (requires HuggingFace login)
        echo "Download FLUX models manually or via HF CLI"

        # SDXL Base
        aria2c -x 16 -d /models/checkpoints \
          "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"

        # SDXL Refiner
        aria2c -x 16 -d /models/checkpoints \
          "https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/resolve/main/sd_xl_refiner_1.0.safetensors"

        # VAE
        aria2c -x 16 -d /models/vae \
          "https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors"

        echo "Base models downloaded!"
    restart: "no"

volumes:
  comfyui_output:
  comfyui_input:
  comfyui_models:

networks:
  inference:
    external: true
```

**ComfyUI API Integration Example:**
```typescript
// services/comfyui.ts
interface ComfyUIClient {
  queuePrompt(workflow: object): Promise<string>;
  getImage(filename: string): Promise<Buffer>;
  getStatus(promptId: string): Promise<PromptStatus>;
}

async function generateImage(prompt: string, style: string): Promise<string> {
  const workflow = loadWorkflow(style); // Load appropriate JSON workflow

  // Inject prompt into workflow
  workflow["6"]["inputs"]["text"] = prompt;

  // Queue the prompt
  const response = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: workflow,
      client_id: generateClientId()
    })
  });

  const { prompt_id } = await response.json();

  // Poll for completion
  while (true) {
    const status = await getStatus(prompt_id);
    if (status.completed) {
      const imageUrl = await saveToMinio(status.outputs[0]);
      return imageUrl;
    }
    await sleep(1000);
  }
}
```

---

### Phase 5: Video Generation

**Duration: 5-7 days**

```mermaid
stateDiagram-v2
    [*] --> Queued: Submit Video Request

    Queued --> CheckGPU: Worker Available

    CheckGPU --> Mochi: GPU Memory OK
    CheckGPU --> CogVideoX: Mochi OOM
    CheckGPU --> Queued: No GPU Available

    Mochi --> Generating: Start Generation
    CogVideoX --> Generating: Start Generation

    Generating --> Encoding: Raw Frames Complete
    Encoding --> Uploading: MP4 Ready
    Uploading --> Ready: Saved to MinIO

    Ready --> [*]: Return Video URL

    Generating --> Failed: Error/Timeout
    Failed --> Queued: Retry (max 3)
    Failed --> [*]: Return Error

    note right of Mochi
        ~24GB VRAM
        5 sec @ 24fps
        ~2-3 min gen time
    end note

    note right of CogVideoX
        ~16GB VRAM
        6 sec @ 8fps
        ~5 min gen time
    end note
```

```yaml
# coolify/stacks/video-generation.yaml
services:
  # ============================================
  # Mochi Video Generation
  # ============================================
  mochi:
    image: ghcr.io/genmoai/mochi:latest
    container_name: mochi-video
    volumes:
      - mochi_models:/models
      - mochi_output:/output
    environment:
      - MODEL_DIR=/models
      - OUTPUT_DIR=/output
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
        limits:
          memory: 64G
    restart: unless-stopped
    networks:
      - inference
    command: ["python", "server.py", "--host", "0.0.0.0", "--port", "8000"]

  # ============================================
  # CogVideoX (Backup/Alternative)
  # ============================================
  cogvideox:
    image: ghcr.io/thudm/cogvideo:latest
    container_name: cogvideox
    volumes:
      - cogvideo_models:/models
      - cogvideo_output:/output
    environment:
      - CUDA_VISIBLE_DEVICES=0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
    networks:
      - inference
    profiles:
      - backup  # Only start manually

  # ============================================
  # Video Queue Worker
  # ============================================
  video-worker:
    build:
      context: ./video-worker
      dockerfile: Dockerfile
    container_name: video-worker
    environment:
      - REDIS_URL=redis://valkey:6379
      - MOCHI_URL=http://mochi:8000
      - COGVIDEO_URL=http://cogvideox:8000
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=${MINIO_USER}
      - MINIO_SECRET_KEY=${MINIO_PASSWORD}
    depends_on:
      - mochi
      - valkey
    restart: unless-stopped
    networks:
      - inference
      - backend

volumes:
  mochi_models:
  mochi_output:
  cogvideo_models:
  cogvideo_output:

networks:
  inference:
    external: true
  backend:
    external: true
```

---

### Phase 6: API Development

**Duration: 7-9 days**

```mermaid
classDiagram
    class HonoApp {
        +Hono app
        +middleware: cors, auth, rateLimit
        +routes: v1Router
    }

    class ResearchController {
        +POST /v1/research
        -searchService: SearchService
        -llmService: LLMService
        +conductResearch(topic, options)
    }

    class ImageController {
        +POST /v1/images/generate
        +POST /v1/images/edit
        -comfyService: ComfyUIService
        +generateImage(prompt, style)
        +editImage(image, instruction)
    }

    class VideoController {
        +POST /v1/videos/generate
        +GET /v1/videos/:id
        -videoQueue: VideoQueue
        +queueVideo(prompt, options)
        +getVideoStatus(id)
    }

    class LLMService {
        -litellmUrl: string
        +chat(messages): Promise~Response~
        +embed(text): Promise~number[]~
    }

    class SearchService {
        -searxngUrl: string
        +search(query): Promise~SearchResult[]~
        +groundWithSources(facts, sources)
    }

    class ComfyUIService {
        -comfyUrl: string
        -workflows: Map~string, Workflow~
        +generate(prompt, style)
        +edit(image, instruction)
    }

    class VideoQueue {
        -redis: Redis
        +enqueue(job): Promise~string~
        +getStatus(jobId): Promise~JobStatus~
    }

    class StorageService {
        -minio: MinioClient
        +upload(buffer, path): Promise~string~
        +getSignedUrl(path): Promise~string~
    }

    HonoApp --> ResearchController
    HonoApp --> ImageController
    HonoApp --> VideoController

    ResearchController --> LLMService
    ResearchController --> SearchService

    ImageController --> ComfyUIService
    ImageController --> StorageService

    VideoController --> VideoQueue
    VideoController --> StorageService

    ComfyUIService --> StorageService
```

**API Structure:**
```
api/
├── src/
│   ├── index.ts              # Hono app entry
│   ├── middleware/
│   │   ├── auth.ts           # API key validation
│   │   ├── cors.ts           # CORS configuration
│   │   ├── rateLimit.ts      # Rate limiting
│   │   └── logging.ts        # Request logging
│   ├── routes/
│   │   ├── v1/
│   │   │   ├── research.ts   # Research endpoints
│   │   │   ├── images.ts     # Image endpoints
│   │   │   ├── videos.ts     # Video endpoints
│   │   │   └── health.ts     # Health checks
│   │   └── index.ts
│   ├── services/
│   │   ├── llm.ts            # LiteLLM client
│   │   ├── search.ts         # SearxNG client
│   │   ├── comfyui.ts        # ComfyUI client
│   │   ├── video.ts          # Video queue
│   │   └── storage.ts        # MinIO client
│   ├── utils/
│   │   ├── prompts.ts        # System prompts
│   │   └── validation.ts     # Zod schemas
│   └── types/
│       └── index.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

### Phase 7: Frontend Deployment

**Duration: 3-4 days**

```mermaid
flowchart TB
    subgraph "Frontend Build & Deploy"
        subgraph "Development"
            CODE[React Source] --> BUILD[Vite Build]
            BUILD --> DIST[Static Assets<br/>/dist]
        end

        subgraph "Coolify Deployment"
            DIST --> PUSH[Git Push]
            PUSH --> COOLIFY[Coolify Detects Change]
            COOLIFY --> DOCKER[Build Docker Image]
            DOCKER --> DEPLOY[Deploy Container]
            DEPLOY --> CADDY[Serve via Caddy]
        end
    end

    style COOLIFY fill:#2196f3,stroke:#333,stroke-width:2px
    style CADDY fill:#ff9800,stroke:#333
```

**Frontend Dockerfile:**
```dockerfile
# Dockerfile.frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY --from=builder /app/dist /srv
COPY Caddyfile.frontend /etc/caddy/Caddyfile
EXPOSE 80
```

**Frontend Caddyfile:**
```caddyfile
# Caddyfile.frontend
:80 {
    root * /srv
    file_server
    try_files {path} /index.html

    encode gzip zstd

    header {
        Cache-Control "public, max-age=31536000, immutable"
        X-Content-Type-Options nosniff
    }

    @static {
        path *.js *.css *.png *.jpg *.svg *.woff2
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
}
```

---

### Phase 8: Monitoring & Hardening

**Duration: 5-7 days**

```mermaid
flowchart TB
    subgraph "Monitoring Stack"
        subgraph "Health Checks"
            UPTIME[Uptime Kuma<br/>Endpoint Monitoring]
        end

        subgraph "Metrics"
            PROM[Prometheus<br/>Metrics Collection]
            GRAF[Grafana<br/>Dashboards]
        end

        subgraph "Logs"
            LOKI[Loki<br/>Log Aggregation]
        end

        subgraph "Alerts"
            ALERT[Alertmanager<br/>Notifications]
            NTFY[ntfy.sh Self-Hosted<br/>Push Notifications]
        end
    end

    API[All Services] --> PROM
    API --> LOKI
    PROM --> GRAF
    LOKI --> GRAF
    PROM --> ALERT
    ALERT --> NTFY
    UPTIME --> NTFY

    style UPTIME fill:#4caf50,stroke:#333
    style GRAF fill:#ff9800,stroke:#333
```

```yaml
# coolify/stacks/monitoring.yaml
services:
  # ============================================
  # Uptime Monitoring
  # ============================================
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: uptime-kuma
    volumes:
      - uptime_data:/app/data
    restart: unless-stopped
    networks:
      - monitoring

  # ============================================
  # Metrics
  # ============================================
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    restart: unless-stopped
    networks:
      - monitoring
      - backend

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    restart: unless-stopped
    networks:
      - monitoring

  # ============================================
  # Logs
  # ============================================
  loki:
    image: grafana/loki:latest
    container_name: loki
    volumes:
      - loki_data:/loki
    restart: unless-stopped
    networks:
      - monitoring

  # ============================================
  # Notifications (Self-Hosted)
  # ============================================
  ntfy:
    image: binwiederhier/ntfy:latest
    container_name: ntfy
    command:
      - serve
      - --cache-file=/var/lib/ntfy/cache.db
      - --base-url=https://ntfy.${DOMAIN}
    volumes:
      - ntfy_data:/var/lib/ntfy
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  uptime_data:
  prometheus_data:
  grafana_data:
  loki_data:
  ntfy_data:

networks:
  monitoring:
    driver: bridge
  backend:
    external: true
```

---

## Complete Stack Overview

```mermaid
mindmap
  root((Self-Hosted<br/>Infrastructure))
    DNS
      Technitium DNS
      ddclient DDNS
      Namecheap NS Only
    Edge
      Caddy Proxy
      Let's Encrypt
      Rate Limiting
    Application
      React SPA
      Hono API
      WebSocket
    LLM
      Ollama
      LiteLLM Gateway
      Llama 3.3 70B
      Qwen 2.5 32B
    Image
      ComfyUI
      FLUX.1
      SDXL
      InstructPix2Pix
    Video
      Mochi
      CogVideoX
      Video Queue
    Search
      SearxNG
      Multi-Engine
    Storage
      PostgreSQL
      Redis/Valkey
      MinIO S3
    Monitoring
      Uptime Kuma
      Prometheus
      Grafana
      Loki
      ntfy
```

---

## Hardware Requirements

```mermaid
mindmap
  root((Hardware<br/>Specifications))
    Minimum Setup
      Single Server
        RTX 3090 24GB
        64GB DDR4 RAM
        1TB NVMe SSD
        8-core CPU
      Capabilities
        Llama 3.3 70B Q4
        SDXL Images
        Basic Video 480p
    Recommended Setup
      Primary Server
        RTX 4090 24GB
        128GB DDR5 RAM
        2TB NVMe SSD
        16-core CPU
      Capabilities
        Llama 3.3 70B Q5
        FLUX.1 Images
        Mochi Video 720p
    Optimal Setup
      GPU Server 1
        2x RTX 4090 48GB
        256GB RAM
        4TB NVMe
      GPU Server 2
        RTX 4090 24GB
        64GB RAM
        2TB NVMe
      Capabilities
        Multiple Concurrent
        All Modalities
        Video 1080p
    Network
      Router/Firewall
        pfSense/OPNsense
        VLAN Support
        1Gbps+ LAN
      Internet
        100Mbps Upload
        Static IP or DDNS
        Port Forward 80,443,53
```

---

## Cost Analysis (100% Self-Hosted)

| Component | Cloud (Google + Gemini) | Self-Hosted | Savings |
|-----------|------------------------|-------------|---------|
| **LLM API Calls** | $50-500/mo | $0 | 100% |
| **Image Generation** | $20-200/mo | $0 | 100% |
| **Video Generation** | $50-1000/mo | $0 | 100% |
| **Cloud Hosting** | $50-200/mo | $0 | 100% |
| **CDN/Edge** | $20-100/mo | $0 | 100% |
| **DNS** | $5-20/mo | $0 | 100% |
| **Electricity** | N/A | $40-80/mo | - |
| **Internet (Business)** | N/A | $50-100/mo | - |
| **Hardware (5yr amort.)** | N/A | $80-200/mo | - |
| **TOTAL** | **$195-2020/mo** | **$170-380/mo** | **~70-85%** |

**Break-even Analysis:**
- Initial hardware investment: $3,000 - $15,000
- Monthly operational cost: $170 - $380
- Break-even vs cloud: 3-12 months (depending on usage)

---

## Security Hardening Checklist

```mermaid
flowchart TB
    subgraph "Network Security"
        N1[✓ Firewall Rules]
        N2[✓ VLAN Segmentation]
        N3[✓ No Exposed Ports]
        N4[✓ TLS Everywhere]
    end

    subgraph "Application Security"
        A1[✓ API Authentication]
        A2[✓ Rate Limiting]
        A3[✓ Input Validation]
        A4[✓ CORS Restrictions]
    end

    subgraph "Infrastructure Security"
        I1[✓ SSH Key Only]
        I2[✓ Fail2ban]
        I3[✓ Automatic Updates]
        I4[✓ Container Isolation]
    end

    subgraph "Data Security"
        D1[✓ Encrypted Storage]
        D2[✓ Backup Strategy]
        D3[✓ Secret Management]
        D4[✓ No External Telemetry]
    end
```

---

## Rollback Strategy

```mermaid
flowchart TB
    ISSUE[Issue Detected] --> SEVERITY{Severity?}

    SEVERITY -->|Critical| FULL[Full Rollback]
    SEVERITY -->|Major| PARTIAL[Component Rollback]
    SEVERITY -->|Minor| HOTFIX[Deploy Hotfix]

    FULL --> F1[Stop All Containers]
    F1 --> F2[Restore Previous Images]
    F2 --> F3[Restore Database Backup]
    F3 --> F4[Restart Services]
    F4 --> F5[Verify Health Checks]

    PARTIAL --> P1[Identify Failed Component]
    P1 --> P2[Rollback Specific Container]
    P2 --> P3[Monitor Logs]
    P3 --> P4{Stable?}
    P4 -->|No| FULL
    P4 -->|Yes| DONE

    HOTFIX --> H1[Deploy Fix]
    H1 --> H2[Run Tests]
    H2 --> H3{Pass?}
    H3 -->|No| PARTIAL
    H3 -->|Yes| DONE

    F5 --> DONE[Resume Operations]

    style FULL fill:#f44336,stroke:#333
    style PARTIAL fill:#ff9800,stroke:#333
    style HOTFIX fill:#4caf50,stroke:#333
```

---

## Success Criteria

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Zero Cloud Dependencies** | 100% | Architecture audit |
| **API Response Time (P95)** | <3s text, <45s image | Prometheus |
| **System Uptime** | >99% | Uptime Kuma |
| **Image Quality** | ≥90% of Gemini | Human A/B testing |
| **Video Generation** | 5s @ 720p | Functional test |
| **Cost Reduction** | >70% | Monthly tracking |
| **Data Sovereignty** | 100% local | Network audit |

---

## Appendix: Environment Variables

```bash
# .env.example

# Domain
DOMAIN=yourdomain.com

# DNS
DNS_ADMIN_PASSWORD=your-secure-password

# Database
PG_USER=messynah
PG_PASSWORD=your-secure-password

# Object Storage
MINIO_USER=minio-admin
MINIO_PASSWORD=your-secure-password

# API Authentication
LITELLM_API_KEY=sk-your-litellm-key
API_SECRET_KEY=your-api-secret

# Search
SEARXNG_SECRET=your-searxng-secret

# Monitoring
GRAFANA_PASSWORD=your-grafana-password

# No external API keys needed!
# Everything runs locally.
```

---

*Document Version: 2.0*
*Last Updated: December 2024*
*Architecture: 100% Self-Hosted via Coolify*
