FROM node:24-alpine AS build

# Chromium for Puppeteer PDF generation
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG PUBLIC_BASE_URL=""
ARG PUBLIC_UMAMI_WEBSITE_ID=""
ENV PUBLIC_BASE_URL=${PUBLIC_BASE_URL}
ENV PUBLIC_UMAMI_WEBSITE_ID=${PUBLIC_UMAMI_WEBSITE_ID}

RUN npm run build

# Generate icons (no server needed)
RUN npm run generate-icons

# Generate OG images and PDFs: start preview server, run Puppeteer, stop server
RUN (npm run preview &) && sleep 2 && npm run generate-og && npm run generate-pdf

FROM nginx:stable-alpine

RUN apk add --no-cache apache2-utils

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
