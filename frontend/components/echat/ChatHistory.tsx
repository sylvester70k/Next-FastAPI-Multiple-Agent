import { useEffect, useState } from "react";
import { Check, Edit, Trash2, X, Search, Plus } from "lucide-react";
import { useAtom } from "jotai";
import { ChatHistory as ChatHistoryType, IFileWithUrl } from "@/lib/interface";
import { chatHistoryAtom, chatLogAtom, sessionIdAtom, isStartChatAtom, isSidebarVisibleAtom, fileAtom } from "@/lib/store";
import moment from "moment";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ShadowBtn from "@/components/echat/ShadowBtn";
import DropDownMenu from "@/components/echat/headers/DropDownMenu";
import HistoryIcon from "@/assets/history";
import Image from "next/image";
import { generateSessionId } from "@/lib/utils";
import DoubleRightArrow from "@/assets/doubleRightArrow";
import { useAuth } from "@/context/AuthContext";
import { formatNumber } from "@/lib/utils";
import { format } from "date-fns";
import CircularProgress from "@/components/echat/CircularProgress";

// Custom Divider component using Tailwind CSS
const CustomDivider = () => {
  return <div className="w-full h-[1px] bg-[#29292B]" />;
};

const ChatHistory = () => {
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
    const [, setIsLoading] = useState<boolean>(false);
    const [chatHistory, setChatHistory] = useAtom(chatHistoryAtom);
    const [, setChatLog] = useAtom(chatLogAtom);
    const [sessionId, setSessionId] = useAtom(sessionIdAtom);
    const [, setIsStartChat] = useAtom(isStartChatAtom);
    const [isSidebarVisible, setIsSidebarVisible] = useAtom(isSidebarVisibleAtom);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState<string>("");
    const [search, setSearch] = useState<string>("");
    const [, setFiles] = useAtom<IFileWithUrl[]>(fileAtom);
    const router = useRouter();
    const { data: session } = useSession();
    const { user } = useAuth();
    const [percent, setPercent] = useState<number>(0);

    useEffect(() => {
        if (user) {
            const usedPoints = user.pointsUsed ?? 0;
            const availablePoints = user.currentplan.points + user.currentplan.bonusPoints;
            setPercent(Math.ceil((usedPoints / availablePoints) * 100));
        }
    }, [user])

    const deleteSession = async (id: string) => {
        await setChatHistory(chatHistory.filter((session) => session.id !== id));
        if (sessionId === id) {
            setSessionId(chatHistory[0].id);
        }
        await fetch("/api/chat/history", {
            method: "DELETE",
            body: JSON.stringify({ id }),
        });
    }

    const extractTitleFromMd = (markdown: string) => {
        const cleanText = markdown
            .replace(/^#+\s+/, '')  // Remove heading symbols
            .replace(/\*\*/g, '');  // Remove asterisks
        return cleanText.trim() || 'Untitled Chat';
    }

    // Function to handle title update
    const updateSessionTitle = async (id: string, newTitle: string) => {
        if (newTitle != "" && newTitle != extractTitleFromMd(chatHistory.find(session => session.id === id)?.title || "")) {
            try {
                await fetch("/api/chat/history", {
                    method: "PUT",
                    body: JSON.stringify({ id, title: newTitle }),
                });
                setChatHistory(chatHistory.map(session =>
                    session.id === id ? { ...session, title: newTitle } : session
                ));
            } catch (error) {
                console.error(error);
            }
        }
        setEditingSessionId(null);
    };

    useEffect(() => {
        setChatHistory([]);
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            setIsLoading(true);
            try {
                const res = await fetch("/api/chat/history");
                const data = await res.json();
                if (data.success) {
                    setChatHistory(data.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                await new Promise(resolve => setTimeout(resolve, 1000));
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
    }, []);

    useEffect(() => {
        const fetchChats = async () => {
            if (sessionId) {
                setIsLoading(true);
                try {
                    const chats = await fetch(`/api/chat/log?sessionId=${sessionId}`);
                    const data = await chats.json();
                    if (data.success && data.data && data.data.length > 0) {
                        setChatLog(data.data);
                        setIsStartChat(true);
                    } else {
                        setIsStartChat(false);
                    }
                } catch (error) {
                    console.error(error);
                    setIsStartChat(false);
                } finally {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setIsLoading(false);
                }
            }
        };

        if (sessionId) {
            fetchChats();
        }
    }, [sessionId]);

    const categorizeSessions = (sessions: ChatHistoryType[]) => {
        const today = moment().startOf('day');
        const yesterday = moment().subtract(1, 'days').startOf('day');
        const last7Days = moment().subtract(7, 'days').startOf('day');
        const last30Days = moment().subtract(30, 'days').startOf('day');

        const categories = {
            today: [] as ChatHistoryType[],
            yesterday: [] as ChatHistoryType[],
            last7Days: [] as ChatHistoryType[],
            last30Days: [] as ChatHistoryType[],
        };

        sessions.forEach(session => {
            const sessionTime = moment(Number(session.chats[session.chats.length - 1].timestamp));
            if (sessionTime.isSameOrAfter(today)) {
                categories.today.push(session);
            } else if (sessionTime.isSameOrAfter(yesterday)) {
                categories.yesterday.push(session);
            } else if (sessionTime.isSameOrAfter(last7Days)) {
                categories.last7Days.push(session);
            } else if (sessionTime.isSameOrAfter(last30Days)) {
                categories.last30Days.push(session);
            }
        });

        return categories;
    };

    // const categorizedSessions = categorizeSessions(chatHistory.sort((a, b) => Number(b.chats[b.chats.length - 1].timestamp) - Number(a.chats[a.chats.length - 1].timestamp)));

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ${isSidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    } z-20`}
                onClick={() => setIsSidebarVisible(false)}
            />

            {/* Drawer */}
            <div className={`sm:m-1 border border-[#25252799] bg-[#0C0C0E] flex flex-col items-start h-full sm:h-[calc(100vh-200px)] sm:rounded-2xl fixed top-0 left-0 sm:transform sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 transition-all duration-500 ease-in-out transform ${isSidebarVisible
                ? "w-[650px] max-sm:w-full px-2 opacity-100 max-sm:translate-x-0 sm:scale-100"
                : "w-[650px] max-sm:w-full px-0 opacity-0 max-sm:-translate-x-full sm:scale-0"
                } z-20`}>
                {
                    isSidebarVisible && (
                        <>
                            <div className={`items-center px-3 pt-[10px] hidden`}>
                                <div className={`py-[1px] mr-2`}>
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
                                <DropDownMenu />
                                <ShadowBtn
                                    className="ml-8"
                                    mainClassName="border-[#2C2B30] border bg-[#292929] shadow-btn-google text-white py-2 px-4 flex items-center justify-center gap-2"
                                    onClick={() => {
                                        setIsSidebarVisible(!isSidebarVisible);
                                    }}
                                >
                                    <HistoryIcon width="13" height="14" />
                                    <span className="text-sm">History</span>
                                </ShadowBtn>
                            </div>
                            <div className="w-full px-2 mt-4 sm:mt-9 flex gap-3 items-center">
                                <div className={`w-full border border-[#454449] bg-[#292929] rounded-lg py-2 pl-8 pr-2 relative`}>
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
                                <DoubleRightArrow className="sm:hidden cursor-pointer"
                                    onClick={() => {
                                        setIsSidebarVisible(!isSidebarVisible);
                                    }}
                                />
                                <ShadowBtn
                                    className="w-fit max-sm:hidden"
                                    mainClassName="p-2 text-[12px] bg-gradient-to-b from-[#DFDFDF] to-[#BFBFBF] flex gap-2 items-center"
                                    onClick={() => {
                                        setIsStartChat(false);
                                        setSessionId(generateSessionId(
                                            session?.user?.email as string,
                                            Date.now().toString()
                                        ));
                                        setFiles([]);
                                        setIsSidebarVisible(false);
                                        setChatLog([]);
                                        router.push("/echat");
                                    }}
                                >
                                    <span className="text-black font-semibold text-sm">New</span>
                                    <span className="flex flex-col items-center justify-center bg-black rounded-md w-4 h-4">
                                        <Plus size={12} className="text-white" />
                                    </span>
                                </ShadowBtn>
                            </div>
                            <div
                                onClick={() => {
                                    setIsStartChat(false);
                                    setSessionId(generateSessionId(
                                        session?.user?.email as string,
                                        Date.now().toString()
                                    ));
                                    setFiles([]);
                                    setIsSidebarVisible(false);
                                    setChatLog([]);
                                    router.push("/echat");
                                }}
                                className="text-subButtonFont mt-7 mb-3 px-2 flex justify-between items-center w-full cursor-pointer"
                            >
                                <span>History</span>
                                <div
                                    className="sm:hidden flex items-center text-mainFont"
                                    onClick={() => {
                                        setIsStartChat(false);
                                        setSessionId(generateSessionId(
                                            session?.user?.email as string,
                                            Date.now().toString()
                                        ));
                                        setFiles([]);
                                        setIsSidebarVisible(false);
                                        setChatLog([]);
                                        router.push("/echat");
                                    }}
                                >
                                    New
                                    <Plus />
                                </div>
                            </div>
                            <div className="w-full px-2">
                                <CustomDivider />
                            </div>
                            <div className="text-left flex flex-col flex-auto overflow-y-auto gap-1 overflow-x-hidden w-full">
                                {isLoadingHistory ? (
                                    <CircularProgress className="m-4 w-8 h-8" />
                                ) : (
                                    // Object.entries(categorizedSessions).map(([category, sessions]) => (
                                    //     sessions.length > 0 &&
                                    //     <div key={category}>
                                    //         <div className="w-full px-2">
                                    //             <div className="text-subButtonFont my-4 border-b border-[#29292B] w-fit">{category.charAt(0).toUpperCase() + category.slice(1)}</div>
                                    //         </div>
                                    //         {sessions.map((session: ChatHistoryType) => (
                                    //             <div
                                    //                 key={session.id}
                                    //                 className={`${session.id === sessionId ?
                                    //                     "text-mainFont p-[1px] bg-btn-shadow" :
                                    //                     "cursor-pointer"} 
                                    //                 rounded-lg hover:text-mainFont focus:text-mainFont p-[1px] hover:bg-btn-shadow focus:bg-btn-shadow cursor-pointer mb-[2px]`
                                    //                 }
                                    //             >
                                    //                 <div
                                    //                     key={session.id}
                                    //                     onClick={() => { setSessionId(session.id); setIsSidebarVisible(false); setFiles([]); }}
                                    //                     className={
                                    //                         `${session.id === sessionId ?
                                    //                             "bg-[#29292980] text-mainFont" :
                                    //                             "text-subButtonFont"} 
                                    //                         flex items-center justify-start group transition-colors duration-200 px-2 py-2 relative rounded-lg`
                                    //                     }
                                    //                 >
                                    //                     <div className="w-[200px] flex flex-col gap-1">
                                    //                         {editingSessionId === session.id ? (
                                    //                             <input
                                    //                                 type="text"
                                    //                                 value={newTitle}
                                    //                                 onChange={(e) => setNewTitle(e.target.value)}
                                    //                                 onBlur={() => updateSessionTitle(session.id, newTitle)}
                                    //                                 className="text-white truncate text-sm bg-transparent border-2 border-gray-500 rounded-lg p-1"
                                    //                             />
                                    //                         ) : (
                                    //                             <>
                                    //                                 <div className="text-white truncate text-sm">{extractTitleFromMd(session.title) || "Untitled Chat"}</div>
                                    //                                 <div className="text-[12px] text-[#3E3E40]">{moment(Number(session.chats[session.chats.length - 1].timestamp)).format("Do MMM YY HH:mm:ss")}</div>
                                    //                             </>
                                    //                         )}
                                    //                     </div>
                                    //                     <div className="absolute right-2 top-1/2 -translate-y-1/2 pl-2 hidden group-hover:flex items-center rounded-r-lg gap-1">
                                    //                         {
                                    //                             editingSessionId !== session.id ? (
                                    //                                 <>
                                    //                                     <button className="bg-transparent p-1 border-none" onClick={(e) => {
                                    //                                         e.stopPropagation();
                                    //                                         setNewTitle(extractTitleFromMd(session.title));
                                    //                                         setEditingSessionId(session.id);
                                    //                                     }}>
                                    //                                         <FiEdit size={20} />
                                    //                                     </button>
                                    //                                     <button className="bg-transparent p-1 border-none text-[#FF5050]" onClick={(e) => {
                                    //                                         e.stopPropagation();
                                    //                                         deleteSession(session.id);
                                    //                                     }}>
                                    //                                         <FiTrash2 size={20} />
                                    //                                     </button>
                                    //                                 </>
                                    //                             ) : (
                                    //                                 <>
                                    //                                     <button className="bg-inputBg p-1 border-none" onClick={(e) => {
                                    //                                         e.stopPropagation();
                                    //                                         updateSessionTitle(session.id, newTitle);
                                    //                                     }}>
                                    //                                         <FiCheck size={20} />
                                    //                                     </button>
                                    //                                     <button className="bg-inputBg p-1 border-none" onClick={(e) => {
                                    //                                         e.stopPropagation();
                                    //                                         setEditingSessionId(null);
                                    //                                     }}>
                                    //                                         <FiX size={20} />
                                    //                                     </button>
                                    //                                 </>
                                    //                             )
                                    //                         }
                                    //                     </div>
                                    //                 </div>
                                    //             </div>
                                    //         ))}
                                    //     </div>
                                    // ))
                                    chatHistory
                                        .sort((a, b) =>
                                            Number(b.chats[b.chats.length - 1].timestamp) - Number(a.chats[a.chats.length - 1].timestamp)
                                        )
                                        .filter((session) => search === "" ? true : session.title.toLowerCase().includes(search.toLowerCase()))
                                        .map((session: ChatHistoryType) => (
                                            <div
                                                key={session.id}
                                                className={`${session.id === sessionId ?
                                                    "text-mainFont p-[1px] bg-btn-shadow" :
                                                    "cursor-pointer"} 
                                                    rounded-lg hover:text-mainFont focus:text-mainFont p-[1px] hover:bg-btn-shadow focus:bg-btn-shadow cursor-pointer mb-[2px]`
                                                }
                                            >
                                                <div
                                                    key={session.id}
                                                    onClick={() => {
                                                        if (!editingSessionId) {
                                                            setSessionId(session.id);
                                                            setIsSidebarVisible(false);
                                                            setFiles([]);
                                                            router.push("/echat");   
                                                        }
                                                    }}
                                                    className={
                                                        `${session.id === sessionId ?
                                                            "bg-[#29292980] text-mainFont" :
                                                            "text-subButtonFont"} 
                                                    flex items-center justify-start group transition-colors duration-200 px-2 py-2 relative rounded-lg gap-2`
                                                    }
                                                >
                                                    <div className="w-[200px] flex flex-col gap-1">
                                                        {editingSessionId === session.id ? (
                                                            <input
                                                                type="text"
                                                                value={newTitle}
                                                                onChange={(e) => setNewTitle(e.target.value)}
                                                                onBlur={() => updateSessionTitle(session.id, newTitle)}
                                                                className="text-white truncate text-sm bg-transparent border-2 border-gray-500 rounded-lg p-1"
                                                            />
                                                        ) : (
                                                            <>
                                                                <div className="text-white truncate text-sm">{extractTitleFromMd(session.title) || "Untitled Chat"}</div>
                                                                <div className="text-[12px] text-[#3E3E40]">{moment(Number(session.chats[session.chats.length - 1].timestamp)).format("Do MMM YY HH:mm:ss")}</div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {
                                                        !session.loading && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pl-2 hidden group-hover:flex items-center rounded-r-lg gap-1">
                                                                {
                                                                    editingSessionId !== session.id ? (
                                                                        <>
                                                                            <button className="bg-transparent p-1 border-none" onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setNewTitle(extractTitleFromMd(session.title));
                                                                                setEditingSessionId(session.id);
                                                                            }}>
                                                                                <Edit size={20} />
                                                                            </button>
                                                                            <button className="bg-transparent p-1 border-none text-[#FF5050]" onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                deleteSession(session.id);
                                                                            }}>
                                                                                <Trash2 size={20} />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button className="bg-inputBg p-1 border-none" onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                updateSessionTitle(session.id, newTitle);
                                                                            }}>
                                                                                <Check size={20} />
                                                                            </button>
                                                                            <button className="bg-inputBg p-1 border-none" onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingSessionId(null);
                                                                            }}>
                                                                                <X size={20} />
                                                                            </button>
                                                                        </>
                                                                    )
                                                                }
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                            <div className="sm:hidden w-full">
                                <div className="w-full px-2">
                                    <CustomDivider />
                                </div>
                                <div className="mt-4 w-full px-2 flex flex-col gap-3">
                                    <div className="text-white text-sm">Point usage</div>
                                </div>
                                <div className="w-full px-2 mt-4">
                                    <div className="w-full bg-[#FFFFFF26] rounded-full py-1 relative">
                                        <div style={{ width: `${percent.toFixed(0)}%` }} className="bg-mainFont rounded-full h-full absolute top-0 left-0"></div>
                                    </div>
                                </div>
                                <div className="mt-4 w-full px-2 flex justify-between text-white text-sm">
                                    <div>
                                        {formatNumber(user?.pointsUsed ?? 0)} /
                                        <span className="text-[#FFFFFF99]">
                                            {formatNumber(Number(user?.currentplan.points) + Number(user?.currentplan.bonusPoints))}
                                        </span>
                                    </div>
                                    <div className="text-[#FFFFFF99]">
                                        Resets on {user?.pointsResetDate ? format(user?.pointsResetDate, 'MMM d, yyyy') : 'N/A'}
                                    </div>
                                </div>
                                <div className="w-full px-2 mt-8 flex justify-between gap-2">
                                    <ShadowBtn
                                        className="w-full mb-7 bg-radial-white"
                                        mainClassName="py-2 md:py-3 px-[10px] text-black text-sm text-center bg-white"
                                        onClick={() => {
                                            router.push('/subscription')
                                            setIsSidebarVisible(false);
                                        }}
                                    >
                                        Upgrade Plan
                                    </ShadowBtn>
                                    <ShadowBtn
                                        className="w-full mb-7"
                                        mainClassName="py-2 md:py-3 px-[10px] text-white text-sm text-center"
                                        onClick={() => {
                                            router.push("/echat/setting");
                                            setIsSidebarVisible(false);
                                        }}
                                    >
                                        Settings
                                    </ShadowBtn>
                                </div>
                            </div>
                        </>
                    )
                }
            </div>
        </>
    )
}


export default ChatHistory;