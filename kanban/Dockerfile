FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY server.js .
COPY public/ public/
ENV PORT=4444
ENV KNOWNS_DIR=/data/.knowns
EXPOSE 4444
CMD ["node", "server.js"]
