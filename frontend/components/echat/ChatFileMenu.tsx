import { useState, useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { File, Plus, Trash, X } from "lucide-react";
import ShadowBtn from "@/components/echat/ShadowBtn";

interface FileWithUrl {
    file: File;
    url: string;
}

interface ChatFileMenuProps {
    files: FileWithUrl[];
    handleClickPlusIcon: () => void;
    handleRemoveFile: (index: number) => void;
    setFiles: React.Dispatch<React.SetStateAction<FileWithUrl[]>>;
    isFileMenuOpen: boolean;
    setIsFileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChatFileMenu: React.FC<ChatFileMenuProps> = ({
    files,
    handleClickPlusIcon,
    handleRemoveFile,
    setFiles,
    isFileMenuOpen,
    setIsFileMenuOpen
}) => {

    const [isOpen, setIsOpen] = useState<boolean>(isFileMenuOpen);

    useEffect(() => {
        setIsOpen(isFileMenuOpen);
    }, [isFileMenuOpen]);


    return (
        <DropdownMenu onOpenChange={setIsFileMenuOpen}>
            <DropdownMenuTrigger className={`p-0 bg-transparent border-none focus:outline-none`}>
                <ShadowBtn
                    className={`rounded-full hover:bg-btn-shadow focus:bg-btn-shadow ${!isOpen && 'border-transparent bg-transparent'}`}
                    mainClassName={`hover:border-[#2C2B30] focus:border-[#2C2B30] hover:bg-[#292929] focus:bg-[#292929] shadow-btn-google w-[38px] h-[38px] text-white py-2 px-2 gap-0 rounded-full flex flex-col items-center justify-center ${!isOpen ? 'border-transparent bg-transparent' : 'border-[#2C2B30]'}`}
                >
                    <File className="w-[15px] h-[15px]" />
                </ShadowBtn>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="bg-inputBg mt-[14px] border-secondaryBorder flex flex-col gap-2 text-mainFont w-[370px]"
                align="start"
            >
                <div className="w-full flex justify-between items-center px-2">
                    <div>Attached Files</div>
                    <div className="flex gap-3">
                        <button className="text-mainFont text-sm flex items-center gap-1 p-1 bg-transparent" onClick={handleClickPlusIcon}>
                            <Plus />
                            Add
                        </button>
                        <button className="text-mainFont text-sm flex items-center gap-1 p-1 bg-transparent" onClick={() => setFiles([])}>
                            <Trash />
                            Clear
                        </button>
                    </div>
                </div>
                <div className="border-t border-[#25252799]" />
                {files.map((file, index) => (
                    <div key={index}>
                        <div className="flex justify-between items-center px-2">
                            <div className="flex items-center gap-2">
                                <File />
                                <div className="max-w-[150px] truncate">
                                    {file.file.name}
                                </div>
                            </div>
                            <X className="cursor-pointer rounded-full p-[1px] hover:border hover:border-red-500 hover:bg-red-500 hover:text-white transition-all duration-150" onClick={() => handleRemoveFile(index)} />
                        </div>
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ChatFileMenu;
