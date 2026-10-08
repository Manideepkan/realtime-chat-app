# ---------- Stage 1: dev (all dependencies + source, used by Jenkins for lint and unit tests) ----------
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .

# ---------- Stage 2: production dependencies only ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# ---------- Stage 3: runtime image ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/server.js"]
