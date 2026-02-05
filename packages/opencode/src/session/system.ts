/**
 * 系统提示词（system prompt）的组装与分发。
 * 负责：按模型选择供应商专用提示、提供默认指令、注入运行环境信息。
 * 被 llm.ts、prompt.ts、agent.ts 等调用。
 */

import { Ripgrep } from "../file/ripgrep"
import { Instance } from "../project/instance"

import PROMPT_ANTHROPIC from "./prompt/anthropic.txt"
import PROMPT_ANTHROPIC_WITHOUT_TODO from "./prompt/qwen.txt"
import PROMPT_BEAST from "./prompt/beast.txt"
import PROMPT_GEMINI from "./prompt/gemini.txt"
import PROMPT_CODEX from "./prompt/codex_header.txt"
import type { Provider } from "@/provider/provider"

export namespace SystemPrompt {
  /**
   * 返回默认/通用系统指令（当前为 Codex 头部文案）。
   * 用于 agent 配置的 instructions、以及 Codex 会话的 options.instructions。
   */
  export function instructions() {
    return PROMPT_CODEX.trim()
  }

  /**
   * 根据模型 ID 选择对应的供应商专用系统提示，返回字符串数组（一段或多段）。
   * 匹配顺序：gpt-5 → Codex；gpt-/o1/o3 → Beast；gemini- → Gemini；claude → Anthropic；其余 → 通用兜底。
   * 非 Codex 会话在 llm 中会拼进 system 消息；Codex 会话不调用此函数（指令走 options.instructions）。
   */
  export function provider(model: Provider.Model) {
    if (model.api.id.includes("gpt-5")) return [PROMPT_CODEX]
    if (model.api.id.includes("gpt-") || model.api.id.includes("o1") || model.api.id.includes("o3"))
      return [PROMPT_BEAST]
    if (model.api.id.includes("gemini-")) return [PROMPT_GEMINI]
    if (model.api.id.includes("claude")) return [PROMPT_ANTHROPIC]
    return [PROMPT_ANTHROPIC_WITHOUT_TODO]
  }

  /**
   * 生成运行环境说明段落：模型信息、工作目录、是否 Git、平台、日期。
   * <files> 内预留了文件树逻辑（当前 project.vcs === "git" && false 恒为 false，不输出树）。
   * 在 prompt.ts 中与 InstructionPrompt.system() 一起拼入 system 数组。
   */
  export async function environment(model: Provider.Model) {
    const project = Instance.project
    return [
      [
        `You are powered by the model named ${model.api.id}. The exact model ID is ${model.providerID}/${model.api.id}`,
        `Here is some useful information about the environment you are running in:`,
        `<env>`,
        `  Working directory: ${Instance.directory}`,
        `  Is directory a git repo: ${project.vcs === "git" ? "yes" : "no"}`,
        `  Platform: ${process.platform}`,
        `  Today's date: ${new Date().toDateString()}`,
        `</env>`,
        `<files>`,
        `  ${
          project.vcs === "git" && false
            ? await Ripgrep.tree({
                cwd: Instance.directory,
                limit: 200,
              })
            : ""
        }`,
        `</files>`,
      ].join("\n"),
    ]
  }
}
