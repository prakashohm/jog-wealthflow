// Pure calculation functions for financial data

export function computeNetWorth(totalAssets: number, totalLiabilities: number): number {
    return totalAssets - totalLiabilities;
}

export function computeGrowthRate(current: number, previous: number): number {
    if (previous === 0) return 0;
    return (current - previous) / previous;
}

export function computeRollingAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const slice = values.slice(-3);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function computeBudgetRemaining(budget: number, spent: number): number {
    return budget - spent;
}

export function computeRentalNetBalance(
    monthlyRent: number,
    principalInterest: number,
    escrow: number,
    maintenancePct: number
): number {
    const totalMortgage = principalInterest + escrow;
    return monthlyRent - totalMortgage - monthlyRent * maintenancePct;
}

export function computeGuiltFreeBudget(
    netMonthlySalary: number,
    avgExtraIncome: number,
    totalFixedCosts: number
): number {
    return netMonthlySalary + avgExtraIncome - totalFixedCosts;
}

export function computeTotalNetIncome(
    netSalary: number,
    rentalIncome: number,
    otherIncome: number
): number {
    return netSalary + rentalIncome + otherIncome;
}

export function computeCAGR(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || years <= 0) return 0;
    return Math.pow(endValue / startValue, 1 / years) - 1;
}

export function groupExpensesByMonth<T extends { date: string | Date }>(
    expenses: T[]
): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const exp of expenses) {
        const d = new Date(exp.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(exp);
    }
    return map;
}

export function sumExpensesForMonth(
    expenses: { amount: number; date: string | Date }[],
    year: number,
    month: number // 0-indexed
): number {
    return expenses
        .filter((e) => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((acc, e) => acc + e.amount, 0);
}

export function sumExpensesForYear(
    expenses: { amount: number; date: string | Date }[],
    year: number
): number {
    return expenses
        .filter((e) => new Date(e.date).getFullYear() === year)
        .reduce((acc, e) => acc + e.amount, 0);
}
