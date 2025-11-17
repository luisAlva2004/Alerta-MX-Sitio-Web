# Etapa 1: build de dependencias
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Etapa 2: contenedor final
FROM node:20-alpine
WORKDIR /app

# Copiamos dependencias desde el builder
COPY --from=builder /app/node_modules ./node_modules

# Copiamos todo el código fuente del backend + frontend
COPY . .

# Variables de entorno
ENV NODE_ENV=production
# Exponer puerto del backend
EXPOSE 8080

# Comando de inicio
CMD ["node", "index.js"]
