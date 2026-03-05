import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/getEffectiveUserId";

/** GET /api/sharing/owner-info — returns the effective owner's email for the banner */
export async function GET(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const effectiveUserId = await getEffectiveUserId(req, user.id);
    const owner = await prisma.user.findUnique({ where: { id: effectiveUserId }, select: { email: true } });

    return NextResponse.json({ email: owner?.email ?? null });
}
