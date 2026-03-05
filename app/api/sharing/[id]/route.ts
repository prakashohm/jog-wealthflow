import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** DELETE /api/sharing/[id] — revoke or hard-delete an invite
 *  ?action=delete  → permanently removes the record
 *  (default)       → soft-revoke (status = REVOKED)
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;

    // Ensure the caller owns this share
    const share = await prisma.sharedAccess.findUnique({ where: { id } });
    if (!share || share.ownerUserId !== user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const isHardDelete = searchParams.get("action") === "delete";

    if (isHardDelete) {
        await prisma.sharedAccess.delete({ where: { id } });
    } else {
        await prisma.sharedAccess.update({
            where: { id },
            data: { status: "REVOKED" },
        });
    }

    return NextResponse.json({ ok: true });
}
