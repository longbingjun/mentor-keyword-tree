# 带教认知树

一个给带教的沉浸式互动页面：右侧是动态粒子树，左侧是每天沉淀出的关键词、场景、思维碰撞和认知节点。

## 内容维护

每天新增记录时，编辑：

```text
src/data/records.js
```

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
