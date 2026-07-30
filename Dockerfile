FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Imagen final para ejecutar el servidor Node
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080
ENV HOST=0.0.0.0
ENV PORT=8080

# Ejecutar el servidor generado por Astro
CMD ["node", "./dist/server/entry.mjs"]
