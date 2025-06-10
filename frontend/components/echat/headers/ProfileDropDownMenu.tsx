'use client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import ChangeLog from "@/assets/changelog";
import DocsIcon from "@/assets/docs";

const ProfileDropDownMenu = ({ endpoint }: { endpoint: string }) => {
  const router = useRouter();
  const { user } = useAuth();

  const handleSetting = () => {
    router.push("/userSetting");
  }

  const handleSubscription = () => {
    router.push("/subscription");
  }

  const handleLogout = () => {
    signOut();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={
        `p-0 items-center flex gap-2 bg-[#29292966] border border-[#2C2B30] rounded-full focus:outline-none hover:outline-none hover:border-[#2C2B30] !h-[35px]`
      }>
        {
          user?.avatar ? (
            <Image src={user?.avatar} alt="avatar" className="h-[35px] w-[35px] rounded-full" width={35} height={35} />
          ) : (
            <Image src="/image/default-avatar.png" alt="avatar" className="!h-[35px] !w-auto max-w-[35px]" width={35} height={35} />
          )
        }

        {/* {endpoint != "router" && <p className="font-semibold text-sm text-[#FFFFFF]">Points: {user?.chatPoints ? user?.chatPoints.toFixed(2) : 0.00}</p>} */}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="bg-[#000000] mt-[14px] min-w-[300px] w-fit border-[#FFFFFF]/10 border p-5 rounded-lg text-[#E2E2E2] text-base font-semibold"
        align="end"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          {
            user?.avatar ? (
              <Image src={user?.avatar} alt="avatar" className="h-[60px] w-[60px] rounded-full" width={60} height={60} />
            ) : (
              <Image src="/image/default-avatar.png" alt="avatar" className="!h-[60px] !w-auto max-w-[60px]" width={60} height={60} />
            )
          }

          <div className="ml-2.5 flex-1">
            <p className="text-base font-semibold">{user?.name}</p>
            <p className="text-base font-normal text-[#FFFFFF]/80">{user?.email}</p>
          </div>

        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#FFFFFF]/10 my-4" />
        <DropdownMenuItem className="text-base hover:bg-[#ffffff80] focus:bg-[#ffffff80]" onClick={handleSetting}>
          <Settings className="!w-5 !h-5" />
          Setting
        </DropdownMenuItem>
        <DropdownMenuItem className="text-base hover:bg-[#ffffff80] focus:bg-[#ffffff80]" onClick={handleSubscription}>
          <CreditCard className="!w-5 !h-5" />
          Subscription
        </DropdownMenuItem>
        <DropdownMenuItem className="text-base hover:bg-[#ffffff80] focus:bg-[#ffffff80]" onClick={() => router.push("/changeLog")}>
          <ChangeLog />
          Change Log
        </DropdownMenuItem>
        <DropdownMenuItem className="text-base hover:bg-[#ffffff80] focus:bg-[#ffffff80]" onClick={() => window.open("https://docs.edithx.ai", "_blank")}>
          <DocsIcon />
          Docs
        </DropdownMenuItem>
        <DropdownMenuItem className="text-base hover:bg-[#ffffff80] focus:bg-[#ffffff80]" onClick={handleLogout}>
          <LogOut className="!w-5 !h-5" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropDownMenu;
