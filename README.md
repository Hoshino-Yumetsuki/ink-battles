# Ink Battles

## 项目简介
Ink Battles 是一个 AI 写作作品分析平台。它允许用户输入文本或上传包含文字的图片，从多个维度对作品进行量化评分，并给出改进建议，帮助作者提升创作质量。

## 主要功能
1. **文本 / 图片输入**：支持直接粘贴文本，也支持上传图片并通过 `GPT-4o`、`Gemini` 或其它支持 Vision 的模型识别文本内容。
2. **多维度评分**：对作品在人物塑造力、结构复杂度、情节反转密度、情感穿透力、文体魅力、先锋性 / 实验性等维度打分。
3. **可配置分析选项**：可开启初始评分、成稿质量评估、内容审核、文本风格检测、热点话题分析、评审等分析模块。

## Playground

在线实例：https://ink-battles.yumetsuki.moe/

## 技术栈

- Vite + React SPA
- Elysia API
- Cloudflare Workers + Rolldown worker build
- Yarn 4

## 环境变量
在根目录创建 `.env` 并填入。浏览器可见变量必须使用 `VITE_` 前缀，服务端密钥保持为 Worker 环境变量或 Wrangler secret。

```
# 客户端公开变量
VITE_API_BASE_URL=
VITE_CAP_ENABLED=false

# 服务端密钥和业务配置
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1
MODEL=gemini-3.1-pro-preview
USE_STREAMING=false
MONGODB_URI=
MONGODB_DB_NAME=ink-battles
JWT_SECRET=
```

## 快速开始

### 1. 安装依赖

```bash
yarn install
```

### 2. 本地开发

```bash
yarn dev
```

### 3. 生产构建

```bash
yarn build
```

### 4. 本地预览

```bash
yarn preview
```

### 5. 部署

```bash
yarn deploy
```

### 6. Cloudflare 类型生成

```bash
yarn cf-typegen
```

## 许可证
本项目基于 **GPL-3.0 license** 开源
