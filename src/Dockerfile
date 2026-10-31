
# Use Node.js 24 on Alpine Linux.
FROM node:24-alpine

# Set the application directory.
WORKDIR /usr/src/app

# Configure production mode and listening port.
ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests first for Docker layer caching.
COPY package.json package-lock.json ./

# Install exact production dependencies from the lockfile.
RUN npm ci --omit=dev

# Copy application files and assign ownership to the non-root user.
COPY --chown=node:node . .

# Run the application without root privileges.
USER node

# Document the application port.
EXPOSE 3000

# Start the Express application.
CMD ["npm", "start"]
