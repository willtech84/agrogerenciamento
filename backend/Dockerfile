FROM node:20-alpine

WORKDIR /app

RUN printf '{"name":"agro-backend","private":true,"type":"module"}' > package.json   && npm install pg@8.16.3 --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/index.js"]
