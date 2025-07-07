FROM node:lts-slim

WORKDIR /app

COPY . .

RUN corepack enable
RUN corepack prepare

RUN export NODE_ENV=production

RUN yarn install
RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]