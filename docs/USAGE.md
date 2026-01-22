# CommandDeck 使用指南

本文档说明如何通过 UI 管理项目与 Agent，并与正在运行的 Agent 通信。

## 1. 启动 CommandDeck

在项目根目录运行：

```bash
pnpm install
pnpm dev
```

这会启动 Hub（`127.0.0.1:8787`）和桌面端。

## 2. 维护全局项目列表

CommandDeck 读取全局配置：`~/.commanddeck/projects.json`。
你可以在 UI 中维护它：

1. 在左侧 “Projects” 输入项目名（例如 `mpwriter`）。
2. 如果 `~/Projects/mpwriter` 不存在，UI 会提示是否创建该目录。
3. 创建后会自动写入 `projects.json`。

如果项目名不是域名但需要 Cloudflare 数据，请在 `projects.json` 里设置 `domain`：

```json
{
  "projects": [
    {
      "name": "newlayer",
      "path": "/Users/you/Projects/newlayer",
      "domain": "newlayer.dev"
    }
  ]
}
```

没有 `domain` 的项目会被视为非网站项目，Hub 会跳过 Cloudflare Analytics 拉取。

配置文件示例：

```json
{
  "projects": [
    { "name": "mpwriter", "path": "/Users/you/Projects/mpwriter" }
  ]
}
```

## 3. 连接 Hub 并订阅项目

1. 选择一个项目。
2. 填写 Hub URL（默认 `ws://127.0.0.1:8787/stream`）。
3. 点击 Connect，右侧事件面板会显示该项目的事件流。

说明：Connect 只影响“事件流展示”。启动/发送消息给 Agent 不依赖此连接。

## 4. 启动 Agent

1. 选择项目。
2. 点击 “Start Agent”。
3. CommandDeck 会在 `~/Projects/<project>` 下执行 `claude`。
4. Agent 会自动命名为 `Alice`, `Bob`, `Clara` 等。

同一项目可以启动多个 Agent。

## 5. 与 Agent 通信

在右侧 “Message Agent” 面板：

1. 选择正在运行的 Agent。
2. 输入消息并点击 Send。

消息会通过 stdin 发送到该 `claude` 进程。

## 6. 验证事件上报（可选）

如果你配置了 hooks，Agent 会自动上报事件到 Hub，并在 UI 中显示。
hooks 配置见 `docs/DEVELOPMENT.md`。
