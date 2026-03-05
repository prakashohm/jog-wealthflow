import { prisma } from "@/lib/prisma";

/**
 * Resolves which user's data to read/write for a given request.
 *
 * If the request carries a `x-view-as` header containing an ownerUserId AND
 * the caller has an ACCEPTED SharedAccess grant for that owner, returns the
 * ownerUserId so the caller sees the owner's data.
 *
 * Otherwise (no header, no valid grant) returns the caller's own userId.
 *
 * @param req            - The incoming NextRequest/Request
 * @param callerUserId   - The internal User.id of the authenticated caller
 */
export async function getEffectiveUserId(
    req: Request,
    callerUserId: string
): Promise<string> {
    const viewAs = req.headers.get("x-view-as");
    if (!viewAs) return callerUserId;

    // Verify the caller has an accepted share for this owner
    const share = await prisma.sharedAccess.findFirst({
        where: {
            ownerUserId: viewAs,
            inviteeUserId: callerUserId,
            status: "ACCEPTED",
        },
    });

    return share ? viewAs : callerUserId;
}
