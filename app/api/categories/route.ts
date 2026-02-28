import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json([]);

    const categories = await prisma.budgetCategory.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(categories);
}

export async function POST(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const incoming: { name: string; type: string; budgetAmount: number; sortOrder: number }[] = body.categories;

    // Fetch existing active categories for this user
    const existing: { id: string; name: string; type: string }[] = await prisma.budgetCategory.findMany({ where: { userId: user.id, isActive: true } });

    // Upsert each incoming category by name+type (preserves IDs → no orphaned expenses)
    for (const cat of incoming) {
        const match = existing.find((e: { id: string; name: string; type: string }) => e.name === cat.name && e.type === cat.type);
        if (match) {
            await prisma.budgetCategory.update({
                where: { id: match.id },
                data: { budgetAmount: cat.budgetAmount, sortOrder: cat.sortOrder || 0, isActive: true },
            });
        } else {
            await prisma.budgetCategory.create({
                data: { userId: user.id, name: cat.name, type: cat.type, budgetAmount: cat.budgetAmount, sortOrder: cat.sortOrder || 0 },
            });
        }
    }

    // Archive categories that were removed from the list
    const incomingKeys = new Set(incoming.map((c) => `${c.name}||${c.type}`));
    const toArchive = existing.filter((e: { id: string; name: string; type: string }) => !incomingKeys.has(`${e.name}||${e.type}`));
    if (toArchive.length > 0) {
        await prisma.budgetCategory.updateMany({
            where: { id: { in: toArchive.map((e: { id: string }) => e.id) } },
            data: { isActive: false },
        });
    }

    return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;

    const category = await prisma.budgetCategory.update({
        where: { id },
        data: updates,
    });

    return NextResponse.json(category);
}
