import './App.css'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { WorkspaceToolsPanel } from '@/components/workspace/WorkspaceToolsPanel'
import { useChat } from '@/hooks/useChat'
import { useWorkspaceTools } from '@/hooks/useWorkspaceTools'

function App() {
  const chat = useChat()
  const workspace = useWorkspaceTools()

  return (
    <main className="min-h-svh bg-blue-50 p-4 text-slate-950 md:p-8">
      <section className="mx-auto min-h-[calc(100svh-2rem)] max-w-6xl gap-4">
        <ChatPanel
          chatInput={chat.chatInput}
          handleChatSubmit={chat.handleChatSubmit}
          isChatLoading={chat.isChatLoading}
          messages={chat.messages}
          setChatInput={chat.setChatInput}
          submitChatMessage={chat.submitChatMessage}
        />
        {/* <WorkspaceToolsPanel workspace={workspace} /> */}
      </section>
    </main>
  )
}

export default App
