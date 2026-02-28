import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { date, vendor, amount, categoryId, notes } = body;

    const expense = await prisma.expense.update({
        where: { id },
        data: {
            ...(date && { date: new Date(date) }),
            ...(vendor && { vendor }),
            ...(amount !== undefined && { amount }),
            ...(categoryId && { categoryId }),
            ...(notes !== undefined && { notes }),
        },
        include: { category: true },
    });

    return NextResponse.json(expense);
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
