ARG NODE_VERSION=24-bookworm-slim
ARG COMPOSER_VERSION=2
ARG OSV_SCANNER_VERSION=v2.2.4

FROM composer:${COMPOSER_VERSION} AS composer

FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

FROM node:${NODE_VERSION}
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
