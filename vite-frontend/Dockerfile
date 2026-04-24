# 多阶段构建 - 构建阶段
FROM node:20.19.0 AS builder

WORKDIR /app

# 增加 Node 内存限制，防止 CI 环境 OOM
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package*.json ./
RUN npm install --legacy-peer-deps --prefer-offline --no-audit --progress=false

COPY . .
RUN npx vite build

# 生产阶段
FROM nginx:stable-alpine AS production-stage

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
