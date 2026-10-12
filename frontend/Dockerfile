# --- build stage ------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Empty VITE_API_BASE_URL => same-origin requests, served/proxied by Nginx.
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# --- runtime stage ----------------------------------------------------------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
