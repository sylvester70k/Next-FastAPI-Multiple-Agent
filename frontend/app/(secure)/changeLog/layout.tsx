'use client'
import ChatHistory from "@/components/echat/ChatHistory";
import Header from "@/components/echat/headers";

const LogLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen h-fit">
      <ChatHistory />
      <Header />
      {children}
    </div>
  )
}

export default LogLayout;