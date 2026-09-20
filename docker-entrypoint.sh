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

# Mechanical room readout - polls Home Assistant for the room's temperature
# and humidity sensors and writes them where nginx can serve them as a
# static file. Runs as a background loop rather than a second container: one
# image, one Watchtower scope, no new port. Unset any of the four vars and
# this is a no-op - the endpoint 404s and the landing page's sample values
# stand, same as UMAMI_API_TOKEN's "unset = skip" default above.
if [ -n "$HA_BASE_URL" ] && [ -n "$HA_TOKEN" ] && [ -n "$HA_TEMP_ENTITY_ID" ] && [ -n "$HA_HUMIDITY_ENTITY_ID" ]; then
    (
        mkdir -p /usr/share/nginx/html/api/basement
        while true; do
            temperature=$(curl -sf -H "Authorization: Bearer $HA_TOKEN" \
                "$HA_BASE_URL/api/states/$HA_TEMP_ENTITY_ID" | jq -r '.state')
            humidity=$(curl -sf -H "Authorization: Bearer $HA_TOKEN" \
                "$HA_BASE_URL/api/states/$HA_HUMIDITY_ENTITY_ID" | jq -r '.state')

            if [ -n "$temperature" ] && [ -n "$humidity" ] \
                && [ "$temperature" != "null" ] && [ "$humidity" != "null" ]; then
                jq -n --arg t "$temperature" --arg h "$humidity" \
                    '{temperature: ($t | tonumber), humidity: ($h | tonumber)}' \
                    > /usr/share/nginx/html/api/basement/metrics.json.tmp \
                    && mv /usr/share/nginx/html/api/basement/metrics.json.tmp \
                        /usr/share/nginx/html/api/basement/metrics.json
            fi

            sleep 300
        done
    ) &
fi

exec nginx -g 'daemon off;'
