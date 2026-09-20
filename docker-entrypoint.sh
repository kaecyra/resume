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

        # HA_BASE_URL with a trailing slash (as HA's own UI shows it,
        # "http://homeassistant.local:8123/") would otherwise double up
        # against the leading slash below into "//api/states/...", which
        # HA's router 404s on rather than normalizing.
        ha_base_url=${HA_BASE_URL%/}

        # HA reports a disconnected or not-yet-initialized sensor's state as
        # the string "unavailable" or "unknown" rather than null, and `jq
        # tonumber` on either would abort the write with a parse error.
        is_usable_reading() {
            case "$1" in
                "" | null | unavailable | unknown) return 1 ;;
                *) return 0 ;;
            esac
        }

        while true; do
            temp_response=$(curl -sf --max-time 10 -H "Authorization: Bearer $HA_TOKEN" \
                "$ha_base_url/api/states/$HA_TEMP_ENTITY_ID")
            humidity_response=$(curl -sf --max-time 10 -H "Authorization: Bearer $HA_TOKEN" \
                "$ha_base_url/api/states/$HA_HUMIDITY_ENTITY_ID")

            temperature=$(printf '%s' "$temp_response" | jq -r '.state')
            humidity=$(printf '%s' "$humidity_response" | jq -r '.state')
            # `last_reported` (HA 2024.9+) is when the entity last reported in
            # at all, changed or not - the truest "is this still syncing"
            # signal. `last_updated` is the fallback for older HA versions.
            updated_at=$(printf '%s' "$temp_response" | jq -r '.last_reported // .last_updated // empty')

            if is_usable_reading "$temperature" && is_usable_reading "$humidity" && [ -n "$updated_at" ]; then
                jq -n --arg t "$temperature" --arg h "$humidity" --arg u "$updated_at" \
                    '{temperature: ($t | tonumber), humidity: ($h | tonumber), updated_at: $u}' \
                    > /usr/share/nginx/html/api/basement/metrics.json.tmp \
                    && mv /usr/share/nginx/html/api/basement/metrics.json.tmp \
                        /usr/share/nginx/html/api/basement/metrics.json
            fi

            sleep 300
        done
    ) &
fi

exec nginx -g 'daemon off;'
