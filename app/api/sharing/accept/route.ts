import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/sharing/accept?token=xxx — invitee accepts the invite */
export async function GET(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
        // Redirect to sign-in preserving the token
        const url = new URL(req.url);
        return NextResponse.redirect(new URL(`/sign-in?redirect_url=${encodeURIComponent(url.pathname + url.search)}`, url.origin));
    }

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    // Find the share
    const share = await prisma.sharedAccess.findUnique({ where: { token } });
    if (!share) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    if (share.status === "REVOKED") return NextResponse.json({ error: "This invite has been revoked" }, { status: 410 });

    // Get or create the invitee's User record
    let invitee = await prisma.user.findUnique({ where: { clerkId } });
    let callerEmail = invitee?.email ?? "";

    if (!invitee) {
        // Auto-create user record for first-time sign-in via invite
        const clerkUser = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
            headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
        }).then((r) => r.json());
        callerEmail = clerkUser.email_addresses?.[0]?.email_address ?? "";
        invitee = await prisma.user.create({ data: { clerkId, email: callerEmail } });
    }

    // Validate: the signed-in email must match the invited email
    if (callerEmail.toLowerCase() !== share.inviteeEmail.toLowerCase()) {
        return NextResponse.json({
            error: "This invite link is not assigned to your email address. Please sign in with the correct account.",
        }, { status: 403 });
    }

    // Prevent owner from accepting their own invite
    if (invitee.id === share.ownerUserId) {
        return NextResponse.json({ error: "You cannot accept your own invite" }, { status: 400 });
    }

    await prisma.sharedAccess.update({
        where: { token },
        data: { inviteeUserId: invitee.id, status: "ACCEPTED" },
    });

    // Return the ownerUserId so the frontend can store it as the viewAs context
    return NextResponse.json({ ok: true, ownerUserId: share.ownerUserId });
}
