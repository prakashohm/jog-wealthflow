import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/getEffectiveUserId";

export async function GET(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json([]);

    const effectiveUserId = await getEffectiveUserId(req, user.id);

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "2026-02"

    const where: Record<string, unknown> = { userId: effectiveUserId };
    if (month) {
        const [year, m] = month.split("-").map(Number);
        const start = new Date(Date.UTC(year, m - 1, 1));
        const end = new Date(Date.UTC(year, m, 1));
        where.month = { gte: start, lt: end };
    }

    const entries = await prisma.balanceSheetEntry.findMany({
        where,
        include: { account: true },
        orderBy: { month: "desc" },
    });

    return NextResponse.json(entries);
}

export async function POST(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const effectiveUserId = await getEffectiveUserId(req, user.id);

    const body = await req.json();
    // body.entries = [ { accountId, value, month } ]
    const { entries, month } = body;

    const [year, m] = month.split("-").map(Number);
    const monthDate = new Date(Date.UTC(year, m - 1, 1));

    const results = await Promise.all(
        entries.map(({ accountId, value }: { accountId: string; value: number }) =>
            prisma.balanceSheetEntry.upsert({
                where: { userId_month_accountId: { userId: effectiveUserId, month: monthDate, accountId } },
                create: { userId: effectiveUserId, month: monthDate, accountId, value },
                update: { value },
            })
        )
    );

    return NextResponse.json(results);
}
