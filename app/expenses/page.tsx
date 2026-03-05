"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Search, Trash2, Pencil, X, LayoutList, Check, Upload } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatCurrency, formatShortDate, monthKeyFromDate } from "@/lib/formatters";
import { sharedHeaders } from "@/components/SharedContext";

interface Category {
    id: string;
    name: string;
    type: string;
}

interface Expense {
    id: string;
    date: string;
    vendor: string;
    amount: number;
    categoryId: string;
    category: Category;
    notes?: string;
}

export default function ExpensesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("all");
    const [vendorSuggestions, setVendorSuggestions] = useState<string[]>([]);

    // Form state
    const today = new Date().toISOString().split("T")[0];
    const [form, setForm] = useState({
        date: today,
        vendor: "",
        amount: "",
        categoryId: "",
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);

    // ── Bulk entry state ──────────────────────────────────────────
    const [showBulk, setShowBulk] = useState(false);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    type BulkRow = { date: string; vendor: string; amount: string; categoryId: string };
    const emptyRow = (): BulkRow => ({ date: today, vendor: "", amount: "", categoryId: categories[0]?.id || "" });
    const [bulkRows, setBulkRows] = useState<BulkRow[]>(() => Array.from({ length: 5 }, emptyRow));

    // keep first categoryId in new rows in sync
    const openBulk = () => {
        setBulkRows(Array.from({ length: 5 }, () => ({ date: today, vendor: "", amount: "", categoryId: categories[0]?.id || "" })));
        setShowBulk(true);
    };

    async function handleBulkSave() {
        const valid = bulkRows.filter(r => r.vendor.trim() && r.amount && r.categoryId);
        if (!valid.length) return;
        setBulkSubmitting(true);
        try {
            await Promise.all(valid.map(r =>
                fetch("/api/expenses", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...sharedHeaders() },
                    body: JSON.stringify({ ...r, amount: parseFloat(r.amount) }),
                })
            ));
            setShowBulk(false);
            await fetchAll();
        } finally {
            setBulkSubmitting(false);
        }
    }

    // ── CSV upload ─────────────────────────────────────────────────
    const csvInputRef = useRef<HTMLInputElement>(null);
    const [csvError, setCsvError] = useState<string | null>(null);

    function parseCSV(text: string): Record<string, string>[] {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) return [];
        // Rudimentary RFC-4180 field splitter (handles quoted commas)
        const splitRow = (line: string) => {
            const fields: string[] = [];
            let cur = "", inQ = false;
            for (let i = 0; i < line.length; i++) {
                if (line[i] === '"') { inQ = !inQ; }
                else if (line[i] === ',' && !inQ) { fields.push(cur.trim()); cur = ""; }
                else cur += line[i];
            }
            fields.push(cur.trim());
            return fields;
        };
        const headers = splitRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
        return lines.slice(1).map(line => {
            const vals = splitRow(line);
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = (vals[i] ?? "").replace(/^"|"$/g, "").trim(); });
            return obj;
        });
    }

    function mapCSVRows(rows: Record<string, string>[]) {
        const defaultCatId = categories[0]?.id || "";
        const pick = (obj: Record<string, string>, ...keys: string[]) => {
            for (const k of keys) if (obj[k]) return obj[k];
            return "";
        };
        const mapped = rows.map(r => {
            const rawDate = pick(r, "date", "transactiondate", "posteddate", "time", "datetime");
            // Try to parse and reformat to yyyy-mm-dd
            let date = today;
            if (rawDate) {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) date = d.toISOString().split("T")[0];
                else date = rawDate; // leave raw if unparseable
            }
            const vendor = pick(r, "description", "vendor", "merchant", "name", "payee", "memo", "narrative");
            const rawAmt = pick(r, "amount", "debit", "credit", "price", "transactionamount");
            // Strip currency symbols and take absolute value
            const amount = String(Math.abs(parseFloat(rawAmt.replace(/[$,()]/g, "")) || 0));
            return { date, vendor, amount: amount === "0" ? "" : amount, categoryId: defaultCatId };
        }).filter(r => r.vendor || r.amount); // skip totally blank rows
        return mapped;
    }

    function handleCSVFile(file: File) {
        setCsvError(null);
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const text = e.target?.result as string;
                const parsed = parseCSV(text);
                if (!parsed.length) { setCsvError("CSV appears empty or unreadable."); return; }
                const mapped = mapCSVRows(parsed);
                if (!mapped.length) { setCsvError("No usable rows found. Ensure headers include date, description, amount."); return; }
                setBulkRows(prev => {
                    const empties = prev.filter(r => !r.vendor && !r.amount);
                    // Replace empty rows first, then append remaining
                    const remaining = mapped.slice(empties.length);
                    const filled = empties.map((_, i) => mapped[i] ?? _);
                    const base = prev.filter(r => r.vendor || r.amount);
                    return [...base, ...filled.filter(r => r.vendor || r.amount), ...remaining];
                });
            } catch {
                setCsvError("Failed to parse CSV.");
            }
        };
        reader.readAsText(file);
    }

    const fetchAll = useCallback(async () => {
        const hdrs = sharedHeaders();
        const [catRes, expRes] = await Promise.all([
            fetch("/api/categories", { headers: hdrs }),
            fetch("/api/expenses", { headers: hdrs }),
        ]);
        const cats = await catRes.json();
        const exps = await expRes.json();
        setCategories(Array.isArray(cats) ? cats : []);
        setExpenses(Array.isArray(exps) ? exps : []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Build vendor suggestions from past expenses
    useEffect(() => {
        const vendors = [...new Set(expenses.map((e) => e.vendor))].sort();
        setVendorSuggestions(vendors);
    }, [expenses]);

    const resetForm = () => setForm({ date: today, vendor: "", amount: "", categoryId: categories[0]?.id || "", notes: "" });

    async function handleSubmit() {
        if (!form.vendor || !form.amount || !form.categoryId) return;
        setSubmitting(true);
        try {
            if (editingId) {
                await fetch(`/api/expenses/${editingId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", ...sharedHeaders() },
                    body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
                });
            } else {
                await fetch("/api/expenses", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...sharedHeaders() },
                    body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
                });
            }
            setShowAdd(false);
            setEditingId(null);
            resetForm();
            await fetchAll();
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        await fetch(`/api/expenses/${id}`, { method: "DELETE" });
        setExpenses((p) => p.filter((e) => e.id !== id));
    }

    function handleEdit(exp: Expense) {
        setForm({
            date: exp.date.split("T")[0],
            vendor: exp.vendor,
            amount: String(exp.amount),
            categoryId: exp.categoryId,
            notes: exp.notes || "",
        });
        setEditingId(exp.id);
        setShowAdd(true);
    }

    // Group expenses by month
    const filtered = expenses.filter((e) => {
        const matchSearch = e.vendor.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCat = filterCategory === "all" || e.categoryId === filterCategory;
        return matchSearch && matchCat;
    });

    const grouped = filtered.reduce<Record<string, Expense[]>>((acc, e) => {
        const key = monthKeyFromDate(new Date(e.date));
        if (!acc[key]) acc[key] = [];
        acc[key].push(e);
        return acc;
    }, {});

    const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    function monthLabel(key: string) {
        const [y, m] = key.split("-").map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    const catColors: Record<string, string> = {};
    const palette = ["bg-indigo-500/20 text-indigo-300", "bg-emerald-500/20 text-emerald-300", "bg-amber-500/20 text-amber-300", "bg-pink-500/20 text-pink-300", "bg-cyan-500/20 text-cyan-300", "bg-violet-500/20 text-violet-300"];
    categories.forEach((c, i) => { catColors[c.id] = palette[i % palette.length]; });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Header */}
            <div className="px-4 pt-8 pb-2">
                <h1 className="text-2xl font-bold text-white">Expenses</h1>

                {/* Search + Filter */}
                <div className="mt-3 flex gap-2">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search vendor..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                        <option value="all">All</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Category chips scroll */}
            <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
                <button
                    onClick={() => setFilterCategory("all")}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filterCategory === "all" ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                >All</button>
                {categories.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setFilterCategory(c.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filterCategory === c.id ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                    >{c.name}</button>
                ))}
            </div>

            {/* Expense List */}
            <div className="px-4 pb-32 space-y-6">
                {sortedMonths.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500 text-sm">No expenses yet.</p>
                        <p className="text-slate-600 text-xs mt-1">Tap + to add your first expense.</p>
                    </div>
                ) : (
                    sortedMonths.map((monthKey) => {
                        const monthExp = grouped[monthKey];
                        const monthTotal = monthExp.reduce((a, e) => a + Number(e.amount), 0);
                        return (
                            <div key={monthKey}>
                                <div className="flex justify-between items-baseline mb-2">
                                    <h3 className="text-sm font-semibold text-slate-400">{monthLabel(monthKey)}</h3>
                                    <span className="text-sm font-semibold text-white">{formatCurrency(monthTotal)}</span>
                                </div>
                                <div className="space-y-2">
                                    {monthExp.map((exp) => (
                                        <div
                                            key={exp.id}
                                            className="bg-slate-800/70 border border-slate-700/50 rounded-xl px-3 py-3 flex items-center gap-2"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-white font-medium text-sm truncate">{exp.vendor}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${catColors[exp.categoryId] || "bg-slate-700 text-slate-400"}`}>
                                                        {exp.category?.name}
                                                    </span>
                                                </div>
                                                <span className="text-slate-500 text-xs">{formatShortDate(exp.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <span className="text-white font-semibold text-sm mr-1">{formatCurrency(exp.amount)}</span>
                                                <button
                                                    onClick={() => handleEdit(exp)}
                                                    className="p-2 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 active:bg-indigo-500/20 transition-all"
                                                ><Pencil size={14} /></button>
                                                <button
                                                    onClick={() => handleDelete(exp.id)}
                                                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-all"
                                                ><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* FABs */}
            {/* Bulk entry FAB */}
            <button
                onClick={openBulk}
                title="Bulk entry"
                className="fixed bottom-24 right-20 z-40 w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
                <LayoutList size={20} className="text-slate-200" />
            </button>
            {/* Single add FAB */}
            <button
                onClick={() => { resetForm(); setEditingId(null); setShowAdd(true); }}
                className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/50 active:scale-95 transition-all"
            >
                <Plus size={24} className="text-white" />
            </button>

            {/* ── Bulk Entry Sheet ─────────────────────────────────────── */}
            {showBulk && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowBulk(false)} />
                    <div className="relative bg-slate-900 rounded-t-3xl border-t border-slate-700 flex flex-col h-[90vh]">

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white">Bulk Entry</h3>
                                <p className="text-slate-500 text-xs mt-0.5">Fill rows manually or upload a CSV</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Hidden file input */}
                                <input
                                    ref={csvInputRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleCSVFile(file);
                                        e.target.value = ""; // reset so same file can re-upload
                                    }}
                                />
                                <button
                                    onClick={() => csvInputRef.current?.click()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all"
                                >
                                    <Upload size={13} /> Upload CSV
                                </button>
                                <button onClick={() => setShowBulk(false)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* CSV format hint + error */}
                        {csvError ? (
                            <div className="mx-4 mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex-shrink-0">
                                ⚠ {csvError}
                            </div>
                        ) : (
                            <div className="mx-4 mt-2 px-3 py-2 bg-slate-800/60 rounded-xl text-[10px] text-slate-500 flex-shrink-0">
                                <span className="font-medium text-slate-400">Expected columns:</span> date, description / vendor, amount &nbsp;·&nbsp; Works with Apple Card, Chase, BofA, Amex exports
                            </div>
                        )}

                        {/* Column headers */}
                        <div className="grid grid-cols-[96px_1fr_80px_100px_28px] gap-1.5 px-4 py-2 bg-slate-800/60 text-slate-500 text-[10px] font-semibold uppercase tracking-wide flex-shrink-0">
                            <span>Date</span><span>Vendor</span><span>Amount</span><span>Category</span><span />
                        </div>

                        {/* Rows */}
                        <div className="overflow-y-auto flex-1 min-h-0 px-4 py-2 space-y-1.5">
                            {bulkRows.map((row, i) => (
                                <div key={i} className="grid grid-cols-[96px_1fr_80px_100px_28px] gap-1.5 items-center">
                                    <input
                                        type="date"
                                        value={row.date}
                                        onChange={e => setBulkRows(p => p.map((r, j) => j === i ? { ...r, date: e.target.value } : r))}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 w-full"
                                    />
                                    <input
                                        type="text"
                                        value={row.vendor}
                                        onChange={e => setBulkRows(p => p.map((r, j) => j === i ? { ...r, vendor: e.target.value } : r))}
                                        list="bulk-vendor-suggestions"
                                        placeholder="Vendor"
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 w-full"
                                    />
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            value={row.amount}
                                            onChange={e => setBulkRows(p => p.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))}
                                            placeholder="0"
                                            className="bg-slate-800 border border-slate-700 rounded-lg pl-5 pr-1 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 w-full"
                                        />
                                    </div>
                                    <select
                                        value={row.categoryId}
                                        onChange={e => setBulkRows(p => p.map((r, j) => j === i ? { ...r, categoryId: e.target.value } : r))}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-1 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 w-full"
                                    >
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <button
                                        onClick={() => setBulkRows(p => p.filter((_, j) => j !== i))}
                                        className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                                    ><X size={14} /></button>
                                </div>
                            ))}
                            <datalist id="bulk-vendor-suggestions">
                                {vendorSuggestions.map(v => <option key={v} value={v} />)}
                            </datalist>
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-slate-800 flex-shrink-0 space-y-2">
                            <button
                                onClick={() => setBulkRows(p => [...p, { date: today, vendor: "", amount: "", categoryId: categories[0]?.id || "" }])}
                                className="w-full py-2 border border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-all text-xs"
                            >+ Add Row</button>
                            <div className="flex gap-2">
                                <span className="text-slate-500 text-xs self-center flex-1">
                                    {bulkRows.filter(r => r.vendor && r.amount).length} of {bulkRows.length} rows ready
                                </span>
                                <button
                                    onClick={handleBulkSave}
                                    disabled={bulkSubmitting || !bulkRows.some(r => r.vendor && r.amount && r.categoryId)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 text-white text-sm hover:bg-indigo-500 disabled:opacity-50 active:scale-[0.98] transition-all"
                                >
                                    <Check size={16} />
                                    {bulkSubmitting ? "Saving..." : "Save All"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Bottom Sheet */}
            {showAdd && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60" onClick={() => { setShowAdd(false); setEditingId(null); }} />
                    <div className="relative bg-slate-900 rounded-t-3xl border-t border-slate-700 flex flex-col h-[75vh]">

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 flex-shrink-0">
                            <h3 className="text-lg font-bold text-white">{editingId ? "Edit Expense" : "Add Expense"}</h3>
                            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable fields */}
                        <div className="overflow-y-auto px-5 py-4 flex-1 min-h-0">
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Vendor</label>
                                    <input
                                        type="text"
                                        value={form.vendor}
                                        onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))}
                                        list="vendor-suggestions"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                        placeholder="e.g., Trader Joe's"
                                    />
                                    <datalist id="vendor-suggestions">
                                        {vendorSuggestions.map((v) => <option key={v} value={v} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            value={form.amount}
                                            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => setForm((p) => ({ ...p, categoryId: c.id }))}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${form.categoryId === c.id
                                                    ? "bg-indigo-500 text-white"
                                                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                                                    }`}
                                            >{c.name}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
                                    <input
                                        type="text"
                                        value={form.notes}
                                        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                        placeholder="Optional note"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit — always visible at bottom */}
                        <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !form.vendor || !form.amount || !form.categoryId}
                                className="w-full py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 active:scale-[0.98] transition-all"
                            >
                                {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Expense"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
