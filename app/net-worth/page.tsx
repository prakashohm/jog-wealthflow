"use client";
import { useEffect, useState, useCallback } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Legend,
} from "recharts";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatCurrency, formatMonthYear } from "@/lib/formatters";
import { computeCAGR } from "@/lib/calculations";

interface BalanceEntry {
    accountId: string;
    value: number;
    month: string;
    account: { type: string; nickname: string };
}

const ASSET_TYPES = ["PRIMARY_CHECKING", "OTHER_CHECKING", "SAVINGS", "RETIREMENT_PRETAX", "RETIREMENT_AFTERTAX", "INVESTMENT", "REAL_ESTATE", "OTHER_ASSET"];
const LIABILITY_TYPES = ["MORTGAGE", "CAR_LOAN", "CREDIT_CARD", "OTHER_LIABILITY"];

export default function NetWorthPage() {
    const [entries, setEntries] = useState<BalanceEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const res = await fetch("/api/balance-sheet");
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Group entries by month
    const monthMap = new Map<string, { assets: number; liabilities: number; label: string }>();
    for (const e of entries) {
        const d = new Date(e.month);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap.has(key)) {
            monthMap.set(key, { assets: 0, liabilities: 0, label: formatMonthYear(d) });
        }
        const entry = monthMap.get(key)!;
        if (ASSET_TYPES.includes(e.account?.type)) {
            entry.assets += Number(e.value);
        } else if (LIABILITY_TYPES.includes(e.account?.type)) {
            entry.liabilities += Number(e.value);
        }
    }

    const chartData = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => ({
            ...v,
            netWorth: v.assets - v.liabilities,
        }));

    // Asset composition for current month
    const latestEntries = chartData.length > 0 ? entries.filter((e) => {
        const d = new Date(e.month);
        const latest = chartData[chartData.length - 1];
        return formatMonthYear(d) === latest.label;
    }) : [];

    const assetComposition = [
        { name: "Checking", value: latestEntries.filter((e) => ["PRIMARY_CHECKING", "OTHER_CHECKING"].includes(e.account?.type)).reduce((a, e) => a + Number(e.value), 0) },
        { name: "Savings", value: latestEntries.filter((e) => e.account?.type === "SAVINGS").reduce((a, e) => a + Number(e.value), 0) },
        { name: "Retirement", value: latestEntries.filter((e) => ["RETIREMENT_PRETAX", "RETIREMENT_AFTERTAX"].includes(e.account?.type)).reduce((a, e) => a + Number(e.value), 0) },
        { name: "Investments", value: latestEntries.filter((e) => e.account?.type === "INVESTMENT").reduce((a, e) => a + Number(e.value), 0) },
        { name: "Real Estate", value: latestEntries.filter((e) => e.account?.type === "REAL_ESTATE").reduce((a, e) => a + Number(e.value), 0) },
    ].filter((x) => x.value > 0);

    // CAGR
    const cagr = chartData.length >= 2
        ? computeCAGR(chartData[0].netWorth, chartData[chartData.length - 1].netWorth, chartData.length / 12)
        : 0;

    const currentNW = chartData.length > 0 ? chartData[chartData.length - 1].netWorth : 0;

    const tooltipStyle = {
        contentStyle: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12 },
        labelStyle: { color: "#94a3b8" },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="px-4 pt-8 pb-4">
                <h1 className="text-2xl font-bold text-white">Net Worth</h1>
                <p className="text-slate-400 text-sm mt-0.5">Historical financial growth</p>
            </div>

            <div className="px-4 pb-32 space-y-6">
                {chartData.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-12">No balance sheet data yet. <a href="/balance-sheet" className="text-indigo-400">Enter balances →</a></p>
                ) : (
                    <>
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                                <p className="text-slate-400 text-xs uppercase tracking-wide">Current Net Worth</p>
                                <p className={`text-xl font-bold mt-1 ${currentNW >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(currentNW)}</p>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                                <p className="text-slate-400 text-xs uppercase tracking-wide">CAGR</p>
                                <p className={`text-xl font-bold mt-1 ${cagr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {cagr >= 0 ? "+" : ""}{(cagr * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>

                        {/* Net Worth over time */}
                        <div>
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Net Worth Over Time</h2>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip {...tooltipStyle} formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                                        <Line dataKey="netWorth" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Assets vs Liabilities stacked area */}
                        <div>
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Assets vs. Liabilities</h2>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip {...tooltipStyle} formatter={(v: number | undefined, name: string | undefined) => [formatCurrency(v ?? 0), name === "assets" ? "Assets" : "Liabilities"]} />
                                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                                        <Area type="monotone" dataKey="assets" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Assets" />
                                        <Area type="monotone" dataKey="liabilities" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Liabilities" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Asset composition */}
                        {assetComposition.length > 0 && (
                            <div>
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Asset Composition</h2>
                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={assetComposition} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                            <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <Tooltip {...tooltipStyle} formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                                            <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
