FROM node:22-alpine

WORKDIR /app
<<<<<<< HEAD
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./

EXPOSE 3001
=======

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./

ENV PORT=3001
EXPOSE 3001

>>>>>>> origin/main
CMD ["node", "server.js"]
