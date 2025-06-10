import { atom } from "jotai";
import { 
    ChatHistory, 
    ChatLog, 
    IResearchLog, 
    IFileWithUrl,
    IAI
} from "./interface";

const chatHistoryAtom = atom<ChatHistory[]>([]);
const chatLogAtom = atom<ChatLog[]>([]);
const sessionIdAtom = atom<string | null>(null);
const isStartChatAtom = atom<boolean>(false);
const isStreamingAtom = atom<boolean>(false);
const isSidebarVisibleAtom = atom<boolean>(true);
const researchLogAtom = atom<IResearchLog[]>([]);
const researchStepAtom = atom<number>(0);
const chatTypeAtom = atom<number>(0);
const chatModeAtom = atom<number>(0);
const progressAtom = atom<number>(0);
const isResearchAreaVisibleAtom = atom<boolean>(false);
const activeChatIdAtom = atom<string>("");
const fileAtom = atom<IFileWithUrl[]>([]);
const routerModelAtom = atom<string>("");
const modelTypeAtom = atom<string>("text");
const routerModelsAtom = atom<IAI[]>([]);

export {
    chatHistoryAtom,
    chatLogAtom, 
    sessionIdAtom, 
    isStartChatAtom, 
    isStreamingAtom, 
    isSidebarVisibleAtom, 
    researchLogAtom, 
    researchStepAtom, 
    chatTypeAtom,
    chatModeAtom,
    progressAtom,
    isResearchAreaVisibleAtom,
    activeChatIdAtom,
    fileAtom,
    routerModelAtom,
    routerModelsAtom,
    modelTypeAtom
};
