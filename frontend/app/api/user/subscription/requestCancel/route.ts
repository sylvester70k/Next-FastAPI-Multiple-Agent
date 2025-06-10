import { NextResponse } from "next/server";
import { authOptions } from "@/lib/api/helper"; 
import { getServerSession, NextAuthOptions } from "next-auth";
import { UserRepo } from "@/lib/database/userrepo";

export async function GET() {
    const session = await getServerSession(authOptions as NextAuthOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await UserRepo.findByEmail(session.user?.email || '');
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    user.requestPlanId = null;
    await user.save();

    return NextResponse.json({ success: true, user }, { status: 200 });
}

