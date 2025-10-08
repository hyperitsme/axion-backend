FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY prisma ./prisma
COPY src ./src
RUN npm run prisma:generate && npm run build
EXPOSE 8080
CMD ["node","dist/index.js"]
