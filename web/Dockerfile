FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS construccion
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Guayaquil
RUN apk add --no-cache tzdata && addgroup -S tipi && adduser -S -G tipi tipi
COPY --from=construccion --chown=tipi:tipi /app/public ./public
COPY --from=construccion --chown=tipi:tipi /app/.next/standalone ./
COPY --from=construccion --chown=tipi:tipi /app/.next/static ./.next/static
USER tipi
EXPOSE 3000
CMD ["node", "server.js"]
