import { Dispatch, SetStateAction } from "react";

export interface LoginProps {
    email: string;
    password: string;
}

export interface RegisterProps {
    name: string;
    email: string;
}

export interface IUser {
    email: string;
    password?: string;
    inviteCode: string;
    referralCode?: string;
    numsOfUsedInviteCode: number;
    loginType: string;
    twitterId?: string;
    thumbnail?: string;
    name?: string;
    avatar?: string;
    api?: string;
    verify: boolean;
    lastLogin?: Date;
    lastActiveSession?: Date;
    logins: number;
    wallet: string;
    chatPoints: number;
    workerPoints: number;
    role: string;
    isNodeAdded?: boolean;
    nodeConnectedTime?: Date;
    nodeRewardHash?: string;
    pointsUsed: number;
    pointsResetDate: Date;
    currentplan?: string;
    requestPlanId?: string;
    disableModel?: string[];
    paymentMethod?: object;
}

export interface ChatHistory {
    id: string;
    title: string;
    chats: ChatLog[];
    loading?: boolean;
}

export interface ChatLog {
    prompt: string;
    response: string | null;
    timestamp: string | null;
    inputToken?: number;
    outputToken?: number;
    outputTime?: number;
    totalTime?: number;
    chatType: number;
    fileUrls: string[];
    model: string;
    points: number;
}

export interface IResearchLog {
    title: string;
    researchSteps: IResearchStep[];
    sources: ISource[];
    learnings: string[];
}

export interface IResearchStep {
    type: number;
    researchStep: string;
}

export interface ISource {
    url: string;
    content?: string;
    image: string;
    title: string;
}

export interface IFileWithUrl {
    file: File;
    url: string;
}

export interface IAI {
    _id: string;
    name: string;
    inputCost: number;
    outputCost: number;
    multiplier: number;
    provider: string;
    model: string;
    type: string;
    iconType: string;
    imageSupport: boolean;
}

export interface AuthContextType {
    verifyCode: string | null;
    setVerifyCode: (code: string | null) => void;
    user: User | null;
    setUser: Dispatch<SetStateAction<User | null>>;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    requestPlanId: string | null;
    setRequestPlanId: (requestPlanId: string | null) => void;
}

export interface User {
    name: string;
    avatar: string;
    email?: string;
    inviteCode?: string;
    twitterId?: string;
    wallet?: string;
    chatPoints?: number;
    workerPoints?: number;
    nodeConnectedTime?: Date;
    nodeRewardHash?: string;
    isNodeAdded?: boolean;
    currentplan: ISubscriptionPlan;
    requestPlanId?: string;
    planStartDate?: Date;
    planEndDate?: Date;
    pointsResetDate?: Date;
    pointsUsed?: number;
    paymentMethod?: object;
}

export interface ISubscriptionPlan {
    _id: string;
    name: string;
    type: string;
    price: number;
    description: string;
    features: string[];
    isYearlyPlan: boolean;
    priceId: string;
    productId: string;
    points: number;
    bonusPoints: number;
    activeModels: string[];
}

export interface IChatCompletionChoice {
    message?: { content?: string | null };
    usage?: { prompt_tokens: number, completion_tokens: number, total_tokens: number };
}

export interface IChangeLog {
    _id: string;
    title: string;
    article: string;
    category: string;
    createdAt: Date;
}

export interface IBillingHistory {
    _id: string;
    plan: string;
    price: number;
    status: string;
    createdAt: Date;
    invoicePdfUrl: string;
    type: string;
}