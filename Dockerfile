FROM node:lts-alpine

WORKDIR /app

COPY . .

RUN corepack enable
RUN corepack prepare

RUN yarn install --immutable
RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]