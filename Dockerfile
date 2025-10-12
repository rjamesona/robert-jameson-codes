FROM node:18-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --production

COPY public ./public

EXPOSE 8080

CMD ["npm", "start"]
