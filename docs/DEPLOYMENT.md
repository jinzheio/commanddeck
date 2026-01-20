# 部署指南

## Phase 1: 本地部署

### 构建桌面应用

```bash
# 安装依赖
pnpm install

# 构建生产版本
pnpm build

# 打包 Electron 应用
pnpm --filter desktop package

# 输出位置
# macOS: apps/desktop/dist/CommandDeck.dmg
# Windows: apps/desktop/dist/CommandDeck.exe
# Linux: apps/desktop/dist/CommandDeck.AppImage
```

### 手动启动 Hub

如果不使用 Electron，可以单独启动 Hub：

```bash
# 构建 Hub
pnpm --filter hub build

# 启动
node apps/hub/dist/server.js
```

### 数据存储位置

| 平台 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/CommandDeck/` |
| Windows | `%APPDATA%/CommandDeck/` |
| Linux | `~/.config/CommandDeck/` |

文件：
- `events.sqlite` - 事件数据库
- `config.json` - 配置文件

---

## Phase 2: 云端部署

### 前提条件

- 一台 VPS（支持 WebSocket 长连接）
- 域名 + SSL 证书

### 部署 Hub 到 VPS

```bash
# 在服务器上克隆仓库
git clone https://github.com/yourname/commanddeck.git
cd commanddeck

# 安装依赖
pnpm install

# 构建
pnpm --filter hub build

# 使用 PM2 运行
pm2 start apps/hub/dist/server.js --name commanddeck-hub
```

### Nginx 反向代理

```nginx
server {
    listen 443 ssl;
    server_name commanddeck.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;  # 24h for WebSocket
    }
}
```

### 配置 Agent

修改环境变量指向云端：

```bash
export AGENT_CONSOLE_URL=https://commanddeck.yourdomain.com
```

### 配置 Electron 连接云端

修改配置文件或环境变量：

```json
{
  "hubUrl": "wss://commanddeck.yourdomain.com/stream"
}
```

---

## 安全配置

### 启用 Token 鉴权

1. 生成 Token：

```bash
openssl rand -hex 32
```

2. 配置 Hub 环境变量：

```bash
export AGENT_TOKEN=your_generated_token
export UI_TOKEN=your_ui_token
```

3. Agent 请求头：

```bash
curl -X POST https://commanddeck.yourdomain.com/events \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '...'
```

4. UI WebSocket 连接：

```typescript
const ws = new WebSocket('wss://commanddeck.yourdomain.com/stream', {
  headers: { 'Authorization': `Bearer ${UI_TOKEN}` }
})
```

---

## 监控

### 日志

```bash
# PM2 日志
pm2 logs commanddeck-hub

# 实时监控
pm2 monit
```

### 健康检查

```bash
curl http://127.0.0.1:8787/health
```

---

## 数据备份

### 导出 SQLite

```bash
sqlite3 ~/.config/CommandDeck/events.sqlite ".backup backup.db"
```

### 数据清理

保留最近 30 天：

```sql
DELETE FROM events WHERE server_ts < datetime('now', '-30 days');
VACUUM;
```
