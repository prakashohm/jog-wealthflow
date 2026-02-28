import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getOrCreateUser(clerkId: string, email: string) {
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
        user = await prisma.user.create({ data: { clerkId, email } });
    }
    return user;
}

export async function GET() {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { clerkId },
        include: { config: { include: { fixedCosts: true } } },
    });
    if (!user) return NextResponse.json(null);

    return NextResponse.json(user.config);
}

export async function POST(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
        grossMonthlySalary,
        monthlyRetirementContrib,
        netMonthlySalary,
        avgExtraMonthlyIncome,
        setupComplete,
        fixedCosts,
        email,
    } = body;

    const user = await getOrCreateUser(clerkId, email || "");

    const config = await prisma.config.upsert({
        where: { userId: user.id },
        create: {
            userId: user.id,
            grossMonthlySalary: grossMonthlySalary || 0,
            monthlyRetirementContrib: monthlyRetirementContrib || 0,
            netMonthlySalary: netMonthlySalary || 0,
            avgExtraMonthlyIncome: avgExtraMonthlyIncome || 0,
            setupComplete: setupComplete || false,
        },
        update: {
            grossMonthlySalary: grossMonthlySalary || 0,
            monthlyRetirementContrib: monthlyRetirementContrib || 0,
            netMonthlySalary: netMonthlySalary || 0,
            avgExtraMonthlyIncome: avgExtraMonthlyIncome || 0,
            setupComplete: setupComplete !== undefined ? setupComplete : undefined,
        },
    });

    // Upsert fixed costs if provided
    if (fixedCosts && Array.isArray(fixedCosts)) {
        await prisma.fixedCost.deleteMany({ where: { configId: config.id } });
        await prisma.fixedCost.createMany({
            data: fixedCosts.map((fc: { name: string; amount: number }) => ({
                configId: config.id,
                name: fc.name,
                amount: fc.amount,
            })),
        });
    }

    return NextResponse.json(config);
}
