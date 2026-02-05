/**
 * ============================================================================
 * 📚 TODO 工具学习副本 - TypeScript 小白友好版
 * ============================================================================
 *
 * 这个文件是 todo.ts 的学习副本，添加了详细的中文注释，帮助理解：
 * 1. TypeScript 的语法特性
 * 2. Zod 库的使用方法
 * 3. OpenCode 工具系统的设计模式
 *
 * 原文件位置：packages/opencode/src/tool/todo.ts
 * 工具基类定义：packages/opencode/src/tool/tool.ts
 */

// ============================================================================
// 📦 导入语句 (Import Statements)
// ============================================================================

/**
 * 【import 语法说明】
 *
 * TypeScript/ES6 的模块导入有几种形式：
 *
 * 1. 默认导入 (Default Import)：
 *    import z from "zod"
 *    → 导入模块的默认导出，可以自定义变量名
 *
 * 2. 命名导入 (Named Import)：
 *    import { Tool } from "./tool"
 *    → 导入模块中指定名称的导出，必须使用原名（或用 as 重命名）
 *
 * 3. 导入类型 (Type-only Import)：
 *    import type { SomeType } from "./module"
 *    → 仅导入类型，编译后会被移除，不影响运行时
 */

import z from "zod"
// ↑ 导入 Zod 库
// Zod 是一个 TypeScript-first 的数据验证库
// 用于定义数据结构（schema）并在运行时验证数据
// 官网: https://zod.dev

import { Tool } from "./tool"
// ↑ 从 tool.ts 导入 Tool 命名空间
// Tool.define() 是定义工具的核心函数

import DESCRIPTION_WRITE from "./todowrite.txt"
// ↑ 导入文本文件内容作为字符串
// 这是 Bun 的特性，可以直接导入 .txt 文件
// 该文件包含工具的详细描述（发送给 LLM 的说明文档）

import { Todo } from "../session/todo"
// ↑ 导入 Todo 命名空间
// 包含 Todo 数据的类型定义和操作方法

// ============================================================================
// 🛠️ TodoWriteTool - 写入/更新 Todo 列表的工具
// ============================================================================

/**
 * 【export 关键字】
 * export 使这个常量可以被其他模块导入使用
 * 如果不加 export，则只能在当前文件内使用
 */

/**
 * 【const 声明】
 * const 声明一个常量，一旦赋值后不能再重新赋值
 * 但如果值是对象，对象的属性是可以修改的
 */

/**
 * 【Tool.define() 函数签名】（来自 tool.ts）
 *
 * function define<Parameters extends z.ZodType, Result extends Metadata>(
 *   id: string,                    // 工具的唯一标识符
 *   init: Info["init"] | Awaited<ReturnType<Info["init"]>>
 *                                  // 初始化函数或直接的配置对象
 * ): Info<Parameters, Result>      // 返回工具信息对象
 *
 * 【泛型语法说明】
 * <Parameters extends z.ZodType, Result extends Metadata>
 *   ↑ 这是泛型参数声明
 *   - Parameters: 代表参数的 Zod schema 类型
 *   - Result: 代表返回值的 metadata 类型
 *   - extends: 约束泛型必须是某个类型的子类型
 */

export const TodoWriteTool = Tool.define(
  // 第一个参数：工具的唯一 ID
  "todowrite",

  // 第二个参数：工具配置对象
  // 这里直接传入对象，而不是函数，所以是「静态配置」
  {
    /**
     * 【description 属性】
     * 工具的描述文本，会发送给 LLM
     * LLM 根据这个描述来决定何时使用这个工具
     */
    description: DESCRIPTION_WRITE,

    /**
     * 【parameters 属性 - Zod Schema 定义】
     *
     * z.object({...}) 定义一个对象结构
     * 这个 schema 会被用于：
     * 1. 生成 JSON Schema 发送给 LLM（告诉 LLM 需要什么参数）
     * 2. 运行时验证 LLM 返回的参数是否符合要求
     * 3. TypeScript 类型推断（z.infer<typeof schema>）
     */
    parameters: z.object({
      /**
       * 【z.array() - 数组类型】
       * z.array(elementSchema) 定义一个数组，数组元素必须符合 elementSchema
       *
       * 【z.object() - 对象类型】
       * z.object({ key: schema }) 定义一个对象结构
       *
       * 【Todo.Info.shape】
       * .shape 是 Zod 对象 schema 的属性，返回其内部字段定义
       * 这样可以复用已有的 schema 定义，避免重复
       *
       * 【.describe() - 添加描述】
       * 为字段添加描述，会包含在 JSON Schema 中发送给 LLM
       */
      todos: z
        .array(
          z.object(Todo.Info.shape), // 复用 Todo.Info 的字段定义
        )
        .describe("The updated todo list"),
      // ↑ 描述告诉 LLM 这个参数的用途
    }),

    /**
     * 【execute 方法 - 工具的核心执行逻辑】
     *
     * async execute(params, ctx) { ... }
     *   ↑ async 关键字表示这是异步函数，返回 Promise
     *
     * 参数说明：
     * - params: 经过 Zod 验证的参数对象，类型自动从 parameters schema 推断
     * - ctx: 执行上下文，包含 sessionID、messageID、权限检查等
     *
     * 返回值必须包含：
     * - title: 简短的执行结果摘要
     * - output: 详细的输出内容（字符串）
     * - metadata: 额外的元数据对象
     */
    async execute(params, ctx) {
      /**
       * 【权限检查 - ctx.ask()】
       *
       * 在执行敏感操作前，需要检查权限
       * 如果权限配置为 "ask"，会弹出确认对话框让用户决定
       * 如果权限配置为 "deny"，会抛出错误
       * 如果权限配置为 "allow"，会直接通过
       *
       * await 关键字：
       * - 暂停执行，等待 Promise 完成
       * - 只能在 async 函数内使用
       */
      await ctx.ask({
        permission: "todowrite", // 权限类型名称
        patterns: ["*"], // 匹配模式（* 表示匹配所有）
        always: ["*"], // 「始终允许」的模式
        metadata: {}, // 额外的元数据，用于权限提示
      })

      /**
       * 【调用业务逻辑】
       * Todo.update() 是实际更新 Todo 数据的函数
       */
      await Todo.update({
        sessionID: ctx.sessionID, // 会话 ID，用于隔离不同会话的数据
        todos: params.todos, // 新的 todo 列表
      })

      /**
       * 【返回执行结果】
       *
       * 返回一个对象，包含：
       * - title: 简短描述，显示在 UI 上
       * - output: 详细输出，会发送给 LLM 作为工具调用结果
       * - metadata: 结构化数据，供 UI 渲染或后续处理使用
       */
      return {
        /**
         * 【模板字符串 - Template Literals】
         *
         * `${expression}` 语法允许在字符串中嵌入表达式
         * 表达式会被求值并转换为字符串
         *
         * 【链式方法调用】
         * params.todos
         *   .filter((x) => x.status !== "completed")  // 过滤出未完成的
         *   .length                                    // 获取数组长度
         */
        title: `${params.todos.filter((x) => x.status !== "completed").length} todos`,

        /**
         * 【JSON.stringify()】
         * 将 JavaScript 对象转换为 JSON 字符串
         *
         * 参数说明：
         * - 第一个参数：要转换的对象
         * - 第二个参数：replacer（这里是 null，不做替换）
         * - 第三个参数：缩进空格数（2 表示缩进 2 个空格，美化输出）
         */
        output: JSON.stringify(params.todos, null, 2),

        /**
         * 【对象简写语法 - Object Shorthand】
         *
         * { todos: params.todos } 可以简写为 { todos }
         * 当属性名和变量名相同时可以使用这种简写
         *
         * 但这里显式写出完整形式更清晰：
         * metadata: { todos: params.todos }
         */
        metadata: {
          todos: params.todos,
        },
      }
    },
  },
)

// ============================================================================
// 🛠️ TodoReadTool - 读取 Todo 列表的工具
// ============================================================================

/**
 * 这是一个更简单的工具示例，用于读取 Todo 列表
 * 没有复杂的参数，只是返回当前会话的所有 Todo
 */
export const TodoReadTool = Tool.define(
  "todoread", // 工具 ID

  {
    // 简单的描述字符串，直接写在这里而不是从文件导入
    description: "Use this tool to read your todo list",

    /**
     * 【空参数对象】
     * z.object({}) 表示这个工具不需要任何参数
     * LLM 调用时只需要工具名称，不需要传入参数
     */
    parameters: z.object({}),

    /**
     * 【下划线前缀 _params】
     *
     * 在 TypeScript/JavaScript 中，以下划线开头的变量名
     * 通常表示「这个参数我知道存在，但我不会使用它」
     *
     * 这是一种约定俗成的命名习惯，可以：
     * 1. 避免 ESLint 的「未使用变量」警告
     * 2. 向其他开发者表明意图
     */
    async execute(_params, ctx) {
      // 权限检查
      await ctx.ask({
        permission: "todoread",
        patterns: ["*"],
        always: ["*"],
        metadata: {},
      })

      /**
       * 【获取数据】
       * Todo.get() 返回 Promise<Todo.Item[]>
       * await 等待 Promise 完成并获取结果
       */
      const todos = await Todo.get(ctx.sessionID)

      // 返回结果
      return {
        title: `${todos.filter((x) => x.status !== "completed").length} todos`,
        metadata: {
          todos, // 对象简写: todos: todos
        },
        output: JSON.stringify(todos, null, 2),
      }
    },
  },
)

// ============================================================================
// 📖 补充知识：Tool.define 的完整类型定义
// ============================================================================

/**
 * 【Tool.Info 接口定义】（来自 tool.ts）
 *
 * ```typescript
 * interface Info<Parameters extends z.ZodType, Metadata> {
 *   id: string;                           // 工具唯一标识符
 *   init: (ctx?: InitContext) => Promise<{
 *     description: string;                // 工具描述
 *     parameters: Parameters;             // Zod schema 定义参数结构
 *     execute(                            // 执行函数
 *       args: z.infer<Parameters>,        // 参数类型从 schema 推断
 *       ctx: Context                      // 执行上下文
 *     ): Promise<{
 *       title: string;                    // 执行结果标题
 *       metadata: Metadata;               // 元数据
 *       output: string;                   // 输出内容
 *       attachments?: FilePart[];         // 可选的附件
 *     }>;
 *   }>;
 * }
 * ```
 */

// ============================================================================
// 📖 补充知识：Context 类型定义
// ============================================================================

/**
 * 【Tool.Context 类型】（来自 tool.ts）
 *
 * ```typescript
 * type Context = {
 *   sessionID: string;           // 当前会话 ID
 *   messageID: string;           // 当前消息 ID
 *   agent: string;               // 当前 Agent 名称
 *   abort: AbortSignal;          // 用于取消操作的信号
 *   callID?: string;             // 工具调用 ID
 *   extra?: Record<string, any>; // 额外数据
 *   messages: MessageV2.WithParts[]; // 历史消息
 *
 *   // 更新工具元数据的方法
 *   metadata(input: { title?: string; metadata?: any }): void;
 *
 *   // 权限检查方法
 *   ask(input: PermissionRequest): Promise<void>;
 * }
 * ```
 */

// ============================================================================
// 📖 补充知识：Zod 常用方法速查
// ============================================================================

/**
 * 【Zod 常用类型定义】
 *
 * 基础类型：
 *   z.string()                    // 字符串
 *   z.number()                    // 数字
 *   z.boolean()                   // 布尔值
 *   z.null()                      // null
 *   z.undefined()                 // undefined
 *   z.any()                       // 任意类型（尽量避免使用）
 *
 * 复合类型：
 *   z.array(schema)               // 数组
 *   z.object({ key: schema })     // 对象
 *   z.record(keySchema, valueSchema) // 记录类型（类似 Map）
 *   z.tuple([schema1, schema2])   // 元组
 *   z.union([schema1, schema2])   // 联合类型
 *   z.enum(["a", "b", "c"])       // 枚举
 *
 * 修饰方法：
 *   .optional()                   // 可选
 *   .nullable()                   // 可为 null
 *   .default(value)               // 默认值
 *   .describe("description")      // 添加描述
 *
 * 字符串方法：
 *   z.string().min(1)             // 最小长度
 *   z.string().max(100)           // 最大长度
 *   z.string().email()            // 邮箱格式
 *   z.string().url()              // URL 格式
 *
 * 类型推断：
 *   type MyType = z.infer<typeof mySchema>  // 从 schema 推断 TypeScript 类型
 */

// ============================================================================
// 📖 补充知识：箭头函数语法
// ============================================================================

/**
 * 【箭头函数 (Arrow Functions)】
 *
 * 传统函数写法：
 *   function add(a, b) { return a + b; }
 *
 * 箭头函数写法：
 *   const add = (a, b) => { return a + b; }
 *
 * 简写形式（单表达式自动 return）：
 *   const add = (a, b) => a + b
 *
 * 单参数可省略括号：
 *   const double = x => x * 2
 *
 * 在这个文件中的例子：
 *   .filter((x) => x.status !== "completed")
 *   ↑ 过滤数组，保留 status 不等于 "completed" 的元素
 *
 *   等价于：
 *   .filter(function(x) { return x.status !== "completed"; })
 */
