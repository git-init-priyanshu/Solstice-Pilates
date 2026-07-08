import { ChatPanel } from "@/components/chat/ChatPanel";

export default function Home() {
  return (
    <main className="h-svh overflow-hidden bg-background p-4 text-foreground md:p-8">
      <section className="mx-auto flex h-full max-w-6xl">
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <ChatPanel showThemeToggle />
        </div>
      </section>
    </main>
  );
}
