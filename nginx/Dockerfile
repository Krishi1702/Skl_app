FROM nginx:1.25-alpine

# openssl → self-signed bootstrap cert; gettext → envsubst for the TLS template
RUN apk add --no-cache openssl gettext

RUN rm /etc/nginx/conf.d/default.conf

# Plain-HTTP config, used as-is in dev (TLS_ENABLED unset).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# TLS config, rendered over the above only when TLS_ENABLED=true.
COPY tls-template/ /etc/nginx/tls-template/
COPY docker-entrypoint.d/ /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/*.sh