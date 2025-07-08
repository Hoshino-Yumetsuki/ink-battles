# Ink Battles

## 项目简介
Ink Battles 是一个AI写作作品分析平台。它允许用户输入文本或上传包含文字的图片，从多个维度对作品进行量化评分，并给出改进建议，帮助作者提升创作质量。

## 主要功能
1. **文本 / 图片输入**：支持直接粘贴文本，也支持上传图片并通过 `GPT-4o` 、 `Gemini` 或者其它支持 Vision 的模型的识别能力识别文本内容。
2. **多维度评分**：对作品在"人物塑造力、结构复杂度、情节反转密度、情感穿透力、文体魅力、先锋性 / 实验性"等维度进行 1-5 分打分，并给出总分、评价标签及自定义标题。
3. **可配置分析选项**：可开启初始评分、成稿质量评估、内容审核、文本风格检测、热点话题分析、反资本审查、极速评审等分析模块。

## Playground

快来试试我们的在线实例：https://ink-battles.yumetsuki.moe/

## 环境变量
在根目录创建 `.env.local` 并填入：
```
# OpenAI 相关
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 如需自定义代理或兼容 Azure，可设置：
OPENAI_BASE_URL=https://api.openai.com/v1

# 指定模型 (可选，默认 gpt-4o)
MODEL=gpt-4o
```

## 快速开始
### 1. 克隆并安装依赖
```bash
# 使用 pnpm / npm 亦可
$ yarn install
```

### 2. 本地开发
```bash
$ yarn dev          # 默认在 http://localhost:3000 运行
```

### 3. 生产构建
```bash
$ yarn build        # 生成 .next 产物
$ yarn start        # 以生产模式启动
```

### 4. Docker 一键运行
如果你更喜欢容器化部署：
```bash
$ docker build -t ink-battles .
$ docker run -p 3000:3000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  ink-battles
```

## 许可证
本项目基于 **MIT License** 开源

