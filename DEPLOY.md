# Docker 部署指南

## 需要拷贝到服务器的文件

只需要拷贝以下文件和目录到服务器:

```
nexushub/
├── dist/                  # 构建后的前端文件(必需)
├── server/                # 后端代码(必需)
│   └── index.js
├── public/                # 静态资源(必需)
│   ├── vendor/            # 本地化的第三方库
│   ├── default-wallpaper.jpg
│   ├── favicon.ico
│   └── logo.png
├── package.json           # 依赖配置(必需)
├── package-lock.json      # 依赖锁定(必需)
├── Dockerfile             # Docker 构建文件(必需)
└── docker-compose.yml     # Docker Compose 配置(可选)
```

## 部署步骤

### 1. 本地构建

在本地机器上先构建前端:

```bash
npm run build
```

这会生成 `dist/` 目录。

### 2. 拷贝文件到服务器

将以下文件/目录拷贝到服务器:

```bash
# 使用 scp 或其他工具拷贝
scp -r dist/ server/ public/ package*.json Dockerfile docker-compose.yml user@server:/path/to/nexushub/
```

或者创建一个压缩包:

```bash
# 创建压缩包(Windows PowerShell)
Compress-Archive -Path dist,server,public,package.json,package-lock.json,Dockerfile,docker-compose.yml -DestinationPath nexushub-deploy.zip

# 或使用 7zip/WinRAR 等工具
```

### 3. 在服务器上构建 Docker 镜像

```bash
cd /path/to/nexushub
docker-compose build
```

### 4. 启动服务

```bash
docker-compose up -d
```

### 5. 访问应用

应用将在 **3001 端口**运行:
- 访问: `http://your-server:3001`

## 端口说明

- **只需要暴露 3001 端口**
- 服务器在 3001 端口同时提供:
  - 前端页面(静态文件)
  - API 接口(`/api/*`)
  - 上传的素材(`/uploads/*`)

## 数据持久化

Docker Compose 会自动挂载以下目录:
- `./data` - 配置和服务数据
- `./public/uploads` - 用户上传的素材

这些目录会在服务器上自动创建,数据会持久保存。

## 更新部署

如果需要更新应用:

1. 本地重新构建: `npm run build`
2. 拷贝新的 `dist/` 目录到服务器
3. 重新构建镜像: `docker-compose build`
4. 重启服务: `docker-compose up -d`

## 注意事项

- ⚠️ **不要**拷贝 `node_modules/` 目录(Docker 会自动安装)
- ⚠️ **不要**拷贝 `src/` 目录(已经构建到 `dist/` 中)
- ⚠️ **不要**拷贝 `.git/` 目录
- ✅ **确保** `dist/` 目录是最新构建的
- ✅ **确保** `public/vendor/` 目录包含所有本地化的资源
