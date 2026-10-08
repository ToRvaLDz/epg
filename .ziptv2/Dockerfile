# Immagine ziptv2 = upstream iptv-org/epg (rebase notturno) + le nostre patch
# del branch `ziptv2`. Diversamente dal Dockerfile upstream (git clone in un
# layer RUN che la cache di build può riusare con sites/ vecchi) i sorgenti
# entrano con COPY: ogni cambio di file invalida la cache.
FROM node:22-alpine

ENV CRON_SCHEDULE="0 0 * * *"
ENV RUN_AT_STARTUP=true

RUN apk add --no-cache tzdata bash \
  && npm install -g pm2 \
  && mkdir /public

WORKDIR /epg
# tutto il sorgente prima di npm ci: il postinstall upstream (api:load) usa scripts/
COPY . .
RUN npm ci --no-audit --no-fund

EXPOSE 3000
CMD [ "pm2-runtime", "pm2.config.js" ]
