import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const backendDockerfile = resolve('backend', 'Dockerfile');
const frontendDockerfile = resolve('frontend', 'Dockerfile');

const backendContent = `FROM node:20-alpine

WORKDIR /app

RUN printf '{"name":"agro-backend","private":true,"type":"module"}' > package.json \
  && npm install pg@8.16.3 --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/index.js"]
`;

const frontendContent = `FROM node:20-alpine

WORKDIR /app

COPY public ./public
COPY server.js ./server.js

EXPOSE 3000

CMD ["node", "server.js"]
`;

await mkdir(resolve('backend'), { recursive: true });
await mkdir(resolve('frontend'), { recursive: true });

await writeFile(backendDockerfile, backendContent, 'utf-8');
await writeFile(frontendDockerfile, frontendContent, 'utf-8');

console.log('✅ Dockerfiles reparados com sucesso');
