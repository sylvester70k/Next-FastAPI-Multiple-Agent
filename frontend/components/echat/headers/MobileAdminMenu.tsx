'use client'
import { useState } from "react";
import { Check, X, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminMenuItems } from "@/lib/stack";
import { usePathname } from "next/navigation";

const MobileAdminMenu = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const pathname = usePathname();
  const pathnameArray = pathname.split("/");

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="w-10 h-10 p-2 transition-all duration-300 border-transparent rounded-full outline-none bg-buttonBg hover:border-transparent hover:bg-buttonHoverBg text-mainFont focus:outline-none hover:text-hoverFont">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="bg-inputBg mt-[14px] w-[200px] border-secondaryBorder"
        align="end"
      >
        <div className="block sm:hidden">
          {AdminMenuItems.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className={`flex items-center justify-between h-10 py-0 text-base transition-all duration-300 hover:bg-buttonBg text-mainFont`}
              onClick={() => {
                router.push(`/admin/${item.id}`);
              }}
            >
              {item.label}
              <Check
                className={`${pathnameArray[2] === item.id ? "visible" : "invisible"} w-4 h-4`}
              />
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MobileAdminMenu;