import { ChatPanel } from "@/components/chat/ChatPanel";

export default function AdminPage() {
  return (
    <main className="h-svh overflow-hidden bg-blue-50 p-4 text-slate-950 md:p-8">
      <section className="mx-auto flex h-full max-w-6xl">
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
          <ChatPanel
            apiPath="/api/admin/chat"
            placeholder="Create an event, for example Pilates class today from 2 PM to 5 PM"
            subtitle="Admin assistant"
            title="Solstice Pilates Admin"
            typingLabel="Admin assistant is typing..."
            userIdStorageKey="solstice_pilates_admin_user_id"
          />
        </div>
      </section>
    </main>
  );
}
