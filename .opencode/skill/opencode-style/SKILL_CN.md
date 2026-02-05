---
name: opencode-style
description: 在 OpenCode 项目中编写或审查 TypeScript 代码时使用此技能。涵盖本代码库特有的编码风格、命名规范和最佳实践。
---

## 使用场景

- 在 `packages/opencode` 中编写新的 TypeScript 代码
- 审查或重构现有代码
- 不确定项目的编码规范时

## 代码风格规则

### 避免 `let` - 优先使用 `const`

```typescript
// ✅ 正确
const foo = condition ? 1 : 2

// ❌ 错误
let foo
if (condition) foo = 1
else foo = 2
```

**原因**：`const` 更安全，避免意外重新赋值，三元表达式更简洁。

### 避免 `else` - 使用早返回

```typescript
// ✅ 正确
function foo() {
  if (condition) return 1
  return 2
}

// ❌ 错误
function foo() {
  if (condition) return 1
  else return 2
}
```

**原因**：减少嵌套层级，代码更清晰。

### 优先使用单词命名

```typescript
// ✅ 正确
const foo = 1
const bar = 2
const result = 3

// ❌ 错误
const fooBar = 1
const myVariable = 2
const theResult = 3
```

**原因**：简洁的命名更易读，只有在单词无法表达时才使用多词命名。

### 避免不必要的解构

```typescript
// ✅ 正确 - 保留上下文
console.log(obj.a, obj.b)
console.log(user.name, user.age)

// ❌ 错误 - 丢失上下文
const { a, b } = obj
console.log(a, b)  // 读者不知道 a, b 来自哪里
```

**原因**：保留对象前缀可以让代码更易理解。

### 尽量避免 `try/catch`

```typescript
// ✅ 正确
const result = await doSomething().catch(() => undefined)

// ❌ 错误
let result
try {
  result = await doSomething()
} catch {
  result = undefined
}
```

**原因**：`.catch()` 更简洁，避免使用 `let`。

## Bun API 优先

本项目使用 Bun 运行时，优先使用 Bun API：

| 操作 | 使用 | 避免 |
|------|------|------|
| 读取文件 | `Bun.file(path).text()` | `fs.readFileSync()` |
| 写入文件 | `Bun.write(path, content)` | `fs.writeFileSync()` |
| 文件扫描 | `Bun.Glob` | `glob` 包 |
| 检查存在 | `Bun.file(path).exists()` | `fs.existsSync()` |

## 命名空间模式

本项目使用 TypeScript 命名空间来组织代码：

```typescript
// ✅ 项目标准模式
export namespace Tool {
  export interface Info { ... }
  export function define() { ... }
}

// 使用方式
Tool.define("name", { ... })
const info: Tool.Info = { ... }
```

**命名空间的好处**：
- 相关的类型和函数组织在一起
- 避免命名冲突
- 导入时更清晰 `import { Tool } from "./tool"`

## 函数式数组方法

优先使用函数式方法，避免 for 循环：

```typescript
// ✅ 正确 - 函数式
const results = items
  .filter((x) => x.active)
  .map((x) => x.name)
  .flatMap((x) => x.tags)

// ❌ 错误 - 命令式
const results = []
for (const item of items) {
  if (item.active) {
    results.push(item.name)
    for (const tag of item.tags) {
      results.push(tag)
    }
  }
}
```

**常用方法**：
- `filter()` - 过滤元素
- `map()` - 转换元素
- `flatMap()` - 转换并展平
- `find()` - 查找单个元素
- `some()` / `every()` - 检查条件

## 类型推断

依赖 TypeScript 的类型推断，避免不必要的类型注解：

```typescript
// ✅ 正确 - 让 TS 推断
const name = "hello"           // 推断为 string
const items = [1, 2, 3]        // 推断为 number[]
const result = await fetch()   // 推断为 Response

// ❌ 错误 - 冗余注解
const name: string = "hello"
const items: number[] = [1, 2, 3]
const result: Response = await fetch()
```

**例外**：导出的函数/接口需要显式类型，便于使用者理解。

## 快速检查清单

- [ ] 没有 `let` 语句（使用 `const` + 三元表达式）
- [ ] 没有 `else` 语句（使用早返回）
- [ ] 尽可能使用单词命名
- [ ] 没有不必要的解构
- [ ] 文件操作使用 Bun API
- [ ] 使用函数式数组方法
- [ ] 避免 `try/catch`（使用 `.catch()`）
- [ ] 依赖类型推断，避免冗余注解

---

## 示例：重构前后对比

### 重构前（不符合规范）

```typescript
let result: string[] = []

try {
  const { items, total } = await fetchData()
  
  for (const item of items) {
    if (item.active) {
      result.push(item.name)
    }
  }
} catch (error) {
  result = []
}

if (result.length > 0) {
  return result
} else {
  return null
}
```

### 重构后（符合规范）

```typescript
const data = await fetchData().catch(() => undefined)
if (!data) return null

const result = data.items
  .filter((x) => x.active)
  .map((x) => x.name)

if (result.length === 0) return null
return result
```

**改进点**：
- `let` → `const`
- `try/catch` → `.catch()`
- 解构 → 保留 `data.items`
- `for` 循环 → `filter` + `map`
- `else` → 早返回
