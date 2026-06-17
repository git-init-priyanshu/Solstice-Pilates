import { ChatPanel } from "@/components/chat/ChatPanel";

export default function Home() {
  return (
    <main className="h-svh overflow-hidden bg-blue-50 p-4 text-slate-950 md:p-8">
      <section className="mx-auto flex h-full max-w-6xl">
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
          <ChatPanel />
        </div>
      </section>
    </main>
  );
}
