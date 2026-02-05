/**
 * =============================================================================
 * Agent 模块 - 学习副本（带详细注释）
 * =============================================================================
 *
 * 本文件是 agent.ts 的副本，供 TypeScript 初学者理解 Agent 模块的功能与代码流程。
 * 原文件: agent.ts
 *
 * =============================================================================
 * 【核心概念：什么是 Agent？】
 * =============================================================================
 *
 * 在 AI 编程助手领域，Agent（智能体）是一个「具有特定能力和行为规则的 AI 角色」。
 * 你可以把它想象成「拥有不同技能和权限的 AI 员工」：
 *
 * 1. **身份 (name)**：每个 Agent 有唯一的名字，如 "build"、"plan"、"explore"
 *
 * 2. **能力/权限 (permission)**：决定这个 Agent 能做什么、不能做什么
 *    - 例如："build" 可以编辑文件，"explore" 只能读取文件
 *    - 权限系统防止 AI 执行危险操作（如删除重要文件）
 *
 * 3. **性格/指令 (prompt)**：告诉 AI 如何行动的「系统提示词」
 *    - 例如：探索型 Agent 被告知「只搜索和阅读，不要修改」
 *
 * 4. **使用的大脑 (model)**：指定用哪个 AI 模型（如 GPT-4、Claude 等）
 *
 * 5. **工作模式 (mode)**：
 *    - "primary"：主 Agent，用户可以直接选择使用
 *    - "subagent"：子 Agent，只能被其他 Agent 通过 Task 工具调用
 *
 * =============================================================================
 * 【模块职责】
 * =============================================================================
 *
 * 1. **定义 Agent 结构**：通过 Info 类型描述一个 Agent 应该有哪些属性
 *
 * 2. **管理 Agent 列表**：
 *    - 程序内置了若干 Agent（build、plan、explore 等）
 *    - 用户可以通过配置文件（opencode.jsonc）添加、修改或禁用 Agent
 *    - 最终合并成一张「名字 → 配置」的表，按项目缓存
 *
 * 3. **提供访问 API**：
 *    - get(name)：按名字获取某个 Agent
 *    - list()：获取所有 Agent 的列表
 *    - defaultAgent()：获取默认使用的 Agent
 *    - generate()：用 AI 生成新的 Agent 配置
 *
 * =============================================================================
 * 【在项目中的位置】
 * =============================================================================
 *
 * - 会话（session）发消息时，调用 Agent.get(name) 拿到当前 Agent 的权限和提示词
 * - 系统提示词组装时，若有 agent.prompt 则优先使用，否则使用模型默认提示
 * - 工具调用时，会检查 Agent 的 permission 决定是否允许执行
 */

// =============================================================================
// 依赖导入区域
// =============================================================================
// 【TypeScript 基础】import 语句用于引入其他模块的功能
// 有两种主要形式：
//   import { xxx } from "module"  -- 导入模块中的特定导出（命名导出）
//   import xxx from "module"      -- 导入模块的默认导出
// =============================================================================

// ---------- 项目内部模块 ----------

/**
 * Config 模块：读取用户/项目的配置文件
 * - 配置来源：opencode.jsonc、.opencode/agent/*.md 等
 * - 提供 Config.get() 获取当前配置
 */
import { Config } from "../config/config"

/**
 * Provider 模块：管理 AI 模型提供商
 * - 支持多个提供商：OpenAI、Anthropic、Google 等
 * - Provider.getModel() 获取特定模型的实例
 * - Provider.defaultModel() 获取用户配置的默认模型
 */
import { Provider } from "../provider/provider"

/**
 * SystemPrompt 模块：系统提示词管理
 * - instructions()：生成 Codex 场景下的基础指令
 * - 系统提示词告诉 AI「你是谁、该怎么做」
 */
import { SystemPrompt } from "../session/system"

/**
 * Instance 模块：项目实例管理
 * - 代表当前打开的项目（工作目录、git worktree 等）
 * - Instance.state() 是一个工厂函数，用于创建「按项目缓存」的状态
 * - 同一个项目下，状态只计算一次，之后读缓存
 */
import { Instance } from "../project/instance"

/**
 * Truncate 模块：处理过长输出的截断
 * - Truncate.DIR：截断文件存放的目录路径
 * - Truncate.GLOB：截断文件的 glob 匹配模式
 * - 用于权限配置，确保截断功能始终可用
 */
import { Truncate } from "../tool/truncation"

/**
 * Auth 模块：认证管理
 * - Auth.get(providerID)：获取某个提供商的认证信息
 * - 支持多种认证方式：API Key、OAuth 等
 */
import { Auth } from "../auth"

/**
 * ProviderTransform 模块：提供商参数转换
 * - 将通用参数转换为特定提供商需要的格式
 */
import { ProviderTransform } from "../provider/transform"

/**
 * PermissionNext 模块：新版权限系统
 * - 每条规则包含：permission（权限类型）、pattern（匹配模式）、action（allow/deny/ask）
 * - PermissionNext.fromConfig()：从配置对象创建规则集
 * - PermissionNext.merge()：合并多个规则集
 */
import { PermissionNext } from "@/permission/next"

/**
 * Global 模块：全局路径和常量
 * - Global.Path.data：数据存储目录
 */
import { Global } from "@/global"

/**
 * Plugin 模块：插件系统
 * - Plugin.trigger()：触发插件钩子，允许插件修改行为
 */
import { Plugin } from "@/plugin"

// ---------- 第三方库 ----------

/**
 * zod：TypeScript 优先的数据验证库
 *
 * 【为什么用 zod？】
 * TypeScript 的类型只在编译时检查，运行时就「消失」了。
 * 但有时我们需要在运行时验证数据（如：用户输入、API 响应）。
 * zod 让你用一套代码同时得到：
 *   1. 运行时验证
 *   2. TypeScript 类型推断
 *
 * 【常用方法】
 * - z.string()：字符串类型
 * - z.number()：数字类型
 * - z.boolean()：布尔类型
 * - z.object({ ... })：对象类型，指定每个字段
 * - z.enum(["a", "b"])：枚举，只能是指定的值之一
 * - z.record(keyType, valueType)：字典/映射类型
 * - .optional()：标记为可选字段
 * - z.infer<typeof schema>：从 schema 推断 TypeScript 类型
 */
import z from "zod"

/**
 * AI SDK（Vercel AI SDK）：与各种 AI 模型交互的统一接口
 *
 * - generateObject()：让 AI 按指定的 schema 生成结构化 JSON
 *   （非流式，等待完整响应）
 * - streamObject()：流式版本，边生成边返回
 *   （适合需要实时显示进度的场景）
 * - ModelMessage：消息的类型定义（role + content）
 */
import { generateObject, streamObject, type ModelMessage } from "ai"

/**
 * remeda：函数式编程工具库
 *
 * 【函数式编程简介】
 * 函数式编程强调：用小函数组合成大功能，避免修改数据。
 *
 * - pipe(a, fn1, fn2, fn3)：管道，等价于 fn3(fn2(fn1(a)))
 *   从左到右依次应用函数，数据像水管里的水一样「流过」每个函数
 * - values(obj)：获取对象的所有值，返回数组
 * - sortBy(arr, comparators)：排序，可指定多个排序条件
 * - mergeDeep(obj1, obj2)：深度合并两个对象
 */
import { mergeDeep, pipe, sortBy, values } from "remeda"

/**
 * path：Node.js 路径处理模块
 * - path.join()：拼接路径
 * - path.relative()：计算相对路径
 */
import path from "path"

// ---------- Agent 专用提示词文件 ----------
// 这些 .txt 文件包含不同 Agent 的系统提示词
// TypeScript/Bun 可以直接 import 文本文件，得到字符串

/** 生成新 Agent 时使用的「元提示」：教 AI 如何设计 Agent */
import PROMPT_GENERATE from "./generate.txt"

/** 压缩 Agent 的提示词：用于压缩过长的对话历史 */
import PROMPT_COMPACTION from "./prompt/compaction.txt"

/** 探索 Agent 的提示词：专注于代码搜索和阅读 */
import PROMPT_EXPLORE from "./prompt/explore.txt"

/** 总结 Agent 的提示词：生成对话摘要 */
import PROMPT_SUMMARY from "./prompt/summary.txt"

/** 标题 Agent 的提示词：为会话生成简短标题 */
import PROMPT_TITLE from "./prompt/title.txt"

// =============================================================================
// Agent 命名空间定义
// =============================================================================
/**
 * 【TypeScript 基础：namespace（命名空间）】
 *
 * namespace 是 TypeScript 组织代码的一种方式，把相关的类型、常量、函数
 * 都放在一个「名字」下面，使用时通过 Agent.xxx 访问。
 *
 * 好处：
 * 1. 避免全局命名冲突（Info 这个名字可能很多地方用，但 Agent.Info 就很明确）
 * 2. 代码组织清晰，相关功能集中在一起
 * 3. 同时导出类型和值（interface 只能导出类型，namespace 两者都行）
 *
 * 使用方式：
 *   import { Agent } from "./agent"
 *   const info: Agent.Info = ...    // 使用类型
 *   const agent = await Agent.get("build")  // 调用函数
 */
export namespace Agent {
  // ===========================================================================
  // Agent.Info：定义一个 Agent 的「数据结构」
  // ===========================================================================
  /**
   * 【使用 zod 定义 Schema 的好处】
   *
   * 普通 TypeScript interface 只在编译时检查：
   *   interface Info { name: string }
   *   const data = JSON.parse(response) as Info  // 危险！运行时不检查
   *
   * 用 zod 定义 schema，可以在运行时验证：
   *   const Info = z.object({ name: z.string() })
   *   const data = Info.parse(JSON.parse(response))  // 安全！不合法会抛错
   *
   * 而且还能自动推断出 TypeScript 类型：
   *   type Info = z.infer<typeof Info>  // 得到 { name: string }
   *
   * -------------------------------------------------------------------------
   * 【zod 常用方法速查】
   * -------------------------------------------------------------------------
   * z.string()             必填字符串
   * z.number()             必填数字
   * z.boolean()            必填布尔值
   * z.enum(["a", "b"])     枚举，只能是列表中的值之一
   * z.object({ ... })      对象，指定每个字段的类型
   * z.record(k, v)         字典，键类型为 k，值类型为 v
   * z.array(item)          数组，元素类型为 item
   * .optional()            可选，可以不传
   * .default(value)        可选，不传时使用默认值
   * z.infer<typeof schema> 从 schema 推断 TypeScript 类型
   */
  export const Info = z
    .object({
      // -----------------------------------------------------------------------
      // 基础信息
      // -----------------------------------------------------------------------

      /**
       * Agent 的唯一标识名
       * 例如："build"、"plan"、"explore"、"my-custom-agent"
       */
      name: z.string(),

      /**
       * Agent 的描述，说明这个 Agent 是干什么的
       * 会显示在 UI 的 Agent 选择列表中
       * 可选：内部 Agent（如 title、compaction）可能不需要描述
       */
      description: z.string().optional(),

      /**
       * Agent 的工作模式
       *
       * - "primary"：主 Agent，用户可以在 UI 中直接选择
       *   例如：build（默认构建）、plan（规划模式）
       *
       * - "subagent"：子 Agent，不能被用户直接选择
       *   只能被其他 Agent 通过 Task 工具调用
       *   例如：explore（代码探索）、general（通用任务）
       *
       * - "all"：特殊模式，用于配置文件中扩展所有 Agent
       *   （用户自定义 Agent 的默认值）
       */
      mode: z.enum(["subagent", "primary", "all"]),

      /**
       * 是否是程序内置的 Agent
       * true = 内置 Agent（代码中定义的）
       * false = 用户通过配置文件添加的
       */
      native: z.boolean().optional(),

      /**
       * 是否在 @ 列表中隐藏
       * true = 用户在输入 @ 时看不到这个 Agent
       * 例如：title、compaction 是内部使用的，不需要展示
       */
      hidden: z.boolean().optional(),

      // -----------------------------------------------------------------------
      // 模型参数
      // -----------------------------------------------------------------------

      /**
       * Top-P 采样参数（nucleus sampling）
       * 范围 0-1，控制生成的随机性
       * 只考虑概率累计达到 topP 的 token
       * 例如：topP=0.9 表示只考虑概率最高的、累计达 90% 的 token
       */
      topP: z.number().optional(),

      /**
       * 温度参数（temperature）
       * 范围 0-2，控制生成的随机性
       * - 0 = 几乎确定性输出（总是选概率最高的 token）
       * - 1 = 正常随机性
       * - >1 = 更随机、更有创意
       * 例如：title Agent 用 temperature=0.5 保证标题简洁一致
       */
      temperature: z.number().optional(),

      /**
       * UI 显示颜色
       * 格式：CSS 颜色值，如 "rgb(255, 0, 34)"、"#ff0022"
       * 用于在界面上区分不同的 Agent
       */
      color: z.string().optional(),

      // -----------------------------------------------------------------------
      // 权限配置
      // -----------------------------------------------------------------------

      /**
       * 权限规则列表
       *
       * 这是 Agent 安全性的核心！决定这个 Agent 能做什么、不能做什么。
       * 每条规则包含：
       * - permission：权限类型（如 "read"、"edit"、"bash"）
       * - pattern：匹配模式（如 "*.ts"、"/etc/*"）
       * - action：动作（"allow"=允许、"deny"=禁止、"ask"=询问用户）
       *
       * 规则按顺序匹配，先匹配到的生效。
       *
       * 例如：
       * - explore Agent：大部分工具 deny，只 allow 读取和搜索
       * - build Agent：大部分工具 allow，但 .env 文件需要 ask
       */
      permission: PermissionNext.Ruleset,

      /**
       * 指定使用的 AI 模型
       * 不设置则使用用户在配置中选择的默认模型
       *
       * 包含两部分：
       * - providerID：提供商标识，如 "openai"、"anthropic"
       * - modelID：模型标识，如 "gpt-4"、"claude-3-opus"
       */
      model: z
        .object({
          modelID: z.string(),
          providerID: z.string(),
        })
        .optional(),

      /**
       * 模型变体
       * 某些模型有多个变体（如不同的上下文长度）
       */
      variant: z.string().optional(),

      // -----------------------------------------------------------------------
      // 行为配置
      // -----------------------------------------------------------------------

      /**
       * 自定义系统提示词
       *
       * 系统提示词告诉 AI「你是谁、该怎么做」。
       * 如果设置了，会覆盖模型的默认系统提示。
       *
       * 例如：
       * - explore Agent 的 prompt 告诉 AI「只搜索和阅读，不要修改文件」
       * - title Agent 的 prompt 告诉 AI「生成简短的会话标题」
       */
      prompt: z.string().optional(),

      /**
       * 额外选项
       * 键值对形式，用于传递特定 Agent 需要的额外配置
       * z.record(z.string(), z.any()) 表示「键是字符串，值可以是任何类型」
       */
      options: z.record(z.string(), z.any()),

      /**
       * 最大步数限制
       * 超过这个步数后，会提示用户是否继续
       * 防止 Agent 陷入无限循环
       * z.number().int().positive() = 正整数
       */
      steps: z.number().int().positive().optional(),
    })
    // .meta() 添加元数据，这里设置 ref="Agent" 用于 JSON Schema 生成
    .meta({
      ref: "Agent",
    })

  /**
   * 【TypeScript 高级：从 zod schema 推断类型】
   *
   * z.infer<typeof Info> 会从上面的 zod schema 推断出 TypeScript 类型：
   *
   * type Info = {
   *   name: string
   *   description?: string | undefined
   *   mode: "subagent" | "primary" | "all"
   *   native?: boolean | undefined
   *   ...
   * }
   *
   * 这样我们用一份代码同时得到了：
   * 1. 运行时验证的 schema（const Info）
   * 2. 编译时检查的类型（type Info）
   *
   * 注意：TypeScript 允许同名的 const 和 type 共存，它们在不同的「命名空间」中：
   * - const Info 在「值空间」
   * - type Info 在「类型空间」
   */
  export type Info = z.infer<typeof Info>

  // ===========================================================================
  // state：Agent 列表的缓存管理
  // ===========================================================================
  /**
   * 【核心概念：Instance.state() - 按项目缓存的状态管理】
   *
   * Instance.state(factory) 是一个「状态工厂」函数：
   * - factory 是一个 async 函数，用来计算初始状态
   * - 返回一个函数，调用它时：
   *   - 第一次调用：执行 factory，计算结果并缓存
   *   - 之后再调用：直接返回缓存的结果
   * - 缓存是按「项目目录」隔离的，不同项目有不同的缓存
   *
   * 为什么要缓存？
   * - Agent 列表的计算需要读取配置文件、合并规则，比较耗时
   * - 同一个项目中，Agent 配置不会频繁变化
   * - 缓存避免重复计算，提高性能
   *
   * -------------------------------------------------------------------------
   * 【state() 内部做了什么？】
   * -------------------------------------------------------------------------
   *
   * 整体流程：
   *
   *   ┌─────────────────┐
   *   │  读取用户配置    │  Config.get()
   *   └────────┬────────┘
   *            ▼
   *   ┌─────────────────┐
   *   │  构建默认权限    │  defaults = PermissionNext.fromConfig({...})
   *   └────────┬────────┘
   *            ▼
   *   ┌─────────────────┐
   *   │  创建内置 Agent  │  result = { build: {...}, plan: {...}, ... }
   *   └────────┬────────┘
   *            ▼
   *   ┌─────────────────┐
   *   │  应用用户配置    │  遍历 cfg.agent，覆盖/新增/禁用 Agent
   *   └────────┬────────┘
   *            ▼
   *   ┌─────────────────┐
   *   │  确保截断目录可用 │  添加 Truncate.DIR/GLOB 的 allow 规则
   *   └────────┬────────┘
   *            ▼
   *   ┌─────────────────┐
   *   │  返回最终结果    │  { "build": Agent.Info, "plan": Agent.Info, ... }
   *   └─────────────────┘
   */
  const state = Instance.state(async () => {
    // 读取用户配置（来自 opencode.jsonc 等配置文件）
    const cfg = await Config.get()

    // -------------------------------------------------------------------------
    // 第一步：构建默认权限规则
    // -------------------------------------------------------------------------
    /**
     * 默认权限配置解释：
     *
     * "*": "allow"
     *   - 通配符 * 表示「所有工具」
     *   - 默认允许使用所有工具
     *
     * doom_loop: "ask"
     *   - doom_loop 是检测 AI 陷入循环的机制
     *   - 触发时询问用户是否继续
     *
     * external_directory: { "*": "ask", [Truncate.DIR]: "allow" }
     *   - 访问项目外部目录默认需要询问
     *   - 但截断目录始终允许（存放过长输出）
     *
     * question/plan_enter/plan_exit: "deny"
     *   - 这些工具默认禁用
     *   - 只有特定 Agent（如 build）会开启
     *
     * read: { "*": "allow", "*.env": "ask" }
     *   - 读取文件默认允许
     *   - 但 .env 文件（可能含敏感信息）需要询问
     *   - .env.example 是示例文件，可以读取
     */
    const defaults = PermissionNext.fromConfig({
      "*": "allow",
      doom_loop: "ask",
      external_directory: {
        "*": "ask",
        [Truncate.DIR]: "allow",
        [Truncate.GLOB]: "allow",
      },
      question: "deny",
      plan_enter: "deny",
      plan_exit: "deny",
      read: {
        "*": "allow",
        "*.env": "ask",
        "*.env.*": "ask",
        "*.env.example": "allow",
      },
    })

    // -------------------------------------------------------------------------
    // 用户全局权限配置
    // -------------------------------------------------------------------------
    /**
     * 【TypeScript 基础：?? 空值合并运算符】
     *
     * cfg.permission ?? {} 的含义：
     * - 如果 cfg.permission 是 null 或 undefined，使用 {}
     * - 否则使用 cfg.permission 的值
     *
     * 与 || 的区别：
     * - || 会把 0、""、false 也当作「假值」
     * - ?? 只把 null 和 undefined 当作「空值」
     *
     * 例子：
     *   0 || 10    // 结果是 10（因为 0 是假值）
     *   0 ?? 10    // 结果是 0（因为 0 不是 null/undefined）
     */
    const user = PermissionNext.fromConfig(cfg.permission ?? {})

    // -------------------------------------------------------------------------
    // 第二步：创建内置 Agent 表
    // -------------------------------------------------------------------------
    /**
     * 【TypeScript 基础：Record<K, V> 类型】
     *
     * Record<string, Info> 表示一个对象：
     * - 键（key）的类型是 string
     * - 值（value）的类型是 Info
     *
     * 等价于：{ [key: string]: Info }
     *
     * 例如：
     *   const agents: Record<string, Info> = {
     *     "build": { name: "build", ... },
     *     "plan": { name: "plan", ... },
     *   }
     */
    const result: Record<string, Info> = {
      // =======================================================================
      // build Agent - 默认主 Agent
      // =======================================================================
      /**
       * 【用途】用户日常编程对话使用的主力 Agent
       *
       * 【特点】
       * - mode: "primary" - 用户可以直接选择
       * - 权限宽松：大部分工具都允许
       * - 开启了 question 和 plan_enter 工具
       *
       * 【典型场景】
       * - "帮我实现一个登录功能"
       * - "修复这个 bug"
       * - "重构这段代码"
       */
      build: {
        name: "build",
        description: "The default agent. Executes tools based on configured permissions.",
        options: {},
        // 权限合并：默认权限 + build 专用权限 + 用户自定义权限
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            question: "allow", // 允许向用户提问
            plan_enter: "allow", // 允许进入规划模式
          }),
          user,
        ),
        mode: "primary",
        native: true,
      },

      // =======================================================================
      // plan Agent - 规划模式
      // =======================================================================
      /**
       * 【用途】只读的规划模式，用于在动手之前先制定计划
       *
       * 【特点】
       * - mode: "primary" - 用户可以直接选择
       * - 禁止编辑文件（除了计划文件本身）
       * - 强制 AI「先想后做」
       *
       * 【典型场景】
       * - 大型重构前的规划
       * - 复杂功能的设计讨论
       * - 用户希望先看方案再执行
       *
       * 【权限说明】
       * - edit: "*" = "deny" - 禁止编辑所有文件
       * - 但允许编辑 .opencode/plans/*.md - 计划文件
       */
      plan: {
        name: "plan",
        description: "Plan mode. Disallows all edit tools.",
        options: {},
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            plan_exit: "allow", // 允许退出规划模式
            external_directory: {
              // 允许访问计划文件目录
              [path.join(Global.Path.data, "plans", "*")]: "allow",
            },
            edit: {
              "*": "deny", // 禁止编辑所有文件
              // 但允许编辑计划文件
              [path.join(".opencode", "plans", "*.md")]: "allow",
              [path.relative(Instance.worktree, path.join(Global.Path.data, path.join("plans", "*.md")))]: "allow",
            },
          }),
          user,
        ),
        mode: "primary",
        native: true,
      },

      // =======================================================================
      // general Agent - 通用子 Agent
      // =======================================================================
      /**
       * 【用途】执行复杂的多步骤任务
       *
       * 【特点】
       * - mode: "subagent" - 只能被其他 Agent 通过 Task 工具调用
       * - 禁用 todo 工具（避免子任务修改主任务的 todo 列表）
       * - 可以并行执行多个 general Agent
       *
       * 【典型场景】
       * - build Agent 需要同时处理多个独立的子任务
       * - 例如：同时在前端和后端添加一个新功能
       *
       * 【为什么是 subagent？】
       * 子 Agent 由主 Agent 调度，不需要用户直接选择。
       * 这样可以实现「分而治之」的任务处理策略。
       */
      general: {
        name: "general",
        description: `General-purpose agent for researching complex questions and executing multi-step tasks. Use this agent to execute multiple units of work in parallel.`,
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            todoread: "deny", // 子 Agent 不能读主 Agent 的 todo
            todowrite: "deny", // 子 Agent 不能写主 Agent 的 todo
          }),
          user,
        ),
        options: {},
        mode: "subagent",
        native: true,
      },

      // =======================================================================
      // explore Agent - 代码探索子 Agent
      // =======================================================================
      /**
       * 【用途】快速探索和理解代码库
       *
       * 【特点】
       * - mode: "subagent" - 只能被其他 Agent 调用
       * - 只读权限：只能搜索和阅读，不能修改
       * - 专用的系统提示词（PROMPT_EXPLORE）
       *
       * 【允许的工具】
       * - grep：文本搜索
       * - glob：文件名模式匹配
       * - list：列出目录内容
       * - bash：执行命令（用于 git log 等）
       * - read：读取文件
       * - webfetch/websearch：网络搜索
       * - codesearch：语义代码搜索
       *
       * 【典型场景】
       * - "这个项目的认证是怎么实现的？"
       * - "找出所有使用了 React hooks 的组件"
       * - "API 端点定义在哪里？"
       */
      explore: {
        name: "explore",
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            "*": "deny", // 先禁用所有工具
            // 然后只允许探索相关的工具
            grep: "allow",
            glob: "allow",
            list: "allow",
            bash: "allow",
            webfetch: "allow",
            websearch: "allow",
            codesearch: "allow",
            read: "allow",
            external_directory: {
              [Truncate.DIR]: "allow",
              [Truncate.GLOB]: "allow",
            },
          }),
          user,
        ),
        description: `Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns (eg. "src/components/**/*.tsx"), search code for keywords (eg. "API endpoints"), or answer questions about the codebase (eg. "how do API endpoints work?"). When calling this agent, specify the desired thoroughness level: "quick" for basic searches, "medium" for moderate exploration, or "very thorough" for comprehensive analysis across multiple locations and naming conventions.`,
        prompt: PROMPT_EXPLORE, // 使用专门的探索提示词
        options: {},
        mode: "subagent",
        native: true,
      },

      // =======================================================================
      // compaction Agent - 对话压缩（内部使用）
      // =======================================================================
      /**
       * 【用途】压缩过长的对话历史，节省 token
       *
       * 【特点】
       * - hidden: true - 在 @ 列表中不显示
       * - 禁用所有工具 - 只需要生成压缩后的文本
       * - 专用提示词（PROMPT_COMPACTION）
       *
       * 【工作原理】
       * 当对话历史太长时，系统会调用这个 Agent：
       * 1. 输入：完整的对话历史
       * 2. 输出：精简版的摘要
       * 3. 用摘要替换原始历史，减少 token 消耗
       */
      compaction: {
        name: "compaction",
        mode: "primary",
        native: true,
        hidden: true, // 内部使用，不在 UI 中显示
        prompt: PROMPT_COMPACTION,
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            "*": "deny", // 不需要任何工具
          }),
          user,
        ),
        options: {},
      },

      // =======================================================================
      // title Agent - 生成会话标题（内部使用）
      // =======================================================================
      /**
       * 【用途】为新会话自动生成简短标题
       *
       * 【特点】
       * - hidden: true - 在 @ 列表中不显示
       * - temperature: 0.5 - 较低的随机性，保证标题一致性
       * - 禁用所有工具 - 只需要生成文本
       *
       * 【典型输出】
       * - "修复登录 bug"
       * - "添加用户认证"
       * - "重构数据库层"
       */
      title: {
        name: "title",
        mode: "primary",
        options: {},
        native: true,
        hidden: true,
        temperature: 0.5, // 较低温度 = 更确定的输出
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            "*": "deny",
          }),
          user,
        ),
        prompt: PROMPT_TITLE,
      },

      // =======================================================================
      // summary Agent - 生成摘要（内部使用）
      // =======================================================================
      /**
       * 【用途】生成对话或任务的摘要
       *
       * 【特点】
       * - hidden: true - 在 @ 列表中不显示
       * - 禁用所有工具 - 只需要生成文本
       * - 用于 UI 中显示任务/子 Agent 的执行结果摘要
       */
      summary: {
        name: "summary",
        mode: "primary",
        options: {},
        native: true,
        hidden: true,
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            "*": "deny",
          }),
          user,
        ),
        prompt: PROMPT_SUMMARY,
      },
    }

    // -------------------------------------------------------------------------
    // 第三步：应用用户配置
    // -------------------------------------------------------------------------
    /**
     * 【用户如何自定义 Agent？】
     *
     * 用户可以通过配置文件（opencode.jsonc）自定义 Agent：
     *
     * ```jsonc
     * {
     *   "agent": {
     *     // 禁用内置的 explore Agent
     *     "explore": { "disable": true },
     *
     *     // 修改 build Agent 的模型
     *     "build": { "model": "anthropic/claude-3-opus" },
     *
     *     // 添加自定义 Agent
     *     "my-agent": {
     *       "description": "我的自定义 Agent",
     *       "prompt": "你是一个专注于代码审查的助手...",
     *       "mode": "primary"
     *     }
     *   }
     * }
     * ```
     *
     * -------------------------------------------------------------------------
     * 【TypeScript 基础：Object.entries() 和 for...of】
     *
     * Object.entries(obj) 将对象转换为 [key, value] 数组：
     *   Object.entries({ a: 1, b: 2 })
     *   // 结果：[["a", 1], ["b", 2]]
     *
     * for...of 用于遍历可迭代对象：
     *   for (const [key, value] of entries) { ... }
     *
     * 这里的 [key, value] 是「解构赋值」，从数组中提取元素：
     *   const [key, value] = ["build", { model: "..." }]
     *   // key = "build", value = { model: "..." }
     */
    for (const [key, value] of Object.entries(cfg.agent ?? {})) {
      // 如果配置了 disable: true，则删除这个 Agent
      if (value.disable) {
        delete result[key]
        continue // 跳过本次循环，处理下一个
      }

      // -----------------------------------------------------------------------
      // 【TypeScript 注意：这里使用了 let】
      //
      // 通常我们偏好 const，但这里需要在后面可能修改 item 的引用。
      // 当 result[key] 不存在时，我们需要创建一个新对象并同时：
      // 1. 赋值给 item（用于后续操作）
      // 2. 存入 result[key]（持久化）
      //
      // item = result[key] = { ... } 是一个链式赋值：
      // 1. 先创建对象 { name: key, ... }
      // 2. 赋值给 result[key]
      // 3. 赋值给 item
      // -----------------------------------------------------------------------
      let item = result[key]
      if (!item)
        item = result[key] = {
          name: key,
          mode: "all", // 用户自定义 Agent 默认为 "all" 模式
          permission: PermissionNext.merge(defaults, user),
          options: {},
          native: false, // 标记为非内置
        }

      // -----------------------------------------------------------------------
      // 用配置覆盖各字段
      // -----------------------------------------------------------------------
      /**
       * 【字段覆盖逻辑】
       *
       * value.xxx ?? item.xxx 的含义：
       * - 如果用户配置了这个字段（value.xxx 存在），使用用户的值
       * - 否则保持原来的值（item.xxx）
       *
       * 这样用户可以「部分覆盖」，只改想改的字段。
       */

      // 模型配置需要特殊处理：解析 "provider/model" 格式的字符串
      if (value.model) item.model = Provider.parseModel(value.model)

      // 其他字段直接覆盖
      item.variant = value.variant ?? item.variant
      item.prompt = value.prompt ?? item.prompt
      item.description = value.description ?? item.description
      item.temperature = value.temperature ?? item.temperature
      item.topP = value.top_p ?? item.topP // 注意：配置中用下划线 top_p，代码中用驼峰 topP
      item.mode = value.mode ?? item.mode
      item.color = value.color ?? item.color
      item.hidden = value.hidden ?? item.hidden
      item.name = value.name ?? item.name
      item.steps = value.steps ?? item.steps

      // options 使用深度合并，保留原有选项的同时添加新选项
      item.options = mergeDeep(item.options, value.options ?? {})

      // permission 使用权限合并规则（后面的规则优先级更高）
      item.permission = PermissionNext.merge(item.permission, PermissionNext.fromConfig(value.permission ?? {}))
    }

    // -------------------------------------------------------------------------
    // 第四步：确保截断目录始终可访问
    // -------------------------------------------------------------------------
    /**
     * 【为什么需要这一步？】
     *
     * 当 AI 的输出太长时，系统会将输出截断并保存到临时文件。
     * 如果 Agent 无法访问这些临时文件，截断功能就会失效。
     *
     * 所以，除非用户「显式」禁用了截断目录，否则我们都要确保它是允许的。
     *
     * -------------------------------------------------------------------------
     * 【TypeScript 基础：.some() 方法】
     *
     * array.some(callback) 检查数组中是否「存在」满足条件的元素：
     * - 返回 true：存在至少一个元素使 callback 返回 true
     * - 返回 false：所有元素的 callback 都返回 false
     *
     * 例如：
     *   [1, 2, 3].some(x => x > 2)  // true，因为 3 > 2
     *   [1, 2, 3].some(x => x > 5)  // false，没有元素 > 5
     */
    for (const name in result) {
      const agent = result[name]

      // 检查用户是否显式禁用了截断目录
      const explicit = agent.permission.some((r) => {
        // 检查条件：权限类型是 external_directory + 动作是 deny + 匹配截断目录
        if (r.permission !== "external_directory") return false
        if (r.action !== "deny") return false
        return r.pattern === Truncate.DIR || r.pattern === Truncate.GLOB
      })

      // 如果用户显式禁用了，尊重用户的选择
      if (explicit) continue

      // 否则，添加允许访问截断目录的规则
      result[name].permission = PermissionNext.merge(
        result[name].permission,
        PermissionNext.fromConfig({ external_directory: { [Truncate.DIR]: "allow", [Truncate.GLOB]: "allow" } }),
      )
    }

    // 返回最终的 Agent 表
    return result
  })

  // ===========================================================================
  // 公开 API 函数
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Agent.get(name) - 按名字获取单个 Agent
  // ---------------------------------------------------------------------------
  /**
   * 根据名字获取一个 Agent 的完整配置。
   *
   * @param agent - Agent 的名字，如 "build"、"plan"、"explore"
   * @returns Promise<Agent.Info | undefined> - 找到返回配置，找不到返回 undefined
   *
   * 【调用场景】
   * - session/prompt.ts：获取当前 Agent 的系统提示词
   * - tool/task.ts：获取子 Agent 的配置
   * - session/summary.ts：获取 summary Agent 生成摘要
   * - session/compaction.ts：获取 compaction Agent 压缩对话
   *
   * 【TypeScript 基础：Promise 和 .then()】
   *
   * state() 返回 Promise<Record<string, Info>>，是一个「承诺将来会给你数据」的对象。
   *
   * .then(callback) 表示「等数据到了之后，用 callback 处理」：
   *   state().then((x) => x[agent])
   *   // 等价于：
   *   // const x = await state()
   *   // return x[agent]
   *
   * 这里用 .then() 而不是 async/await 是为了保持函数简洁。
   */
  export async function get(agent: string) {
    return state().then((x) => x[agent])
  }

  // ---------------------------------------------------------------------------
  // Agent.list() - 获取所有 Agent 的列表
  // ---------------------------------------------------------------------------
  /**
   * 获取所有可用 Agent 的列表，按优先级排序。
   *
   * @returns Promise<Agent.Info[]> - Agent 配置的数组
   *
   * 【排序规则】
   * - 如果配置了 default_agent，那个 Agent 排第一
   * - 否则 "build" 排第一
   * - 其他 Agent 的顺序不变
   *
   * 【函数式编程：pipe()】
   *
   * pipe(a, fn1, fn2, fn3) 是「管道」操作：
   *   pipe(a, fn1, fn2, fn3)
   *   // 等价于：fn3(fn2(fn1(a)))
   *
   * 数据像水管里的水一样「流过」每个函数：
   *   pipe(
   *     await state(),           // 1. 获取 Agent 表 { build: {...}, plan: {...} }
   *     values,                  // 2. 提取所有值 [{...}, {...}]
   *     sortBy([...], "desc")    // 3. 排序
   *   )
   *
   * 【为什么用 pipe？】
   * 比起嵌套调用 sortBy(values(await state())), ...)，
   * pipe 让数据流向更清晰，从上到下阅读即可理解处理流程。
   */
  export async function list() {
    const cfg = await Config.get()
    return pipe(
      await state(),
      values, // Object 的值转数组
      // sortBy 第二参数 "desc" 表示降序（true 排在 false 前面）
      sortBy([(x) => (cfg.default_agent ? x.name === cfg.default_agent : x.name === "build"), "desc"]),
    )
  }

  // ---------------------------------------------------------------------------
  // Agent.defaultAgent() - 获取默认 Agent 的名字
  // ---------------------------------------------------------------------------
  /**
   * 返回用户应该默认使用的 Agent 名字。
   *
   * @returns Promise<string> - 默认 Agent 的名字
   * @throws Error - 如果配置的默认 Agent 不存在、是 subagent 或被隐藏
   *
   * 【选择规则】
   * 1. 如果用户配置了 default_agent，使用它（需满足条件）
   * 2. 否则，使用第一个「primary 且非 hidden」的 Agent
   * 3. 如果都找不到，抛出错误
   *
   * 【使用场景】
   * - 新建会话时，需要知道用哪个 Agent
   * - 用户没有明确指定 Agent 时的默认选择
   *
   * 【TypeScript 基础：throw new Error()】
   *
   * throw 用于「抛出异常」，表示出现了程序无法正常处理的情况。
   * 调用方需要用 try/catch 捕获，或者让异常继续向上传播。
   *
   * 例如：
   *   try {
   *     const name = await Agent.defaultAgent()
   *   } catch (e) {
   *     console.error("获取默认 Agent 失败:", e.message)
   *   }
   */
  export async function defaultAgent() {
    const cfg = await Config.get()
    const agents = await state()

    // 如果用户配置了 default_agent，验证它是否合法
    if (cfg.default_agent) {
      const agent = agents[cfg.default_agent]
      if (!agent) throw new Error(`default agent "${cfg.default_agent}" not found`)
      if (agent.mode === "subagent") throw new Error(`default agent "${cfg.default_agent}" is a subagent`)
      if (agent.hidden === true) throw new Error(`default agent "${cfg.default_agent}" is hidden`)
      return agent.name
    }

    // 否则，找第一个可用的主 Agent
    // Object.values() 获取对象的所有值
    // .find() 找到第一个满足条件的元素
    const primaryVisible = Object.values(agents).find((a) => a.mode !== "subagent" && a.hidden !== true)
    if (!primaryVisible) throw new Error("no primary visible agent found")
    return primaryVisible.name
  }

  // ---------------------------------------------------------------------------
  // Agent.generate() - 用 AI 生成新的 Agent 配置
  // ---------------------------------------------------------------------------
  /**
   * 根据用户的描述，使用 AI 自动生成一个新 Agent 的配置。
   *
   * @param input.description - 描述想要的 Agent，如 "一个专注于代码审查的助手"
   * @param input.model - 可选，指定用哪个模型生成（默认使用用户配置的模型）
   * @returns Promise<{ identifier, whenToUse, systemPrompt }> - 生成的 Agent 配置
   *
   * 【工作流程】
   * 1. 准备「元提示词」（PROMPT_GENERATE）：教 AI 如何设计 Agent
   * 2. 告诉 AI 用户的需求 + 已有 Agent 的名字（避免重名）
   * 3. 要求 AI 按指定 schema 返回 JSON
   * 4. 返回结构化的配置数据
   *
   * 【AI SDK：generateObject vs streamObject】
   *
   * - generateObject()：等待完整响应后一次性返回
   *   适合：不需要实时显示进度的场景
   *
   * - streamObject()：边生成边返回
   *   适合：需要实时显示生成进度的场景
   *
   * 【为什么 OpenAI + OAuth 用 streamObject？】
   * Codex 场景（OAuth 认证的 OpenAI）需要传递特殊的 providerOptions，
   * 这些选项在 streamObject 中支持得更好。
   *
   * 【TypeScript 高级：satisfies 关键字】
   *
   * satisfies 是 TypeScript 4.9 引入的关键字：
   *   const params = { ... } satisfies Parameters<typeof generateObject>[0]
   *
   * 作用：
   * 1. 检查 params 是否满足 generateObject 的第一个参数类型
   * 2. 但保留 params 的「具体类型」（而不是扩展为参数类型）
   *
   * 这样既能类型检查，又能保留字面量类型的推断。
   */
  export async function generate(input: { description: string; model?: { providerID: string; modelID: string } }) {
    // 读取配置
    const cfg = await Config.get()

    // 确定使用的模型：用户指定的 > 默认模型
    const defaultModel = input.model ?? (await Provider.defaultModel())
    const model = await Provider.getModel(defaultModel.providerID, defaultModel.modelID)

    // 获取模型对应的「语言模型接口」（用于 AI SDK）
    const language = await Provider.getLanguage(model)

    // 准备系统提示词
    const system = [PROMPT_GENERATE]

    // 触发插件钩子，允许插件修改系统提示词
    await Plugin.trigger("experimental.chat.system.transform", { model }, { system })

    // 获取已存在的 Agent 列表（避免生成重名的 Agent）
    const existing = await list()

    // 构建请求参数
    const params = {
      // 遥测配置（用于收集使用数据，可选）
      experimental_telemetry: {
        isEnabled: cfg.experimental?.openTelemetry,
        metadata: {
          userId: cfg.username ?? "unknown",
        },
      },

      // 较低的温度，保证生成结果的一致性
      temperature: 0.3,

      // 消息列表：系统消息 + 用户消息
      messages: [
        // 系统消息：元提示词
        ...system.map(
          (item): ModelMessage => ({
            role: "system",
            content: item,
          }),
        ),
        // 用户消息：描述 + 已有 Agent 列表
        {
          role: "user",
          content: `Create an agent configuration based on this request: \"${input.description}\".\n\nIMPORTANT: The following identifiers already exist and must NOT be used: ${existing.map((i) => i.name).join(", ")}\n  Return ONLY the JSON object, no other text, do not wrap in backticks`,
        },
      ],

      // 使用的模型
      model: language,

      // 输出 schema：要求 AI 按这个格式返回 JSON
      schema: z.object({
        identifier: z.string(), // Agent 的标识名
        whenToUse: z.string(), // 什么时候使用这个 Agent
        systemPrompt: z.string(), // Agent 的系统提示词
      }),
    } satisfies Parameters<typeof generateObject>[0]

    // -------------------------------------------------------------------------
    // 特殊处理：OpenAI + OAuth 认证（Codex 场景）
    // -------------------------------------------------------------------------
    /**
     * 【为什么需要特殊处理？】
     *
     * Codex 是 OpenAI 的 OAuth 认证方式，与 API Key 认证有所不同。
     * 它需要额外的 providerOptions 来传递 instructions 等参数。
     *
     * 【for await...of 循环】
     *
     * streamObject().fullStream 是一个「异步迭代器」，
     * 每次 yield 一个部分结果（边生成边返回）。
     *
     * for await...of 用于遍历异步迭代器：
     *   for await (const part of result.fullStream) {
     *     // 每次循环处理一个部分结果
     *   }
     */
    if (defaultModel.providerID === "openai" && (await Auth.get(defaultModel.providerID))?.type === "oauth") {
      const result = streamObject({
        ...params, // 展开运算符：复制 params 的所有属性
        // 添加 Codex 特定的选项
        providerOptions: ProviderTransform.providerOptions(model, {
          instructions: SystemPrompt.instructions(),
          store: false, // 不存储对话历史
        }),
        onError: () => {}, // 忽略流式错误（在循环中单独处理）
      })

      // 遍历流式响应，等待完成
      for await (const part of result.fullStream) {
        if (part.type === "error") throw part.error
      }

      // 返回最终的完整对象
      return result.object
    }

    // -------------------------------------------------------------------------
    // 普通情况：使用 generateObject
    // -------------------------------------------------------------------------
    const result = await generateObject(params)
    return result.object
  }
}
