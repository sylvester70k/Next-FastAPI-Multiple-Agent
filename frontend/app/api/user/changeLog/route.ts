import { ChangeLogRepo } from "@/lib/database/changeLogRepo";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const logs = await ChangeLogRepo.findAll();
        return NextResponse.json({ data: logs, message: "Change Log Fetched", status: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Change Log Fetch Failed", status: false });
    }
}