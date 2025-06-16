"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ShadowBtn from "@/components/echat/ShadowBtn";
import React from "react";
import { ChevronsUpDownIcon } from "lucide-react";

const MenuItems = [
    {
        id: "echat",
        label: "EDITH",
        disable: false,
    },
    {
        id: "ultron",
        label: "ULTRON",
        disable: false,
    },
]

const DropDownMenu = () => {
  const router = useRouter();
  const pathname = usePathname();
  const url = pathname.split("/")[1];

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [, setItemId] = useState<string>("");
  const [itemTitle, setItemTitle] = useState<string>("");

  const handleItemClick = (itemId: string) => {
    const item = MenuItems.find((menu) => menu.id === itemId);
    if (item && !item.disable) {
      setItemTitle(item.label);
      setItemId(item.id);
      router.push(`/${item.id}`);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    for (const menu of MenuItems) {
      const subItem = menu.id === url || (menu.id == "dashboard" && url === "agents");
      if (subItem) {
        setItemTitle(menu.label);
        setItemId(menu.id);
        return;
      } else {
        setItemTitle("EDITH");
        setItemId("edith");
      }
    }
  }, [MenuItems, url]);

  return (
    <>
      <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
        <DropdownMenuTrigger className="flex justify-between items-center gap-3 bg-transparent hover:border-transparent h-2 text-mainFont text-[16px] focus:outline-none w-fit p-0">
          <span className="flex-1 leading-none text-center">{itemTitle}</span>
          <ChevronsUpDownIcon className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-box-bg mt-[14px] border-box-border rounded-2xl flex flex-col min-w-[300px]"
          align="center"
        >
          <div className="p-3 flex flex-col gap-3">
            {
              MenuItems.map((subItem) => (
                <ShadowBtn
                  key={subItem.id}
                  className={`w-full rounded-md`}
                  mainClassName={`text-white flex flex-col items-center justify-center py-7 relative ${subItem.disable && "bg-[#141415]"}`}
                  onClick={() => handleItemClick(subItem.id)}
                >
                  <div className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="ryxen-logo" className="h-[22px] w-auto" width={100} height={22} />
                    <span className="text-[16px] text-nowrap">{subItem.label}</span>
                  </div>
                </ShadowBtn>
              ))
            }
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default DropDownMenu;