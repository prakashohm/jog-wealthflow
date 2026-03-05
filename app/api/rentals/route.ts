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

    const properties = await prisma.rentalProperty.findMany({
        where: { userId: effectiveUserId, isActive: true },
    });

    return NextResponse.json(properties);
}

export async function POST(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const effectiveUserId = await getEffectiveUserId(req, user.id);

    const body = await req.json();
    const property = await prisma.rentalProperty.create({
        data: {
            userId: effectiveUserId,
            ...body,
        },
    });

    return NextResponse.json(property);
}

export async function PATCH(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;

    const property = await prisma.rentalProperty.update({
        where: { id },
        data: updates,
    });

    return NextResponse.json(property);
}

export async function DELETE(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await prisma.rentalProperty.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
}
