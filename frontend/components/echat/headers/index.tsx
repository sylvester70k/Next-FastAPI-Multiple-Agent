'use client'
import { usePathname, useRouter } from "next/navigation";
import DropDownMenu from "@/components/echat/headers/DropDownMenu";
import MobileDropDownMenu from "@/components/echat/headers/MobileDropDownMenu";
import { useEffect, useRef, useState } from "react";
import ProfileDropDownMenu from "@/components/echat/headers/ProfileDropDownMenu";
import Image from "next/image";
import MobileAdminMenu from "./MobileAdminMenu";
import ShadowBtn from "@/components/echat/ShadowBtn";
import ProfileIcon from "@/assets/profile";
import { useAtom } from "jotai";
import {
  isSidebarVisibleAtom,
  chatLogAtom,
  sessionIdAtom,
  isStartChatAtom,
  fileAtom,
} from "@/lib/store";
import HistoryIcon from "@/assets/history";
import NewChatIcon from "@/assets/newChat";
import { IFileWithUrl } from "@/lib/interface";
import { generateSessionId } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useAuth } from "@/context/AuthContext";
import DialogModelMenu from "@/components/echat/DialogModelMenu";

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const endPoint = pathname.split("/");
  const { user } = useAuth();

  const leftSidebarRef = useRef<HTMLDivElement | null>(null);
  const rightSidebarRef = useRef<HTMLDivElement | null>(null);

  const [isLeftSidebar, setIsLeftSidebar] = useState<boolean>(false);
  const [isRightSidebar, setIsRightSidebar] = useState<boolean>(false);
  const [isSidebarVisible, setIsSidebarVisible] = useAtom(isSidebarVisibleAtom);
  const [, setIsStartChat] = useAtom(isStartChatAtom);
  const [, setSessionId] = useAtom(sessionIdAtom);
  const [, setChatLog] = useAtom(chatLogAtom);
  const [, setFiles] = useAtom<IFileWithUrl[]>(fileAtom);
  const { data: session } = useSession();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        leftSidebarRef.current &&
        !leftSidebarRef.current.contains(event.target as Node) &&
        isLeftSidebar
      ) {
        setIsLeftSidebar(false);
      }

      if (
        rightSidebarRef.current &&
        !rightSidebarRef.current.contains(event.target as Node) &&
        isRightSidebar
      ) {
        setIsRightSidebar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isLeftSidebar, isRightSidebar]);

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-10 text-mainFont">
        {/* {
          endPoint[1] !== "router" &&
          <div className="w-full bg-[#FFFFFF0D] py-[6px] text-center text-sm text-[#FFFFFF99] sm:hidden">
            <span>
              TESTNET
            </span>
          </div>
        } */}
        <div className="flex h-[72px] items-center max-sm:px-3 max-sm:pt-[11px] pr-2 md:pr-6 justify-between relative">
          <div className={`items-center pl-4 h-full hidden sm:flex`}>
            <div className={`mr-2`}>
              <Image
                src="/image/logo-chat.png"
                alt="logo"
                width={100}
                height={100}
                className="h-5 w-auto"
                onClick={() => {
                  router.push("/");
                }}
              />
            </div>
            {
              endPoint[1] !== "admin" &&
              <>
                <DropDownMenu />
                <div className="ml-3">
                  <DialogModelMenu />
                </div>
                {
                  endPoint[1] === "workers" && endPoint[2] == "marketing" && endPoint[3] === "twitter" &&
                  <>
                    <ShadowBtn
                      className="ml-8"
                      mainClassName="border-[#2C2B30] border bg-[#292929] shadow-btn-google text-white py-2 px-4 flex items-center justify-center gap-2"
                      onClick={() => {
                        setIsSidebarVisible(true);
                      }}
                    >
                      <ProfileIcon />
                      <span className="text-sm">Profile</span>
                    </ShadowBtn>
                  </>
                }
              </>
            }
          </div>
          {
            endPoint[1] !== "admin" &&
            <div className="flex items-center gap-2 sm:hidden">
              {
                (endPoint[1] === "echat" ||
                  endPoint[1] === "changeLog" ||
                  endPoint[1] === "userSetting" ||
                  endPoint[1] === "roboChat" ||
                  endPoint[1] === "router") &&
                <>
                  <ShadowBtn
                    mainClassName="border-[#2C2B30] border bg-[#292929] shadow-btn-google text-white p-2 flex items-center justify-center gap-2"
                    onClick={() => {
                      setIsSidebarVisible(!isSidebarVisible);
                    }}
                  >
                    <HistoryIcon />
                  </ShadowBtn>
                  <ShadowBtn
                    mainClassName="border-[#2C2B30] border bg-[#292929] shadow-btn-google text-white p-2 flex items-center justify-center gap-2"
                    onClick={() => {
                      setIsStartChat(false);
                      setSessionId(generateSessionId(
                        session?.user?.email as string,
                        Date.now().toString()
                      ));
                      setFiles([]);
                      setIsSidebarVisible(false);
                      setChatLog([]);
                      router.push(`/echat`);
                    }}
                  >
                    <NewChatIcon />
                  </ShadowBtn>
                </>
              }
              {
                (endPoint[1] === "workers" || endPoint[1] === "subscription") &&
                <>
                  <ShadowBtn
                    mainClassName="border-[#2C2B30] border bg-[#292929] shadow-btn-google text-white p-2 flex items-center justify-center gap-2"
                  >
                    <ProfileIcon />
                  </ShadowBtn>
                </>
              }
            </div>
          }
          <div className="flex items-center gap-2 sm:hidden">
            <Image
              src="/image/logo-chat.png"
              alt="logo"
              width={100}
              height={100}
              className="h-5 w-auto"
              onClick={() => {
                router.push("/");
              }}
            />
            <DropDownMenu />
          </div>
          {
            endPoint[1] !== "admin" ? (
              <>
                <div className="items-center hidden gap-10 sm:flex">
                  <div className="flex items-center">
                    {
                      (
                        endPoint[1] === "echat" ||
                        endPoint[1] === "changeLog" ||
                        endPoint[1] === "userSetting" ||
                        endPoint[1] === "roboChat" ||
                        endPoint[1] === "router"
                      ) &&
                      <>
                        <button
                          className="bg-transparent border-none p-3 hover:bg-[#ffffff80] focus:bg-[#ffffff80] focus:outline-none rounded-md"
                          onClick={() => {
                            setIsStartChat(false);
                            setSessionId(generateSessionId(
                              session?.user?.email as string,
                              Date.now().toString()
                            ));
                            setFiles([]);
                            setIsSidebarVisible(false);
                            setChatLog([]);
                            router.push(`/echat`);
                          }}
                        >
                          <NewChatIcon />
                          {/* <span className="text-sm">New Chat</span> */}
                        </button>
                        <button
                          className="bg-transparent border-none p-3 mr-5 hover:bg-[#ffffff80] focus:bg-[#ffffff80] focus:outline-none rounded-md"
                          onClick={() => {
                            setIsSidebarVisible(!isSidebarVisible);
                          }}
                        >
                          <HistoryIcon />
                          {/* <span className="text-sm">History</span> */}
                        </button>
                      </>
                    }
                    <ProfileDropDownMenu endpoint={endPoint[1]} />
                  </div>
                </div>
                <div className="sm:hidden flex items-center gap-2">
                  <MobileDropDownMenu endpoint={endPoint[1]} />
                </div>
              </>
            ) : (
              <>
                <div className="text-white text-2xl font-bold flex items-center gap-2">
                  Admin
                  <div className="md:hidden">
                    <MobileAdminMenu />
                  </div>
                </div>
              </>
            )
          }
        </div>
        {/* {
          endPoint[1] !== "admin" &&
          <div className="sm:hidden">
            <DropDownModelMenu />
          </div>
        } */}
      </header>
    </>
  );
};

export default Header;