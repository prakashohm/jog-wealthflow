import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { clerkId },
        include: { config: true },
    });
    if (!user) return NextResponse.json({ ok: true });

    // Delete in dependency order (children before parents)
    await prisma.expense.deleteMany({ where: { userId: user.id } });
    await prisma.balanceSheetEntry.deleteMany({ where: { userId: user.id } });
    await prisma.rentalProperty.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.budgetCategory.deleteMany({ where: { userId: user.id } });
    if (user.config) {
        await prisma.fixedCost.deleteMany({ where: { configId: user.config.id } });
        await prisma.config.delete({ where: { id: user.config.id } });
    }

    return NextResponse.json({ ok: true });
}
