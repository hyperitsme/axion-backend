FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production=false
COPY . .
RUN npm run prisma:generate && npm run build
EXPOSE 8080
CMD ["node","dist/index.js"]
