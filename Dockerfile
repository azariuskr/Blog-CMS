# =============================================================================
# DEVELOPMENT DOCKERFILE
# This is for local development only. For production, create a multi-stage
# build that compiles assets and runs with NODE_ENV=production.
# =============================================================================

FROM node:22-alpine

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

WORKDIR /app

# Ensure /app is writable for the non-root user (Vite writes timestamped config bundles)
RUN chown -R nodejs:nodejs /app

# Install deps first for better layer caching
COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
    && corepack pnpm install --frozen-lockfile \
    # Vite needs to write optimize-deps cache into node_modules/.vite
    && chown -R nodejs:nodejs /app/node_modules

# Copy app code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

EXPOSE 3000

CMD ["corepack", "pnpm", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
