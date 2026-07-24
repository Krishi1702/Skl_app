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

LE_DIR="/etc/letsencrypt/live/${DOMAIN}"
SELF_DIR="/etc/nginx/self-signed/${DOMAIN}"

# Chicken-and-egg: nginx refuses to start with `listen 443 ssl` when the
# certificate is missing, but certbot needs a running nginx to answer the ACME
# challenge. A self-signed cert breaks the cycle.
#
# It deliberately lives OUTSIDE /etc/letsencrypt. Certbot refuses to reuse a
# live/ lineage it did not create and silently issues to "<domain>-0001"
# instead, which nginx would never read — so it must stay off certbot's turf.
if [ -s "${LE_DIR}/fullchain.pem" ]; then
    CERT_DIR="${LE_DIR}"
    echo "[nginx] Using Let's Encrypt certificate at ${LE_DIR}"
else
    CERT_DIR="${SELF_DIR}"
    echo "[nginx] No Let's Encrypt certificate found for ${DOMAIN}."
    echo "[nginx] Falling back to a self-signed certificate — browsers WILL warn."
    echo "[nginx] Issue the real one, then restart nginx (see docs/DEPLOYMENT.md)."
    if [ ! -s "${SELF_DIR}/fullchain.pem" ]; then
        mkdir -p "${SELF_DIR}"
        openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
            -keyout "${SELF_DIR}/privkey.pem" \
            -out    "${SELF_DIR}/fullchain.pem" \
            -subj   "/CN=${DOMAIN}" 2>/dev/null
    fi
fi

mkdir -p /var/www/certbot

# Substitute ONLY these two; nginx variables like $host must survive verbatim.
export DOMAIN CERT_DIR
envsubst '${DOMAIN} ${CERT_DIR}' \
    < /etc/nginx/tls-template/default.conf.template \
    > /etc/nginx/conf.d/default.conf

echo "[nginx] TLS config installed for ${DOMAIN} (cert dir: ${CERT_DIR})"

# Certbot renews in its own container and writes to the shared volume; nginx
# only picks up the new files on reload.
( while :; do sleep 6h; nginx -s reload 2>/dev/null || true; done ) &