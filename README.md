#Tree of thought 


每条记录包含：

- `keyword`：性格或认知关键词
- `scene`：当时交流场景
- `collision`：你的思维碰撞
- `cognition`：最终沉淀
- `nodes`：最后认知图谱里的节点

## 本地运行

```bash
pnpm install
pnpm run dev
```

## 构建

```bash
pnpm run build
```

GitHub Pages 发布使用 `dist` 构建产物。

## 体验模式

- 普通链接是收礼人视角，只展示开场、果实阅读、树的生长和最终认知节点。
- 链接末尾增加 `?edit=1` 会显示本地记录入口；这里保存的是当前浏览器草稿，不会自动同步到 GitHub Pages。
- “开启手势”会在用户主动点击后请求摄像头权限，并按需加载 MediaPipe。摄像头画面仅在浏览器本地用于手部节点识别。
- 鼠标和触屏始终可用，摄像头被拒绝或设备性能不足时仍能完整观看。
