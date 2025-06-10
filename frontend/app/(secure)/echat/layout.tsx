'use client'
import ChatHistory from "@/components/echat/ChatHistory";
import Header from "@/components/echat/headers/index";

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen h-fit">
      <ChatHistory />
      <Header />
      {children}
    </div>
  )
}

export default ChatLayout;