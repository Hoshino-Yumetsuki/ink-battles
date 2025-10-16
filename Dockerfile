FROM node:lts-slim

WORKDIR /app

COPY . .

RUN npm install -g corepack
RUN corepack enable
RUN corepack install -g yarn

RUN export NODE_ENV=production

RUN yarn install --immutable
RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]