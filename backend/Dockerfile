FROM node:20-alpine

WORKDIR /app

COPY package.json ./package.json
COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/index.js"]
