FROM node:16-alpine
WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn
COPY . .
RUN yarn build
ENV PORT=3000
EXPOSE ${PORT}
CMD ["yarn", "start"]
