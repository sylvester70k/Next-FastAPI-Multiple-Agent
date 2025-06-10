"use client";

import { useEffect, useState } from "react";
import ShadowBtn from "@/components/echat/ShadowBtn";
import { routerModelAtom, routerModelsAtom, modelTypeAtom } from "@/lib/store";
import { useAtom } from "jotai";
import { ModelType } from "@/lib/stack";
import { toast } from "sonner";
import { IAI } from "@/lib/interface";
import { ChevronDown, Search } from "lucide-react";
import ClaudeModelIcon from "@/assets/models/ClaudeModelIcon";
import OpenaiModelIcon from "@/assets/models/OpenaiModelIcon";
import AtlasModelIcon from "@/assets/models/AtlasModelIcon";
import DeepseekModelIcon from "@/assets/models/DeepseekModelIcon";
import MistralModelIcon from "@/assets/models/MistralModelIcon";
import GemmaModelIcon from "@/assets/models/GemmaModelIcon";
import MetaModelIcon from "@/assets/models/MetaModelIcon";
import NousModelIcon from "@/assets/models/NousModelIcon";
import QwenModelIcon from "@/assets/models/QwenModelIcon";
import TngModelIcon from "@/assets/models/TngModelIcon";
import LlamaModelIcon from "@/assets/models/LlamaModelIcon";
import ArliaiModelIcon from "@/assets/models/ArliaiModelIcon";
import NvidiaModelIcon from "@/assets/models/NvidiaModelIcon";
import OpengvlabModelIcon from "@/assets/models/OpengvlabModelIcon";
import MoonshotModelIcon from "@/assets/models/MoonshotModelIcon";
import GeminiModelIcon from "@/assets/models/GeminiModelIcon";
import QwerkyModelIcon from "@/assets/models/QwerkyModelIcon";
import { useAuth } from "@/context/AuthContext";
import React from "react";

const getModelIcon = (type: string) => {
    switch (type) {
        case "anthropic":
            return <ClaudeModelIcon />;
        case "openai":
            return <OpenaiModelIcon />;
        case "edith":
            return <AtlasModelIcon />;
        case "deepseek":
            return <DeepseekModelIcon />;
        case "mistral":
            return <MistralModelIcon />;
        case "gemma":
            return <GemmaModelIcon />;
        case "meta":
            return <MetaModelIcon />;
        case "nous":
            return <NousModelIcon />;
        case "qwen":
            return <QwenModelIcon />;
        case "tng":
            return <TngModelIcon />;
        case "llama":
            return <LlamaModelIcon />;
        case "arliai":
            return <ArliaiModelIcon />;
        case "nvidia":
            return <NvidiaModelIcon />;
        case "opengvlab":
            return <OpengvlabModelIcon />;
        case "moonshot":
            return <MoonshotModelIcon />;
        case "gemini":
            return <GeminiModelIcon />;
        case "qwerky":
            return <QwerkyModelIcon />;
        default:
            return null;
    }
};

const DialogModelMenu = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [menuId, setMenuId] = useState<string>("");
    const [itemTitle, setItemTitle] = useState<string>("Atlas by EDITH");
    const [routerModel, setRouterModel] = useAtom(routerModelAtom);
    const [routerModels, setRouterModels] = useAtom(routerModelsAtom);
    const [search, setSearch] = useState<string>("");
    const [, setModelType] = useAtom(modelTypeAtom);
    const { user } = useAuth();

    const handleItemClick = (itemId: string) => {
        const item = routerModels.find((item) => item._id === itemId);
        if (item) {
            setItemTitle(item.name);
            setRouterModel(item._id);
            setMenuId(item.type);
            setModelType(item.type);
            setIsOpen(false);
        }
    };

    useEffect(() => {
        const fetchRouterModels = async () => {
            try {
                const res = await fetch("/api/chat/aiModel");
                const data = await res.json();
                if (data.status) {
                    setRouterModels(data.data);
                    if (!routerModel) {
                        setItemTitle(data.data[0].name);
                        !routerModel && setRouterModel(data.data[0]._id);
                    } else {
                        setItemTitle(routerModels.find((item) => item._id === routerModel)?.name || "");
                    }
                } else {
                    toast.error(data.message);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to fetch router models");
            }
        }
        if (!menuId) {
            setMenuId(ModelType[0].id);
        }
        routerModels.length == 0 && fetchRouterModels();
        if (routerModel && routerModels.length > 0) {
            setItemTitle(routerModels.find((item) => item._id === routerModel)?.name || "");
            setMenuId(routerModels.find((item) => item._id === routerModel)?.type || "");
        }
    }, [ModelType, routerModel]);

    return (
        <div>
            <ShadowBtn
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-md"
                mainClassName="border-[#2C2B30] border bg-[#292929] shadow-btn-google text-white py-2 h-[38px] px-3 gap-0 rounded-md text-[12px] sm:text-sm flex items-center justify-center gap-[6px]"
            >
                <span className="flex-1 leading-none text-center">{itemTitle}</span>
                <ChevronDown />
                {/* <Image src="/image/UpDown.png" alt="arrow-down" width={9} height={14} /> */}
            </ShadowBtn>
            <div
                className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 z-20 ${isOpen ? "block" : "hidden"}`}
                onClick={() => setIsOpen(false)}
            >
            </div>
            <div className={`z-20 rounded-2xl flex flex-col w-[98vw] sm:w-[520px] h-[500px] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0C0C0E] border border-[#25252799] p-4 ${!isOpen && "hidden"}`}>
                <div className={`w-full border border-[#454449] bg-[#292929] rounded-lg py-2 pl-8 pr-2 relative text-sm`}>
                    <input
                        type="text"
                        placeholder="Search ..."
                        className="bg-transparent border-none outline-none text-white"
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-mainFont" />
                </div>
                <div className="border-t border-[#25252799]" />
                <div className="w-full flex-auto overflow-y-auto">
                    {
                        routerModels && routerModels.length > 0 && routerModels.filter((item) => item.type === menuId && item.name.toLowerCase().includes(search.toLowerCase())).map((subItem: IAI) => (
                            <ModelItem key={subItem._id} item={subItem} handleItemClick={handleItemClick} isActive={user?.currentplan?.activeModels?.includes(subItem._id) || false} />
                        ))
                    }
                </div>
            </div>
        </div>
    );
};

const ModelItem = (
    { item, handleItemClick, isActive }:
        { item: IAI, handleItemClick: (itemId: string) => void, isActive: boolean }
) => {
    return (
        <div
            className={
                `border border-transparent flex gap-2 items-center cursor-pointer hover:border-[#2C2B3080] hover:bg-[#FFFFFF05] focus:border-[#2C2B3080] focus:bg-[#FFFFFF05] px-3 py-2 rounded-md relative`
            }
            onClick={() => isActive && handleItemClick(item._id)}
        >
            {
                getModelIcon(item.iconType)
            }
            <span className={`text-[14px] text-nowrap text-white flex flex-col gap-[2px]`}>
                <div className={`${!isActive && "opacity-50"} h-[20px] flex items-center`}>
                    {item.name}
                </div>
                {
                    !isActive && (
                        <div className="bg-[#FFFFFF0D] text-[#ffffff5e] text-xs p-[2px] rounded-md w-fit h-[20px]">
                            Not available on the free plan.
                        </div>
                    )
                }
            </span>
            {/* {
                !isActive && (
                    <div className="max-sm:hidden absolute top-1/2 right-[18px] transform -translate-y-1/2 bg-[#FFFFFF0D] text-white text-xs px-3 py-1 rounded-md">
                        Not available on the free plan.
                    </div>
                )
            } */}
        </div>
    );
};

export default DialogModelMenu;