import { NextResponse } from "next/server";
import { PlanRepo } from "@/lib/database/planRepo";

export async function GET() {
    try {
        const plans = await PlanRepo.findAll();
        return NextResponse.json({ status: true, plans });
    } catch (error) {
        console.error("Error fetching plans:", error);
        return NextResponse.json({ status: false, error: "Failed to fetch plans" }, { status: 500 });
    }
}
