// Formatting utilities for currency, percent, dates

export function formatCurrency(value: number | string | null | undefined): string {
    const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
    if (isNaN(n)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

export function formatPercent(value: number, includeSign = true): string {
    const pct = value * 100;
    const sign = includeSign && pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
}

export function formatMonthYear(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatShortDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function firstOfMonth(year: number, month: number): Date {
    return new Date(Date.UTC(year, month, 1));
}

export function currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyFromDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function daysLeftInMonth(): number {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
}

export function valueColor(value: number): string {
    if (value > 0) return "text-emerald-400";
    if (value < 0) return "text-red-400";
    return "text-slate-400";
}
