/**
 * ============================================================================
 * 📚 Tool 工具系统核心定义 - TypeScript 小白友好版
 * ============================================================================
 *
 * 这个文件是 tool.ts 的学习副本，是整个工具系统的基础框架。
 *
 * 📌 核心概念：
 * - Tool 是 OpenCode 系统中 Agent 可以调用的「能力单元」
 * - 每个 Tool 有唯一 ID、参数定义、执行逻辑
 * - Tool.define() 是创建工具的工厂函数
 *
 * 原文件位置：packages/opencode/src/tool/tool.ts
 */

// ============================================================================
// 📦 导入语句
// ============================================================================

import z from "zod"
// ↑ Zod 库：TypeScript-first 的运行时数据验证库
// 用于定义参数 schema 并验证 LLM 返回的参数

import type { MessageV2 } from "../session/message-v2"
// ↑ 【import type 语法】
// 仅导入类型定义，不导入实际代码
// 编译后会被完全移除，不影响运行时
// 好处：避免循环依赖、减小打包体积

import type { Agent } from "../agent/agent"
// ↑ Agent 类型定义

import type { PermissionNext } from "../permission/next"
// ↑ 权限系统类型定义

import { Truncate } from "./truncation"
// ↑ 输出截断工具
// 当工具输出太长时，自动截断并保存完整内容到文件

// ============================================================================
// 🏗️ Tool 命名空间定义
// ============================================================================

/**
 * 【namespace 关键字】
 *
 * TypeScript 的命名空间用于组织相关的类型、接口、函数等
 * 类似于其他语言中的「模块」或「包」概念
 *
 * 使用方式：
 *   Tool.Info      // 访问命名空间内的类型
 *   Tool.define()  // 调用命名空间内的函数
 *   Tool.Context   // 访问命名空间内的类型
 *
 * 【export namespace】
 * export 使这个命名空间可以被其他模块导入
 */
export namespace Tool {
  // ==========================================================================
  // 📝 类型定义部分
  // ==========================================================================

  /**
   * 【interface 关键字】
   *
   * interface 用于定义对象的「形状」（shape）
   * 描述一个对象应该有哪些属性，每个属性是什么类型
   *
   * 【索引签名 - Index Signature】
   * [key: string]: any
   *   ↑ 这叫做「索引签名」
   *   表示这个对象可以有任意多个属性
   *   - key 是属性名，类型是 string
   *   - any 是属性值的类型，表示可以是任意类型
   *
   * 这个 Metadata 接口定义了一个「可以存储任意键值对」的对象类型
   */
  interface Metadata {
    [key: string]: any
  }

  /**
   * 【InitContext 接口】
   *
   * 工具初始化时的上下文信息
   * 目前只包含可选的 agent 信息
   *
   * 【可选属性语法】
   * agent?: Agent.Info
   *   ↑ 问号表示这个属性是可选的
   *   等价于：agent: Agent.Info | undefined
   */
  export interface InitContext {
    agent?: Agent.Info
  }

  /**
   * 【Context 类型 - 工具执行上下文】
   *
   * 这是每个工具执行时都会收到的「上下文」对象
   * 包含了执行环境的各种信息和工具方法
   *
   * 【type vs interface】
   * - type 更灵活，可以定义联合类型、交叉类型、映射类型等
   * - interface 可以被扩展（extends）和实现（implements）
   * - 两者在定义对象类型时大多数情况下可互换
   *
   * 【泛型参数】
   * <M extends Metadata = Metadata>
   *   ↑ M 是泛型参数，必须是 Metadata 的子类型
   *   = Metadata 是默认值，如果不指定 M 就使用 Metadata
   */
  export type Context<M extends Metadata = Metadata> = {
    /**
     * sessionID: 当前会话的唯一标识符
     * 用于隔离不同会话的数据
     */
    sessionID: string

    /**
     * messageID: 当前消息的唯一标识符
     * 一个会话可以有多条消息
     */
    messageID: string

    /**
     * agent: 当前执行工具的 Agent 名称
     * 如 "build"、"plan"、"explore" 等
     */
    agent: string

    /**
     * abort: 中断信号
     *
     * 【AbortSignal 说明】
     * 这是 Web API 的一部分，用于取消异步操作
     * 当用户取消操作时，abort.aborted 会变为 true
     *
     * 使用方式：
     *   if (ctx.abort.aborted) {
     *     throw new Error("Operation cancelled")
     *   }
     *
     * 或者传递给支持 AbortSignal 的 API：
     *   fetch(url, { signal: ctx.abort })
     */
    abort: AbortSignal

    /**
     * callID: 工具调用的唯一标识符（可选）
     * 用于追踪特定的工具调用
     */
    callID?: string

    /**
     * extra: 额外数据（可选）
     * 用于传递特殊的上下文信息
     *
     * 【Record 类型】
     * { [key: string]: any } 等价于 Record<string, any>
     * 表示一个键为 string、值为 any 的对象
     */
    extra?: { [key: string]: any }

    /**
     * messages: 历史消息列表
     * 包含当前会话的所有消息和它们的 parts
     */
    messages: MessageV2.WithParts[]

    /**
     * metadata: 更新工具元数据的方法
     *
     * 【函数类型签名】
     * (input: { title?: string; metadata?: M }): void
     *   ↑ 参数是一个对象，包含可选的 title 和 metadata
     *   ↑ 返回值是 void（无返回值）
     *
     * 用于在执行过程中更新 UI 显示的状态
     */
    metadata(input: { title?: string; metadata?: M }): void

    /**
     * ask: 权限检查方法
     *
     * 【Omit 工具类型】
     * Omit<Type, Keys> 从 Type 中排除指定的 Keys
     *
     * Omit<PermissionNext.Request, "id" | "sessionID" | "tool">
     *   ↑ 从 PermissionNext.Request 类型中排除 id、sessionID、tool 这三个属性
     *   因为这些属性由系统自动填充，不需要调用者提供
     *
     * 返回 Promise<void>，表示异步操作，成功时无返回值
     * 如果权限被拒绝，会抛出错误
     */
    ask(input: Omit<PermissionNext.Request, "id" | "sessionID" | "tool">): Promise<void>
  }

  /**
   * 【Info 接口 - 工具信息的完整定义】
   *
   * 这是描述一个「完整工具」的接口
   * 定义了工具需要有什么属性和方法
   *
   * 【多个泛型参数】
   * <Parameters extends z.ZodType = z.ZodType, M extends Metadata = Metadata>
   *
   *   Parameters extends z.ZodType = z.ZodType
   *     ↑ 第一个泛型参数，代表参数的 Zod schema 类型
   *     ↑ 必须是 z.ZodType 的子类型
   *     ↑ 默认值是 z.ZodType
   *
   *   M extends Metadata = Metadata
   *     ↑ 第二个泛型参数，代表元数据的类型
   *     ↑ 必须是 Metadata 的子类型
   *     ↑ 默认值是 Metadata
   */
  export interface Info<Parameters extends z.ZodType = z.ZodType, M extends Metadata = Metadata> {
    /**
     * id: 工具的唯一标识符
     * 如 "read"、"write"、"bash"、"todowrite" 等
     */
    id: string

    /**
     * init: 初始化函数
     *
     * 【函数类型的完整形式】
     * (ctx?: InitContext) => Promise<{ ... }>
     *   ↑ 参数：可选的 InitContext
     *   ↑ 返回值：Promise 包装的对象
     *
     * 返回的对象包含：
     * - description: 工具描述（发送给 LLM）
     * - parameters: Zod schema（定义参数结构）
     * - execute: 执行函数
     * - formatValidationError: 可选的错误格式化函数
     */
    init: (ctx?: InitContext) => Promise<{
      /**
       * description: 工具的文字描述
       * 会包含在发送给 LLM 的 system prompt 中
       * LLM 根据这个描述决定何时使用这个工具
       */
      description: string

      /**
       * parameters: Zod schema 定义的参数结构
       * 用于：
       * 1. 生成 JSON Schema 发给 LLM
       * 2. 运行时验证 LLM 返回的参数
       * 3. TypeScript 类型推断
       */
      parameters: Parameters

      /**
       * execute: 工具的核心执行函数
       *
       * 【z.infer<Parameters>】
       * 这是 Zod 的类型工具，从 schema 推断出 TypeScript 类型
       *
       * 例如：
       *   const schema = z.object({ name: z.string() })
       *   type Params = z.infer<typeof schema>
       *   // Params 的类型是 { name: string }
       *
       * 返回值是 Promise，包含：
       * - title: 简短的执行结果摘要
       * - metadata: 结构化的元数据
       * - output: 文本输出（发给 LLM）
       * - attachments: 可选的附件（如图片）
       */
      execute(
        args: z.infer<Parameters>,
        ctx: Context,
      ): Promise<{
        title: string
        metadata: M
        output: string
        /**
         * 【Omit 用法】
         * Omit<MessageV2.FilePart, "id" | "sessionID" | "messageID">
         *   ↑ FilePart 类型去掉 id、sessionID、messageID 这些属性
         *   因为这些由系统自动分配
         */
        attachments?: Omit<MessageV2.FilePart, "id" | "sessionID" | "messageID">[]
      }>

      /**
       * formatValidationError: 可选的参数验证错误格式化函数
       *
       * 【可选方法语法】
       * methodName?(params): ReturnType
       *   ↑ 问号表示这个方法是可选的
       *
       * 当 LLM 返回的参数不符合 schema 时调用
       * 可以自定义错误消息，让 LLM 更容易理解如何修正
       */
      formatValidationError?(error: z.ZodError): string
    }>
  }

  // ==========================================================================
  // 🔧 工具类型 - 高级 TypeScript 类型操作
  // ==========================================================================

  /**
   * 【InferParameters - 从工具推断参数类型】
   *
   * 这是一个「条件类型」(Conditional Type) + 「类型推断」(Type Inference)
   *
   * T extends Info<infer P> ? z.infer<P> : never
   *   ↑ 如果 T 是 Info<P> 类型（P 被推断出来）
   *   ↑ 那么返回 z.infer<P>（从 Zod schema 推断的类型）
   *   ↑ 否则返回 never
   *
   * 【infer 关键字】
   * infer 用于在条件类型中「捕获」某个类型
   * Info<infer P> 中，P 会被推断为 Info 的第一个泛型参数
   *
   * 使用示例：
   *   type ReadParams = InferParameters<typeof ReadTool>
   *   // ReadParams 就是 ReadTool 的参数类型
   */
  export type InferParameters<T extends Info> = T extends Info<infer P> ? z.infer<P> : never

  /**
   * 【InferMetadata - 从工具推断元数据类型】
   *
   * 类似上面，但推断的是第二个泛型参数（元数据类型）
   *
   * T extends Info<any, infer M> ? M : never
   *   ↑ any 表示「我不关心第一个泛型参数是什么」
   *   ↑ infer M 捕获第二个泛型参数
   */
  export type InferMetadata<T extends Info> = T extends Info<any, infer M> ? M : never

  // ==========================================================================
  // 🏭 define 函数 - 工具工厂
  // ==========================================================================

  /**
   * 【define 函数 - 创建工具的工厂函数】
   *
   * 这是整个工具系统最核心的函数！
   * 所有工具都通过 Tool.define() 来创建
   *
   * 【函数泛型】
   * function define<Parameters extends z.ZodType, Result extends Metadata>
   *   ↑ 在函数名后面用 <...> 声明泛型参数
   *   ↑ 调用时 TypeScript 会自动推断这些类型
   *
   * 【参数类型】
   * init: Info<Parameters, Result>["init"] | Awaited<ReturnType<Info<Parameters, Result>["init"]>>
   *
   *   这是一个联合类型，表示 init 可以是以下两种之一：
   *
   *   1. Info<...>["init"]
   *      ↑ 一个函数，签名是 (ctx?) => Promise<{...}>
   *      ↑ 用于需要动态初始化的工具（如根据配置改变行为）
   *
   *   2. Awaited<ReturnType<Info<...>["init"]>>
   *      ↑ ReturnType<F> 获取函数 F 的返回值类型
   *      ↑ Awaited<P> 获取 Promise<P> 中的 P
   *      ↑ 所以这个类型就是 { description, parameters, execute, ... }
   *      ↑ 用于静态配置的工具，直接传入对象
   *
   * 【返回类型】
   * : Info<Parameters, Result>
   *   ↑ 返回一个完整的工具信息对象
   */
  export function define<Parameters extends z.ZodType, Result extends Metadata>(
    id: string,
    init: Info<Parameters, Result>["init"] | Awaited<ReturnType<Info<Parameters, Result>["init"]>>,
  ): Info<Parameters, Result> {
    /**
     * 返回一个工具信息对象
     * 这个对象会被注册到工具系统中
     */
    return {
      /**
       * 【对象属性简写】
       * id 等价于 id: id
       * 当属性名和变量名相同时可以简写
       */
      id,

      /**
       * init: 包装后的初始化函数
       *
       * 这里做了一个「装饰器」模式：
       * 1. 调用原始的 init（或直接使用传入的对象）
       * 2. 包装 execute 函数，添加：
       *    - 参数验证
       *    - 输出截断
       */
      init: async (initCtx) => {
        /**
         * 【instanceof 运算符】
         * 检查一个值是否是某个类的实例
         *
         * init instanceof Function
         *   ↑ 检查 init 是否是函数
         *   ↑ 如果是函数，调用它获取配置
         *   ↑ 如果不是函数，直接使用它作为配置
         *
         * 【三元运算符】
         * condition ? valueIfTrue : valueIfFalse
         */
        const toolInfo = init instanceof Function ? await init(initCtx) : init

        /**
         * 保存原始的 execute 函数引用
         * 后面会用包装后的版本替换它
         */
        const execute = toolInfo.execute

        /**
         * 【函数重写/包装】
         *
         * 这里用一个新函数替换原来的 execute
         * 新函数会：
         * 1. 先验证参数
         * 2. 再调用原始 execute
         * 3. 最后处理输出截断
         *
         * 这是「装饰器模式」的一种实现
         */
        toolInfo.execute = async (args, ctx) => {
          /**
           * 【try-catch 错误处理】
           *
           * try {
           *   // 可能出错的代码
           * } catch (error) {
           *   // 错误处理代码
           * }
           *
           * 这里用 try-catch 捕获 Zod 的验证错误
           */
          try {
            /**
             * 【Zod 参数验证】
             *
             * toolInfo.parameters.parse(args)
             *   ↑ 使用 Zod schema 验证 args
             *   ↑ 如果验证失败，会抛出 z.ZodError
             *   ↑ 如果成功，返回验证后的数据（这里忽略返回值）
             */
            toolInfo.parameters.parse(args)
          } catch (error) {
            /**
             * 【错误处理逻辑】
             *
             * 如果错误是 ZodError 并且工具提供了自定义格式化函数
             * 就使用自定义格式
             */
            if (error instanceof z.ZodError && toolInfo.formatValidationError) {
              /**
               * 【Error 构造函数的 cause 选项】
               *
               * new Error(message, { cause: originalError })
               *   ↑ ES2022 新特性
               *   ↑ cause 保留原始错误，方便调试
               */
              throw new Error(toolInfo.formatValidationError(error), { cause: error })
            }
            /**
             * 默认的错误消息格式
             * 告诉 LLM 参数有问题，需要重新输入
             */
            throw new Error(
              `The ${id} tool was called with invalid arguments: ${error}.\nPlease rewrite the input so it satisfies the expected schema.`,
              { cause: error },
            )
          }

          /**
           * 调用原始的 execute 函数
           * 获取执行结果
           */
          const result = await execute(args, ctx)

          /**
           * 【输出截断处理】
           *
           * 检查工具是否自己处理了截断
           * 如果 metadata.truncated 已经有值，说明工具自己处理了
           * 就直接返回结果
           */
          // skip truncation for tools that handle it themselves
          if (result.metadata.truncated !== undefined) {
            return result
          }

          /**
           * 【自动截断】
           *
           * 使用 Truncate.output() 处理输出
           * 如果输出太长，会：
           * 1. 截断内容
           * 2. 保存完整内容到文件
           * 3. 返回截断后的内容和文件路径
           */
          const truncated = await Truncate.output(result.output, {}, initCtx?.agent)

          /**
           * 【展开运算符 - Spread Operator】
           *
           * { ...result } 会「展开」result 对象的所有属性
           * 然后可以覆盖或添加新属性
           *
           * 等价于：
           * {
           *   title: result.title,
           *   metadata: result.metadata,
           *   output: result.output,
           *   attachments: result.attachments,
           *   // 下面的属性会覆盖上面的
           *   output: truncated.content,
           *   metadata: { ... }
           * }
           */
          return {
            ...result,
            output: truncated.content,
            metadata: {
              ...result.metadata,
              truncated: truncated.truncated,
              /**
               * 【条件展开 - Conditional Spread】
               *
               * ...(condition && { key: value })
               *   ↑ 如果 condition 为真，展开 { key: value }
               *   ↑ 如果 condition 为假，展开 false（什么都不加）
               *
               * 这是一种有条件地添加属性的简洁写法
               */
              ...(truncated.truncated && { outputPath: truncated.outputPath }),
            },
          }
        }

        /**
         * 返回包装后的工具配置
         */
        return toolInfo
      },
    }
  }
}

// ============================================================================
// 📖 补充知识：TypeScript 高级类型速查
// ============================================================================

/**
 * 【常用工具类型 (Utility Types)】
 *
 * Partial<T>       - 所有属性变为可选
 * Required<T>      - 所有属性变为必需
 * Readonly<T>      - 所有属性变为只读
 * Pick<T, Keys>    - 只保留指定的属性
 * Omit<T, Keys>    - 排除指定的属性
 * Record<K, V>     - 创建键为 K、值为 V 的对象类型
 * ReturnType<F>    - 获取函数的返回值类型
 * Parameters<F>    - 获取函数的参数类型（元组）
 * Awaited<P>       - 获取 Promise 内部的类型
 *
 * 示例：
 *   type User = { name: string; age: number }
 *   type PartialUser = Partial<User>     // { name?: string; age?: number }
 *   type NameOnly = Pick<User, "name">   // { name: string }
 *   type NoAge = Omit<User, "age">       // { name: string }
 */

// ============================================================================
// 📖 补充知识：条件类型 (Conditional Types)
// ============================================================================

/**
 * 【条件类型语法】
 *
 * T extends U ? X : Y
 *   ↑ 如果 T 可以赋值给 U，类型是 X
 *   ↑ 否则类型是 Y
 *
 * 【结合 infer 使用】
 *
 * type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never
 *   ↑ 如果 T 是函数类型，推断返回值类型为 R
 *   ↑ 否则返回 never
 *
 * 示例：
 *   type Fn = () => string
 *   type R = GetReturnType<Fn>  // string
 */

// ============================================================================
// 📖 补充知识：泛型约束 (Generic Constraints)
// ============================================================================

/**
 * 【泛型约束语法】
 *
 * <T extends SomeType>
 *   ↑ T 必须是 SomeType 的子类型
 *
 * 示例：
 *   function logLength<T extends { length: number }>(item: T) {
 *     console.log(item.length)
 *   }
 *   // 只能传入有 length 属性的值
 *   logLength("hello")  // OK
 *   logLength([1,2,3])  // OK
 *   logLength(123)      // Error! number 没有 length
 *
 * 【默认泛型参数】
 *
 * <T extends SomeType = DefaultType>
 *   ↑ 如果不指定 T，就使用 DefaultType
 */

// ============================================================================
// 📖 补充知识：装饰器模式 (Decorator Pattern)
// ============================================================================

/**
 * 【装饰器模式说明】
 *
 * 在这个文件中，Tool.define() 使用了装饰器模式：
 *
 * 原始的 execute 函数：
 *   async (args, ctx) => { ... 业务逻辑 ... }
 *
 * 包装后的 execute 函数：
 *   async (args, ctx) => {
 *     // 1. 前置处理：参数验证
 *     validate(args)
 *
 *     // 2. 调用原始函数
 *     const result = await originalExecute(args, ctx)
 *
 *     // 3. 后置处理：输出截断
 *     return truncate(result)
 *   }
 *
 * 好处：
 * - 分离关注点（业务逻辑 vs 通用处理）
 * - 代码复用（所有工具都自动获得验证和截断功能）
 * - 不修改原始代码就能增加功能
 */
