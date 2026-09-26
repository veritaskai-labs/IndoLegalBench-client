# Production image for the web app, used by the Kubernetes deployment.
#
# NEXT_PUBLIC_API_BASE_URL is inlined into the JavaScript at build time, so
# the image is built for one API address and cannot be pointed elsewhere by
# a runtime env var. Build it with:
#
#   docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.legalbench.veritask.ai -t indolegalbench-client .

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
# Without the arg the code falls back to http://localhost:8000, which builds
# fine and then fails every request in the browser. Fail the build instead.
RUN test -n "$NEXT_PUBLIC_API_BASE_URL" \
    || (echo "Build arg NEXT_PUBLIC_API_BASE_URL is required" && exit 1)
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# The node image ships an unprivileged "node" user; never run as root.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
