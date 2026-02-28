"use client";
import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatCurrency } from "@/lib/formatters";
import { Pencil, Trash2, Download, AlertTriangle, ChevronDown } from "lucide-react";

interface Category { id: string; name: string; type: string; budgetAmount: number; isActive: boolean; }
interface Account { id: string; nickname: string; type: string; }

export default function SettingsPage() {
    const { user } = useUser();
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [tab, setTab] = useState<"categories" | "accounts" | "data">("categories");
    const [loading, setLoading] = useState(true);
    const [resetConfirm, setResetConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);

    const fetchData = useCallback(async () => {
        const [catRes, accRes] = await Promise.all([fetch("/api/categories"), fetch("/api/accounts")]);
        const cats = await catRes.json();
        const accs = await accRes.json();
        setCategories(Array.isArray(cats) ? cats : []);
        setAccounts(Array.isArray(accs) ? accs : []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    async function archiveCategory(id: string) {
        await fetch("/api/categories", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, isActive: false }),
        });
        setCategories((p) => p.filter((c) => c.id !== id));
    }

    async function archiveAccount(id: string) {
        await fetch("/api/accounts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, isActive: false }),
        });
        setAccounts((p) => p.filter((a) => a.id !== id));
    }

    async function handleMasterReset() {
        if (!resetConfirm) {
            setResetConfirm(true);
            return;
        }
        setResetting(true);
        try {
            await fetch("/api/reset", { method: "DELETE" });
            router.push("/setup");
        } finally {
            setResetting(false);
            setResetConfirm(false);
        }
    }

    async function exportCSV() {
        const res = await fetch("/api/expenses");
        const expenses = await res.json();
        if (!Array.isArray(expenses)) return;
        const header = ["Date", "Vendor", "Amount", "Category", "Type", "Notes"];
        const rows = expenses.map((e: { date: string; vendor: string; amount: number; category?: { name: string; type: string }; notes?: string }) => [
            new Date(e.date).toISOString().split("T")[0],
            `"${e.vendor}"`,
            e.amount,
            e.category?.name || "",
            e.category?.type || "",
            `"${e.notes || ""}"`,
        ]);
        const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    }

    const TYPE_LABELS: Record<string, string> = {
        MONTHLY: "Monthly", ANNUAL: "Annual", FIXED_COST: "Fixed Cost",
        PRIMARY_CHECKING: "Primary Checking", OTHER_CHECKING: "Other Checking",
        SAVINGS: "Savings", RETIREMENT_PRETAX: "401K", RETIREMENT_AFTERTAX: "Roth IRA",
        INVESTMENT: "Investment", REAL_ESTATE: "Real Estate", OTHER_ASSET: "Other Asset",
        MORTGAGE: "Mortgage", CAR_LOAN: "Car Loan", CREDIT_CARD: "Credit Card", OTHER_LIABILITY: "Other Liability",
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="px-4 pt-8 pb-4">
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                {user && (
                    <p className="text-slate-400 text-sm mt-0.5">{user.emailAddresses[0]?.emailAddress}</p>
                )}
                <div className="flex gap-2 mt-4">
                    {(["categories", "accounts", "data"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${tab === t ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                        >{t}</button>
                    ))}
                </div>
            </div>

            <div className="px-4 pb-32 space-y-4">
                {tab === "categories" && (
                    <>
                        {["MONTHLY", "ANNUAL", "FIXED_COST"].map((type) => {
                            const cats = categories.filter((c) => c.type === type);
                            if (cats.length === 0) return null;
                            return (
                                <div key={type}>
                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{TYPE_LABELS[type]} Categories</h2>
                                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-2">
                                        {cats.map((cat) => (
                                            <div key={cat.id} className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-white font-medium">{cat.name}</p>
                                                    <p className="text-xs text-slate-500">{formatCurrency(cat.budgetAmount)} budget</p>
                                                </div>
                                                <button
                                                    onClick={() => archiveCategory(cat.id)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                                ><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        <p className="text-slate-600 text-xs text-center">To add/edit categories, complete the setup wizard again at <a href="/setup" className="text-indigo-400">/setup</a></p>
                    </>
                )}

                {tab === "accounts" && (
                    <>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-2">
                            {accounts.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-4">No accounts. <a href="/setup" className="text-indigo-400">Add via setup →</a></p>
                            ) : (
                                accounts.map((acc) => (
                                    <div key={acc.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-white font-medium">{acc.nickname}</p>
                                            <p className="text-xs text-slate-500">{TYPE_LABELS[acc.type] || acc.type}</p>
                                        </div>
                                        <button
                                            onClick={() => archiveAccount(acc.id)}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                        ><Trash2 size={14} /></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {tab === "data" && (
                    <div className="space-y-3">
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                            <h3 className="text-sm font-semibold text-white mb-1">Export Expenses</h3>
                            <p className="text-slate-400 text-xs mb-3">Download all your expenses as a CSV file.</p>
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium text-white transition-all"
                            >
                                <Download size={16} /> Download CSV
                            </button>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                            <h3 className="text-sm font-semibold text-white mb-1">Re-run Setup</h3>
                            <p className="text-slate-400 text-xs mb-3">Update your income, budgets, or add new accounts.</p>
                            <a
                                href="/setup"
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium text-white transition-all"
                            >
                                <Pencil size={16} /> Open Setup Wizard
                            </a>
                        </div>

                        {/* Master Reset — collapsible */}
                        <div className="border border-red-800/40 rounded-2xl overflow-hidden">
                            {/* Accordion header */}
                            <button
                                onClick={() => { setResetOpen((o) => !o); setResetConfirm(false); }}
                                className="w-full flex items-center justify-between px-4 py-3 bg-red-950/30 hover:bg-red-950/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={15} className="text-red-400" />
                                    <span className="text-sm font-semibold text-red-300">Master Reset</span>
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={`text-red-400 transition-transform duration-200 ${resetOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {/* Accordion body */}
                            {resetOpen && (
                                <div className="px-4 pb-4 pt-3 bg-red-950/20">
                                    <p className="text-red-400/70 text-xs mb-3">
                                        Permanently deletes ALL your data — expenses, balance sheet, rentals, accounts, categories, and config. This cannot be undone.
                                    </p>
                                    {resetConfirm && (
                                        <p className="text-red-300 text-xs font-medium mb-2 bg-red-900/30 rounded-xl px-3 py-2">
                                            ⚠ Are you sure? Click again to permanently delete everything.
                                        </p>
                                    )}
                                    <button
                                        onClick={handleMasterReset}
                                        disabled={resetting}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${resetConfirm
                                                ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                                                : "bg-red-900/50 hover:bg-red-800/60 text-red-300 border border-red-700/50"
                                            }`}
                                    >
                                        <Trash2 size={16} />
                                        {resetting ? "Resetting..." : resetConfirm ? "Yes, delete everything" : "Master Reset"}
                                    </button>
                                    {resetConfirm && !resetting && (
                                        <button
                                            onClick={() => setResetConfirm(false)}
                                            className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
