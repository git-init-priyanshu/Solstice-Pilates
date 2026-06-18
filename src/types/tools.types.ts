export type ToolResult = {
  ok: boolean;
  message: string;
  data?: unknown;
  bookingStatus?: string;
  intent?: string;
  userProfile?: {
    email?: string;
    name?: string;
    phone?: string;
  };
};

export type ToolArgs = Record<string, unknown>;

export type WorkspaceToolContext = {
  chatId?: string;
  userId?: string;
};
