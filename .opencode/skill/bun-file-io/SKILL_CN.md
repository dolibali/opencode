---
name: bun-file-io
description: 当你处理文件操作（如读取、写入、扫描或删除文件）时使用此技能。它总结了本仓库中首选的文件 API 和模式，并说明了何时使用文件系统辅助函数处理目录。
---

## 使用场景

- 在 `packages/opencode` 中编辑文件 I/O 或扫描相关代码
- 处理目录操作或外部工具

## Bun 文件 API（来自 Bun 官方文档）

- `Bun.file(path)` 是惰性的；调用 `text`、`json`、`stream`、`arrayBuffer`、`bytes`、`exists` 来读取内容
- 元数据：`file.size`（文件大小）、`file.type`（MIME 类型）、`file.name`（文件名）
- `Bun.write(dest, input)` 可写入字符串、Buffer、Blob、Response 或文件
- `Bun.file(...).delete()` 删除文件
- `file.writer()` 返回 FileSink 用于增量写入
- `Bun.Glob` + `Array.fromAsync(glob.scan({ cwd, absolute, onlyFiles, dot }))` 用于文件扫描
- 使用 `Bun.which` 查找二进制文件，然后用 `Bun.spawn` 运行它
- `Bun.readableStreamToText/Bytes/JSON` 用于处理流输出

## 何时使用 node:fs

- 使用 `node:fs/promises` 处理目录操作（`mkdir`、`readdir`、递归操作）

## 仓库代码规范

- 文件访问优先使用 Bun API，而非 Node 的 `fs`
- 读取前先检查 `Bun.file(...).exists()`
- 对于二进制/大文件，使用 `arrayBuffer()` 并通过 `file.type` 检查 MIME 类型
- 文件扫描使用 `Bun.Glob` + `Array.fromAsync`
- 使用 `Bun.readableStreamToText` 解码工具的 stderr 输出
- 大文件写入使用 `Bun.write(Bun.file(path), text)`

## 快速检查清单

- 优先使用 Bun API
- 使用 `path.join`/`path.resolve` 处理路径
- 尽可能使用 promise 的 `.catch(...)` 而不是 `try/catch`

---

## API 速查表

| 操作 | Bun API | 说明 |
|------|---------|------|
| 读取文本 | `await Bun.file(path).text()` | 返回字符串 |
| 读取 JSON | `await Bun.file(path).json()` | 返回解析后的对象 |
| 读取二进制 | `await Bun.file(path).arrayBuffer()` | 返回 ArrayBuffer |
| 检查存在 | `await Bun.file(path).exists()` | 返回布尔值 |
| 写入文件 | `await Bun.write(path, content)` | 写入任意内容 |
| 删除文件 | `await Bun.file(path).delete()` | 删除文件 |
| 文件扫描 | `Array.fromAsync(glob.scan({...}))` | 返回文件路径数组 |
| 获取大小 | `Bun.file(path).size` | 字节数 |
| 获取类型 | `Bun.file(path).type` | MIME 类型 |

## 示例代码

### 读取文件

```typescript
const file = Bun.file("config.json")

// 检查文件是否存在
if (await file.exists()) {
  const content = await file.text()
  // 或者读取 JSON
  const data = await file.json()
}
```

### 写入文件

```typescript
// 写入字符串
await Bun.write("output.txt", "Hello World")

// 写入 JSON
await Bun.write("data.json", JSON.stringify(data, null, 2))
```

### 扫描文件

```typescript
const glob = new Bun.Glob("**/*.ts")
const files = await Array.fromAsync(
  glob.scan({
    cwd: "./src",
    absolute: true,
    onlyFiles: true,
  })
)
// files = ["/.../src/index.ts", "/.../src/utils.ts", ...]
```

### 目录操作（使用 node:fs）

```typescript
import fs from "node:fs/promises"

// 创建目录
await fs.mkdir("./new-dir", { recursive: true })

// 读取目录
const entries = await fs.readdir("./src")
```
