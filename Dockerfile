ARG OSV_SCANNER_VERSION=v2.2.4

# Pin base images by digest for reproducible builds.
# To refresh digests run:
#   docker buildx imagetools inspect node:24-bookworm-slim | grep Digest
#   docker buildx imagetools inspect composer:2 | grep Digest

# tag: composer:2
FROM composer@sha256:b09bccd91a78fe8a9ab4b33d707b862e8fe54fec17782e32683ad2a69c46867d AS composer

# tag: node:24-bookworm-slim
FROM node@sha256:242549cd46785b480c832479a730f4f2a20865d61ea2e404fdb2a5c3d3b73ecf AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

# tag: node:24-bookworm-slim
FROM node@sha256:242549cd46785b480c832479a730f4f2a20865d61ea2e404fdb2a5c3d3b73ecf
ARG OSV_SCANNER_VERSION
ARG TARGETARCH
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
RUN set -eux; \
  case "${TARGETARCH:-$(dpkg --print-architecture)}" in \
    amd64) osv_arch="amd64" ;; \
    arm64) osv_arch="arm64" ;; \
    *) echo "Unsupported OSV-Scanner architecture: ${TARGETARCH}" >&2; exit 1 ;; \
  esac; \
  apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git php-cli unzip \
  && curl -fsSL "https://github.com/google/osv-scanner/releases/download/${OSV_SCANNER_VERSION}/osv-scanner_linux_${osv_arch}" -o /usr/local/bin/osv-scanner \
  && chmod +x /usr/local/bin/osv-scanner \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
ENTRYPOINT ["node", "/app/dist/action/main.js"]
