#!/bin/sh
# Runs before nginx starts (the official image executes /docker-entrypoint.d/*.sh).
#
# Dev leaves TLS_ENABLED unset, so this exits immediately and the plain HTTP
# conf.d/default.conf baked into the image is used unchanged.
set -e

if [ "${TLS_ENABLED:-false}" != "true" ]; then
    echo "[nginx] TLS_ENABLED is not 'true' — serving plain HTTP on :80"
    exit 0
fi

if [ -z "${DOMAIN:-}" ]; then
    echo "[nginx] ERROR: TLS_ENABLED=true requires DOMAIN to be set." >&2
    exit 1
fi

CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

# Chicken-and-egg: nginx refuses to start with `listen 443 ssl` if the
# certificate files are missing, but certbot needs a running nginx to answer
# the ACME challenge. A throwaway self-signed cert breaks the cycle — certbot
# overwrites it at the same path on first issuance.
if [ ! -s "${CERT_DIR}/fullchain.pem" ]; then
    echo "[nginx] No certificate at ${CERT_DIR} — generating a temporary self-signed one."
    echo "[nginx] Browsers WILL warn until certbot issues the real certificate."
    mkdir -p "${CERT_DIR}"
    openssl req -x509 -nodes -newkey rsa:2048 -days 2 \
        -keyout "${CERT_DIR}/privkey.pem" \
        -out    "${CERT_DIR}/fullchain.pem" \
        -subj   "/CN=${DOMAIN}" 2>/dev/null
fi

mkdir -p /var/www/certbot

# Substitute ONLY ${DOMAIN}; nginx variables like $host must survive verbatim.
export DOMAIN
envsubst '${DOMAIN}' \
    < /etc/nginx/tls-template/default.conf.template \
    > /etc/nginx/conf.d/default.conf

echo "[nginx] TLS config installed for ${DOMAIN}"

# Certbot renews in its own container and writes to the shared volume; nginx
# only picks up the new files on reload.
( while :; do sleep 6h; nginx -s reload 2>/dev/null || true; done ) &