import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json([]);

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "2026-02"
    const categoryId = searchParams.get("categoryId");
    const vendor = searchParams.get("vendor");

    const where: Record<string, unknown> = { userId: user.id };

    if (month) {
        const [year, m] = month.split("-").map(Number);
        const start = new Date(year, m - 1, 1);
        const end = new Date(year, m, 1);
        where.date = { gte: start, lt: end };
    }
    if (categoryId) where.categoryId = categoryId;
    if (vendor) where.vendor = { contains: vendor, mode: "insensitive" };

    const expenses = await prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
}

export async function POST(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { date, vendor, amount, categoryId, notes } = body;

    const expense = await prisma.expense.create({
        data: {
            userId: user.id,
            date: new Date(date),
            vendor,
            amount,
            categoryId,
            notes: notes || null,
        },
        include: { category: true },
    });

    return NextResponse.json(expense);
}
