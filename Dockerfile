FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p /app/data /app/uploads

ENV NODE_ENV=production
ENV APP_URL=http://localhost:3000
EXPOSE 3000

CMD ["npm", "run", "start"]
