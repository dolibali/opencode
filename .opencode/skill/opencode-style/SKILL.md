---
name: opencode-style
description: Use this when writing or reviewing TypeScript code in this OpenCode project. It covers the coding style, naming conventions, and best practices specific to this codebase.
---

## Use this when

- Writing new TypeScript code in `packages/opencode`
- Reviewing or refactoring existing code
- Unsure about coding conventions in this project

## Code Style Rules

### Avoid `let` - Prefer `const`

```typescript
// ✅ Good
const foo = condition ? 1 : 2

// ❌ Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Avoid `else` - Use early returns

```typescript
// ✅ Good
function foo() {
  if (condition) return 1
  return 2
}

// ❌ Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Prefer single-word naming

```typescript
// ✅ Good
const foo = 1
const bar = 2

// ❌ Bad
const fooBar = 1
const myVariable = 2
```

### Avoid unnecessary destructuring

```typescript
// ✅ Good - preserves context
console.log(obj.a, obj.b)

// ❌ Bad - loses context
const { a, b } = obj
console.log(a, b)
```

### Avoid `try/catch` where possible

```typescript
// ✅ Good
const result = await doSomething().catch(() => undefined)

// ❌ Bad
let result
try {
  result = await doSomething()
} catch {
  result = undefined
}
```

## Bun APIs

- Use `Bun.file()` for file operations
- Use `Bun.write()` for writing files
- Use `Bun.Glob` for file scanning

## Namespace Pattern

This project uses TypeScript namespaces for organization:

```typescript
// ✅ Project pattern
export namespace Tool {
  export interface Info { ... }
  export function define() { ... }
}

// Usage
Tool.define("name", { ... })
Tool.Info
```

## Functional Array Methods

Prefer functional methods over loops:

```typescript
// ✅ Good
const results = items
  .filter((x) => x.active)
  .map((x) => x.name)

// ❌ Bad
const results = []
for (const item of items) {
  if (item.active) {
    results.push(item.name)
  }
}
```

## Quick Checklist

- [ ] No `let` statements (use `const` with ternary)
- [ ] No `else` statements (use early return)
- [ ] Single-word variable names where possible
- [ ] No unnecessary destructuring
- [ ] Use Bun APIs for file operations
- [ ] Use functional array methods
- [ ] Avoid `try/catch` (use `.catch()`)
