FROM node:lts-alpine

WORKDIR /app

COPY . .

RUN corepack enable
RUN corepack prepare

RUN yarn install
RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]