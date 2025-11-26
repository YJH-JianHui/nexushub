FROM node:20-alpine

LABEL maintainer="NexusHub"
LABEL description="NexusHub - Personal Navigation Dashboard"

WORKDIR /app

# 只复制运行时需要的文件
COPY dist ./dist
COPY public ./public
COPY server ./server
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 创建必要的目录
RUN mkdir -p /app/data /app/public/uploads

# 暴露端口(只需要一个端口,服务器同时提供前端和API)
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/data', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令
CMD ["node", "server/index.js"]
