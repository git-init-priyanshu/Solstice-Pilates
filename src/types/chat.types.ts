export type ChatMessage = {
  id: string;
  sender: "User" | "LLM";
  text: string;
  time?: string;
};
