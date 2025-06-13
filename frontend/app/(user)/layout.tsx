'use client'
import Header from "@/components/echat/headers";

const UserLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen h-fit">
      <Header />
      {children}
    </div>
  )
}

export default UserLayout;