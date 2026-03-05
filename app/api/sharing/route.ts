import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/sharing — list all invites created by the owner */
export async function GET() {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const shares = await prisma.sharedAccess.findMany({
        where: { ownerUserId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            token: true,
            inviteeEmail: true,
            status: true,
            createdAt: true,
        },
    });

    return NextResponse.json(shares);
}

/** POST /api/sharing — create a new invite */
export async function POST(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Prevent duplicate active invites for the same email
    const existing = await prisma.sharedAccess.findFirst({
        where: { ownerUserId: user.id, inviteeEmail: email, status: { in: ["PENDING", "ACCEPTED"] } },
    });
    if (existing) {
        return NextResponse.json({ error: "An active invite already exists for this email" }, { status: 409 });
    }

    const share = await prisma.sharedAccess.create({
        data: { ownerUserId: user.id, inviteeEmail: email },
    });

    return NextResponse.json({ id: share.id, token: share.token, inviteeEmail: share.inviteeEmail, status: share.status });
}
