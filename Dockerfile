FROM node:lts-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装依赖
FROM base AS deps
COPY package.json yarn.lock ./
RUN apk add --no-cache libc6-compat && \
    yarn install --frozen-lockfile

# 构建应用
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# 生产环境
FROM base AS runner
ENV NODE_ENV=production

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 设置适当的权限
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
