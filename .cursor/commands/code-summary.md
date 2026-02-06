# code-summary

我在写该项目的源码分析报告，分成不同系统模块去撰写，现分析$1模块代码，请问$2这个目录下是该模块的代码实现吗，如果不是请你帮我搜索具体代码位置，如果已找到正确代码位置请你帮我完成以下几节内容：（参数$1为模块名称，参数$2为猜测的该模块代码目录位置，这两个变量将在后续的命令中提供）

1.该系统模块功能文字简介，示例如下：
"""
Agent 系统是 OpenCode 里会话用哪套“人设 + 权限 + 模型”的统一定义与解析层，负责：
● 定义 Agent 结构（Agent.Info）：名字、权限、系统提示、模型等（Info 类型）
● 维护当前项目下所有可用的 Agent表：以程序内置的 Agent（build、plan等）为底，再根据用户配置（cfg.agent）合并成一张 {Agent 名字 :完整配置}的表，
"""

2.系统架构图
生成mermaid架构图，尽量精简但要有必要的文字说明，但要保留必要的文字说明以及代码文件和位置的说明（代码位置描述格式举例：L100-200）。并附上图片的说明

3.该模块源码目录结构，示例如下：
"""
packages/opencode/src/agent/
├── agent.ts          # 核心：Agent.Info、state、get/list/defaultAgent/generate
└── prompt/           # 各子 Agent 的专用系统提示
    ├── compaction.txt  # 会话压缩
    └── title.txt       # 标题生成
"""
并附上重要文件的简要说明，示例如下：
"""
● agent.ts：唯一逻辑入口，所有“Agent 是谁、怎么合并配置”都在这里。
● prompt/.txt：对应子/专用 Agent 的固定系统提示，在 agent.ts 里写死在对应 Agent 的 prompt 字段上。
"""

4.核心数据结构
附上核心数据结构的源码、说明和所包含重要属性的分析

5.核心场景时序图
生成mermaid图，不通场景分成不同图片，尽量精简，但要保留必要的文字说明以及代码文件和位置的说明（代码位置描述格式举例：L100-200）。并附上图片的说明

6.其他必要说明（可选）
根据需要生成mermaid图和文字说明


This command will be available in chat with /code-summary
