export type ToolResult = {
  ok: boolean;
  message: string;
  data?: unknown;
};

export type ToolArgs = Record<string, unknown>;

export type WorkspaceToolContext = {
  chatId?: string;
  userId?: string;
};
