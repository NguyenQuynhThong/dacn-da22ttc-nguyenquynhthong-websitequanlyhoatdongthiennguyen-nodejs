# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Tailwind CSS
RUN npm run build:css || npx tailwindcss -i ./public/css/tailwind.css -o ./public/css/output.css --minify

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/views /usr/share/nginx/html/views
COPY --from=build /app/public /usr/share/nginx/html/public

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
