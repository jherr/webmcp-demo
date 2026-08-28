/** Minimal WebMCP typings for Codex (`document`) and MCP-B / older Chrome (`navigator`). */

interface ModelContextToolAnnotations {
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
  untrustedContentHint?: boolean
}

interface ModelContextTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: ModelContextToolAnnotations
  execute: (
    args: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown> | unknown
}

interface ModelContextRegisterToolOptions {
  signal?: AbortSignal
  exposedTo?: string[]
}

interface ModelContext {
  registerTool(
    tool: ModelContextTool,
    options?: ModelContextRegisterToolOptions,
  ): Promise<void> | unknown
}

interface Document {
  modelContext?: ModelContext
}

interface Navigator {
  modelContext?: ModelContext
}
