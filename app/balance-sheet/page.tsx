"use client";
import { useEffect, useState, useCallback } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatCurrency, formatPercent, formatMonthYear } from "@/lib/formatters";
import { computeNetWorth, computeGrowthRate, computeRollingAverage } from "@/lib/calculations";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { sharedHeaders } from "@/components/SharedContext";

interface Account {
    id: string;
    nickname: string;
    type: string;
}

interface BalanceEntry {
    accountId: string;
    value: number;
    month: string;
    account: Account;
}

const ASSET_TYPES = ["PRIMARY_CHECKING", "OTHER_CHECKING", "SAVINGS", "RETIREMENT_PRETAX", "RETIREMENT_AFTERTAX", "INVESTMENT", "REAL_ESTATE", "OTHER_ASSET"];
const LIABILITY_TYPES = ["MORTGAGE", "CAR_LOAN", "CREDIT_CARD", "OTHER_LIABILITY"];

const TYPE_LABELS: Record<string, string> = {
    PRIMARY_CHECKING: "Primary Checking",
    OTHER_CHECKING: "Other Checking",
    SAVINGS: "Savings",
    RETIREMENT_PRETAX: "401K",
    RETIREMENT_AFTERTAX: "Roth IRA",
    INVESTMENT: "Investment",
    REAL_ESTATE: "Real Estate",
    OTHER_ASSET: "Other Asset",
    MORTGAGE: "Mortgage",
    CAR_LOAN: "Car Loan",
    CREDIT_CARD: "Credit Card",
    OTHER_LIABILITY: "Other Liability",
};

function TrendCard({ label, value, growth, rollingAvg }: { label: string; value: number; growth: number; rollingAvg: number }) {
    return (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
            <p className="text-white text-xl font-bold mt-1">{formatCurrency(value)}</p>
            <div className="flex gap-3 mt-2">
                <span className={`text-xs font-medium ${growth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {growth >= 0 ? "+" : ""}{formatCurrency(growth)} MoM
                </span>
                <span className="text-slate-500 text-xs">3-mo avg: {formatCurrency(rollingAvg)}</span>
            </div>
        </div>
    );
}

export default function BalanceSheetPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [allEntries, setAllEntries] = useState<BalanceEntry[]>([]);
    const [balances, setBalances] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [carriedOver, setCarriedOver] = useState(false);

    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [mode, setMode] = useState<"entry" | "history">("entry");
    const [balanceFilter, setBalanceFilter] = useState("all");

    const BALANCE_FILTERS = [
        { label: "All", value: "all", types: [] as string[] },
        { label: "Checking", value: "checking", types: ["PRIMARY_CHECKING", "OTHER_CHECKING"] },
        { label: "Savings", value: "savings", types: ["SAVINGS"] },
        { label: "Retirement", value: "retirement", types: ["RETIREMENT_PRETAX", "RETIREMENT_AFTERTAX"] },
        { label: "Investments", value: "investments", types: ["INVESTMENT", "REAL_ESTATE", "OTHER_ASSET"] },
        { label: "Liabilities", value: "liabilities", types: ["MORTGAGE", "CAR_LOAN", "CREDIT_CARD", "OTHER_LIABILITY"] },
    ];

    function matchesFilter(type: string) {
        if (balanceFilter === "all") return true;
        const group = BALANCE_FILTERS.find(f => f.value === balanceFilter);
        return group ? group.types.includes(type) : true;
    }

    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    const isFutureMonth = viewYear > now.getFullYear() ||
        (viewYear === now.getFullYear() && viewMonth > now.getMonth());

    const fetchData = useCallback(async () => {
        const hdrs = sharedHeaders();
        const [accRes, entRes] = await Promise.all([
            fetch("/api/accounts", { headers: hdrs }),
            fetch("/api/balance-sheet", { headers: hdrs }),
        ]);
        const accs = await accRes.json();
        const ents = await entRes.json();
        setAccounts(Array.isArray(accs) ? accs : []);
        setAllEntries(Array.isArray(ents) ? ents : []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Re-populate balances form whenever the viewed month or entries change
    useEffect(() => {
        if (!accounts.length) return;
        const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
        const hasThisMonth = allEntries.some(e => e.month.substring(0, 7) === key);
        const prefill: Record<string, string> = {};

        for (const acc of accounts) {
            // Look for an entry saved for this exact month
            const thisMonthEntry = allEntries.find(
                (e: BalanceEntry) => e.accountId === acc.id && e.month.startsWith(key)
            );
            if (thisMonthEntry) {
                prefill[acc.id] = String(thisMonthEntry.value);
            } else {
                // Fall back to the most recent prior entry for this account
                const priorEntry = allEntries
                    .filter(e => e.accountId === acc.id && e.month.substring(0, 7) < key)
                    .sort((a, b) => b.month.localeCompare(a.month))[0];
                prefill[acc.id] = priorEntry ? String(priorEntry.value) : "";
            }
        }
        setBalances(prefill);
        // Show carry-over banner only when there are no saved entries for this month
        // but we do have some prior data to carry forward
        const hasPriorData = allEntries.some(e => e.month.substring(0, 7) < key);
        setCarriedOver(!hasThisMonth && hasPriorData);
    }, [viewYear, viewMonth, allEntries, accounts]);

    const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

    async function handleSave() {
        setSaving(true);
        const entries = Object.entries(balances)
            .filter(([, v]) => v !== "")
            .map(([accountId, value]) => ({ accountId, value: parseFloat(value) }));

        await fetch("/api/balance-sheet", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...sharedHeaders() },
            body: JSON.stringify({ month: monthKey, entries }),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        await fetchData();
    }

    const viewMonthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

    const historyEntries = allEntries.filter((e: BalanceEntry) =>
        e.month.startsWith(viewMonthKey)
    );

    // Compute net worth over time for trend cards
    function getMonthlyValue(type: "assets" | "liabilities" | "liquid" | "retirement", monthOffset: number) {
        const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const targetKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const entries = allEntries.filter((e: BalanceEntry) => e.month.startsWith(targetKey));
        if (type === "liquid") return entries.filter((e) => e.account?.type === "SAVINGS").reduce((a, e) => a + Number(e.value), 0);
        if (type === "retirement") return entries.filter((e) => ["RETIREMENT_PRETAX", "RETIREMENT_AFTERTAX"].includes(e.account?.type)).reduce((a, e) => a + Number(e.value), 0);
        if (type === "assets") return entries.filter((e) => ASSET_TYPES.includes(e.account?.type)).reduce((a, e) => a + Number(e.value), 0);
        return entries.filter((e) => LIABILITY_TYPES.includes(e.account?.type)).reduce((a, e) => a + Number(e.value), 0);
    }

    const currentAssets = getMonthlyValue("assets", 0);
    const prevAssets = getMonthlyValue("assets", 1);
    const currentLiab = getMonthlyValue("liabilities", 0);
    const prevLiab = getMonthlyValue("liabilities", 1);
    const currentNW = computeNetWorth(currentAssets, currentLiab);
    const prevNW = computeNetWorth(prevAssets, prevLiab);

    const currentLiquid = getMonthlyValue("liquid", 0);
    const prevLiquid = getMonthlyValue("liquid", 1);
    const currentRetirement = getMonthlyValue("retirement", 0);
    const prevRetirement = getMonthlyValue("retirement", 1);

    const liquidAvg = computeRollingAverage([0, 1, 2].map((i) => getMonthlyValue("liquid", i)));
    const retirementAvg = computeRollingAverage([0, 1, 2].map((i) => getMonthlyValue("retirement", i)));

    const assetAccounts = accounts.filter((a) => ASSET_TYPES.includes(a.type) && matchesFilter(a.type));
    const liabilityAccounts = accounts.filter((a) => LIABILITY_TYPES.includes(a.type) && matchesFilter(a.type));

    const entryAssets = historyEntries.filter((e) => ASSET_TYPES.includes(e.account?.type) && matchesFilter(e.account?.type));
    const entryLiabilities = historyEntries.filter((e) => LIABILITY_TYPES.includes(e.account?.type) && matchesFilter(e.account?.type));
    const entryTotalAssets = historyEntries.filter(e => ASSET_TYPES.includes(e.account?.type)).reduce((a, e) => a + Number(e.value), 0);
    const entryTotalLiab = historyEntries.filter(e => LIABILITY_TYPES.includes(e.account?.type)).reduce((a, e) => a + Number(e.value), 0);
    const entryNW = entryTotalAssets - entryTotalLiab;

    function navigateMonth(dir: number) {
        if (dir > 0 && isCurrentMonth) return; // block future
        const d = new Date(viewYear, viewMonth + dir, 1);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
    }

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
                <h1 className="text-2xl font-bold text-white">Balance Sheet</h1>

                {/* Mode toggle */}
                <div className="flex gap-2 mt-3">
                    {(["entry", "history"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${mode === m ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                        >{m === "entry" ? "Monthly Entry" : "History"}</button>
                    ))}
                </div>
            </div>

            <div className="px-4 pb-32 space-y-5">
                {/* Month navigator */}
                <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3">
                    <button onClick={() => navigateMonth(-1)} className="p-1 text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-white font-semibold">{formatMonthYear(new Date(viewYear, viewMonth, 1))}</span>
                    <button onClick={() => navigateMonth(1)} disabled={isCurrentMonth} className={`p-1 transition-colors ${isCurrentMonth ? "text-slate-700 cursor-not-allowed" : "text-slate-400 hover:text-white"}`}>
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Filter chips */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {BALANCE_FILTERS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setBalanceFilter(f.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${balanceFilter === f.value
                                ? "bg-indigo-500 text-white"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                                }`}
                        >{f.label}</button>
                    ))}
                </div>
                {mode === "entry" ? (
                    <>
                        {accounts.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-8">No accounts set up. <a href="/setup" className="text-indigo-400">Add accounts →</a></p>
                        ) : (
                            <>
                                {/* Carry-over notice */}
                                {carriedOver && (
                                    <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                                        <span className="text-base leading-none mt-0.5">📋</span>
                                        <span>Values carried from your last saved month — update anything that changed and hit <strong>Save</strong>.</span>
                                    </div>
                                )}
                                {/* Assets */}
                                <div>
                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">Assets</h2>
                                    <div className="border border-slate-700/50 rounded-2xl overflow-hidden border-l-2 border-l-emerald-500/60">
                                        {assetAccounts.map((acc, idx) => (
                                            <div key={acc.id} className={`flex items-center gap-3 px-4 py-3 ${idx % 2 === 0 ? "bg-slate-800/60" : "bg-slate-800/30"} ${idx !== assetAccounts.length - 1 ? "border-b border-slate-700/30" : ""}`}>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-medium truncate">{acc.nickname}</p>
                                                    <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-medium">{TYPE_LABELS[acc.type]}</span>
                                                </div>
                                                <div className="relative w-36 flex-shrink-0">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        value={balances[acc.id] || ""}
                                                        onChange={(e) => setBalances((p) => ({ ...p, [acc.id]: e.target.value }))}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-6 pr-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 text-right"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Liabilities */}
                                <div>
                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Liabilities</h2>
                                    <div className="border border-slate-700/50 rounded-2xl overflow-hidden border-l-2 border-l-red-500/60">
                                        {liabilityAccounts.map((acc, idx) => (
                                            <div key={acc.id} className={`flex items-center gap-3 px-4 py-3 ${idx % 2 === 0 ? "bg-slate-800/60" : "bg-slate-800/30"} ${idx !== liabilityAccounts.length - 1 ? "border-b border-slate-700/30" : ""}`}>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-medium truncate">{acc.nickname}</p>
                                                    <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 font-medium">{TYPE_LABELS[acc.type]}</span>
                                                </div>
                                                <div className="relative w-36 flex-shrink-0">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        value={balances[acc.id] || ""}
                                                        onChange={(e) => setBalances((p) => ({ ...p, [acc.id]: e.target.value }))}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-6 pr-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 text-right"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Save button */}
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${saved ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"} disabled:opacity-50`}
                                >
                                    <Save size={18} />
                                    {saving ? "Saving..." : saved ? "Saved! ✓" : `Save ${formatMonthYear(new Date(viewYear, viewMonth, 1))} Balances`}
                                </button>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {/* History view */}
                        {historyEntries.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-8">No entries for this month.</p>
                        ) : (
                            <>
                                <div>
                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">Assets</h2>
                                    <div className="border border-slate-700/50 rounded-2xl overflow-hidden border-l-2 border-l-emerald-500/60">
                                        {entryAssets.map((e, idx) => (
                                            <div key={e.accountId} className={`flex items-center justify-between px-4 py-3 ${idx % 2 === 0 ? "bg-slate-800/60" : "bg-slate-800/30"} ${idx !== entryAssets.length - 1 ? "border-b border-slate-700/30" : ""}`}>
                                                <div>
                                                    <p className="text-sm text-slate-200">{e.account?.nickname}</p>
                                                    <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-medium">{TYPE_LABELS[e.account?.type]}</span>
                                                </div>
                                                <span className="text-sm text-white font-semibold tabular-nums">{formatCurrency(e.value)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between px-4 py-3 bg-emerald-500/10 border-t border-emerald-500/20">
                                            <span className="text-sm font-semibold text-slate-300">Total Assets</span>
                                            <span className="text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(entryTotalAssets)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Liabilities</h2>
                                    <div className="border border-slate-700/50 rounded-2xl overflow-hidden border-l-2 border-l-red-500/60">
                                        {entryLiabilities.map((e, idx) => (
                                            <div key={e.accountId} className={`flex items-center justify-between px-4 py-3 ${idx % 2 === 0 ? "bg-slate-800/60" : "bg-slate-800/30"} ${idx !== entryLiabilities.length - 1 ? "border-b border-slate-700/30" : ""}`}>
                                                <div>
                                                    <p className="text-sm text-slate-200">{e.account?.nickname}</p>
                                                    <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 font-medium">{TYPE_LABELS[e.account?.type]}</span>
                                                </div>
                                                <span className="text-sm text-red-300 font-semibold tabular-nums">{formatCurrency(e.value)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between px-4 py-3 bg-red-500/10 border-t border-red-500/20">
                                            <span className="text-sm font-semibold text-slate-300">Total Liabilities</span>
                                            <span className="text-sm font-bold text-red-400 tabular-nums">{formatCurrency(entryTotalLiab)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex justify-between">
                                    <span className="text-indigo-300 font-semibold">Net Worth</span>
                                    <span className={`font-bold text-lg ${entryNW >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(entryNW)}</span>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* Trend Cards */}
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Trends</h2>
                    <div className="space-y-3">
                        <TrendCard label="Net Worth" value={currentNW} growth={currentNW - prevNW} rollingAvg={computeRollingAverage([0, 1, 2].map((i) => computeNetWorth(getMonthlyValue("assets", i), getMonthlyValue("liabilities", i))))} />
                        <TrendCard label="Liquid Savings" value={currentLiquid} growth={currentLiquid - prevLiquid} rollingAvg={liquidAvg} />
                        <TrendCard label="Retirement" value={currentRetirement} growth={currentRetirement - prevRetirement} rollingAvg={retirementAvg} />
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
