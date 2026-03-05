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

    const accounts = await prisma.account.findMany({
        where: { userId: effectiveUserId, isActive: true },
        orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(accounts);
}

export async function POST(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const effectiveUserId = await getEffectiveUserId(req, user.id);

    const body = await req.json();

    if (Array.isArray(body.accounts)) {
        const incoming: { nickname: string; type: string; sortOrder?: number }[] = body.accounts;

        // Fetch existing active accounts for this user
        const existing: { id: string; nickname: string; type: string }[] = await prisma.account.findMany({ where: { userId: effectiveUserId, isActive: true } });

        // Upsert each incoming account by nickname+type (preserves IDs → no orphaned balance entries)
        for (const acc of incoming) {
            const match = existing.find((e: { id: string; nickname: string; type: string }) => e.nickname === acc.nickname && e.type === acc.type);
            if (match) {
                await prisma.account.update({
                    where: { id: match.id },
                    data: { sortOrder: acc.sortOrder || 0, isActive: true },
                });
            } else {
                await prisma.account.create({
                    data: { userId: effectiveUserId, nickname: acc.nickname, type: acc.type as never, sortOrder: acc.sortOrder || 0 },
                });
            }
        }

        // Archive accounts that were removed from the list
        const incomingKeys = new Set(incoming.map((a) => `${a.nickname}||${a.type}`));
        const toArchive = existing.filter((e: { id: string; nickname: string; type: string }) => !incomingKeys.has(`${e.nickname}||${e.type}`));
        if (toArchive.length > 0) {
            await prisma.account.updateMany({
                where: { id: { in: toArchive.map((e: { id: string }) => e.id) } },
                data: { isActive: false },
            });
        }

        return NextResponse.json({ ok: true });
    }

    const account = await prisma.account.create({
        data: {
            userId: effectiveUserId,
            nickname: body.nickname,
            type: body.type,
            sortOrder: body.sortOrder || 0,
        },
    });
    return NextResponse.json(account);
}

export async function PATCH(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;

    const account = await prisma.account.update({
        where: { id },
        data: updates,
    });

    return NextResponse.json(account);
}
