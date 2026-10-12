# AzureDrop API production image
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 5001

# Apply schema on boot, then start the API.
CMD ["sh", "-c", "npm run migrate && npm start"]
