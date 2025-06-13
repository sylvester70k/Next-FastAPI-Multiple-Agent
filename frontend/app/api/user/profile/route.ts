import { NextRequest } from "next/server";
import { authOptions, getChatPoints } from "@/lib/api/helper";
import { getServerSession, AuthOptions } from "next-auth";
import { UserRepo } from "@/lib/database/userrepo";
import { ChatRepo } from "@/lib/database/chatrepo";

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
    const { name, avatar, workerPoints, isNodeConnected, isNodeAdded } = await request.json();
    const session = await getServerSession(authOptions as AuthOptions);

    const user = await UserRepo.findByEmail(session?.user?.email as string);
    if (!user) {
        return Response.json({ success: false, message: "User not found" });
    }

    try {
        user.name = name;
        user.avatar = avatar;

        if (workerPoints) {
            user.workerPoints = workerPoints;
        }

        if (isNodeConnected) {
            user.isNodeConnected = isNodeConnected;
        }

        if (isNodeAdded) {
            user.isNodeAdded = isNodeAdded;
        }

        // const isExist = await UserRepo.findByWalletWithoutUser(wallet, session?.user?.email as string);
        // if (isExist && user.wallet !== wallet) {
        //     return Response.json({ success: false, message: "Wallet already exists" });
        // }
        // user.wallet = wallet;
        const chatHistory = await ChatRepo.findHistoryByEmail(user.email);
        if (chatHistory) {
            user.chatPoints = getChatPoints(chatHistory.session);
        }
        await UserRepo.updateUserProfileWithEmail(user.email, user.name, user.avatar, user.wallet, user.chatPoints ?? 0, user.workerPoints ?? 0, user.isNodeConnected, user.isNodeAdded, user.paymentMethod);
        return Response.json({ success: true, message: "User updated", user: user });
    } catch (error) {   
        console.error(error);
        return Response.json({ success: false, message: "User update failed" });
    }
}

export async function GET() {
    const session = await getServerSession(authOptions as AuthOptions);
    if (!session?.user?.email) {
        return Response.json({ success: false, message: "User not found" });
    }
    try {
        const user = await UserRepo.findByEmail(session?.user?.email as string);
        if (!user) {
            return Response.json({ success: false, message: "User not found" });
        }
        const chatHistory = await ChatRepo.findHistoryByEmail(user.email);
        if (chatHistory) {
            user.chatPoints = getChatPoints(chatHistory.session);
        }
        await UserRepo.updateUserProfileWithEmail(user.email, user.name, user.avatar, user.wallet, user.chatPoints ?? 0, user.workerPoints ?? 0, user.isNodeConnected ?? false, user.isNodeAdded ?? false, user.paymentMethod);
        return Response.json({ success: true, user: user });
    } catch (error) {
        console.error(error);
        return Response.json({ success: false, message: "User fetch failed" });
    }
}
