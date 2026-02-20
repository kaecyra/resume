#!/bin/sh

if [ -n "$DASHBOARD_USER" ] && [ -n "$DASHBOARD_PASSWORD" ]; then
    htpasswd -cb /etc/nginx/.htpasswd "$DASHBOARD_USER" "$DASHBOARD_PASSWORD"
else
    : > /etc/nginx/.htpasswd
fi

if [ -n "$UMAMI_API_TOKEN" ]; then
    printf 'proxy_set_header Authorization "Bearer %s";\n' "$UMAMI_API_TOKEN" > /etc/nginx/umami_auth.conf
else
    printf 'return 503;\n' > /etc/nginx/umami_auth.conf
fi

exec nginx -g 'daemon off;'
