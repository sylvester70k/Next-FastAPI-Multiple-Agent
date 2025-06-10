import Image from "next/image";
import { useRouter } from "next/navigation";
import ShadowBtn from "../echat/ShadowBtn";
import { ArrowUp } from "lucide-react";

const Dashboard = () => {
    const router = useRouter();
    
    return (
        <div className="w-screen h-screen flex flex-col">
            <div className="w-full flex justify-between items-center p-3">
                <div className="flex gap-1 items-center text-lg font-medium">
                    <Image src={"/logo.svg"} alt="" width={50} height={20} />
                    Ryxen
                </div>
                <ShadowBtn
                    className="text-lg"
                    mainClassName="py-1 px-3"
                    onClick={() => {
                        router.push("/signin");
                    }}
                >
                    SignIn
                </ShadowBtn>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-10">
                <div className="flex flex-col gap-5 items-center">
                    <div className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium tracking-tighter text-balance text-center">Ryxen, your AI Employee.</div>
                    <p className="text-base md:text-lg text-center text-muted-foreground font-medium text-balance leading-relaxed tracking-tight">Ryxen – is a generalist AI Agent that acts on your behalf.</p>
                </div>
                <div className="flex items-center w-full max-w-xl gap-2 flex-wrap justify-center">
                    <form className="w-full relative">
                        <div className="relative z-10">
                            <div 
                                className="flex items-center rounded-lg border border-border bg-sidebar backdrop-blur px-4 py-2 shadow-lg transition-all duration-200 hover:border-secondary/50 focus-within:border-secondary/50 focus-within:shadow-[0_0_15px_rgba(var(--secondary),0.3)]"
                            >
                                <input 
                                    placeholder="Ask Ryxen to..." 
                                    className="flex-1 h-12 md:h-14 rounded-full bg-transparent focus:outline-none text-[14px]" 
                                    type="text"
                                />
                                <button 
                                    type="button"
                                    className="cursor-pointer rounded-md w-9 h-9 flex items-center justify-center transition-all duration-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] bg-gradient-to-b from-[#DFDFDF9c] to-[#BFBFBF9c] text-[#0E0E109c]" 
                                    aria-label="Submit"
                                    onClick={() => {
                                        router.push("/signin");
                                    }}
                                >
                                    <ArrowUp />
                                </button>
                            </div>
                        </div>
                        <div className="absolute -bottom-4 inset-x-0 h-6 bg-secondary/20 blur-xl rounded-full -z-10 opacity-70"></div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Dashboard;