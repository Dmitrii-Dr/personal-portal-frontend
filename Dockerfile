# Use an official lightweight Node.js image
FROM node:20-alpine AS base

WORKDIR /usr/src/app

# Install dependencies based on the package and lock files
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the production bundle
RUN npm run build

# Use a smaller runtime image
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production


# Copy compiled assets and node_modules from previous stage
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/package*.json ./
COPY --from=base /usr/src/app/dist ./dist

# Expose the port used by `vite preview`
EXPOSE 4173

# Start the preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
