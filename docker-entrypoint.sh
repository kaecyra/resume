#!/bin/sh

if [ -n "$DASHBOARD_USER" ] && [ -n "$DASHBOARD_PASSWORD" ]; then
    HASHED=$(openssl passwd -apr1 "$DASHBOARD_PASSWORD")
    echo "${DASHBOARD_USER}:${HASHED}" > /etc/nginx/.htpasswd
else
    : > /etc/nginx/.htpasswd
fi

exec nginx -g 'daemon off;'
