"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, X, Pencil } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatCurrency } from "@/lib/formatters";
import { computeRentalNetBalance } from "@/lib/calculations";

interface RentalProperty {
    id: string;
    address: string;
    propertyValue: number;
    mortgageBalance: number;
    interestRate: number;
    principalInterest: number;
    escrow: number;
    monthlyRent: number;
    maintenancePct: number;
}

const EMPTY_FORM = {
    address: "",
    propertyValue: "",
    mortgageBalance: "",
    interestRate: "",
    principalInterest: "",
    escrow: "",
    monthlyRent: "",
    maintenancePct: "10",
};

export default function RentalsPage() {
    const [properties, setProperties] = useState<RentalProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        const res = await fetch("/api/rentals");
        const data = await res.json();
        setProperties(Array.isArray(data) ? data : []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    function f(key: string, value: string) {
        setForm((p) => ({ ...p, [key]: value }));
    }

    async function handleSubmit() {
        setSubmitting(true);
        const payload = {
            address: form.address,
            propertyValue: parseFloat(form.propertyValue) || 0,
            mortgageBalance: parseFloat(form.mortgageBalance) || 0,
            interestRate: parseFloat(form.interestRate) || 0,
            principalInterest: parseFloat(form.principalInterest) || 0,
            escrow: parseFloat(form.escrow) || 0,
            monthlyRent: parseFloat(form.monthlyRent) || 0,
            maintenancePct: parseFloat(form.maintenancePct) / 100 || 0.1,
        };
        try {
            if (editingId) {
                await fetch("/api/rentals", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editingId, ...payload }),
                });
            } else {
                await fetch("/api/rentals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }
            setShowForm(false);
            setEditingId(null);
            setForm(EMPTY_FORM);
            await fetchData();
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        await fetch(`/api/rentals?id=${id}`, { method: "DELETE" });
        setProperties((p) => p.filter((x) => x.id !== id));
    }

    function handleEdit(prop: RentalProperty) {
        setForm({
            address: prop.address,
            propertyValue: String(prop.propertyValue),
            mortgageBalance: String(prop.mortgageBalance),
            interestRate: String(prop.interestRate),
            principalInterest: String(prop.principalInterest),
            escrow: String(prop.escrow),
            monthlyRent: String(prop.monthlyRent),
            maintenancePct: String(Number(prop.maintenancePct) * 100),
        });
        setEditingId(prop.id);
        setShowForm(true);
    }

    const totals = properties.reduce(
        (acc, p) => {
            const net = computeRentalNetBalance(
                Number(p.monthlyRent),
                Number(p.principalInterest),
                Number(p.escrow),
                Number(p.maintenancePct)
            );
            return {
                rent: acc.rent + Number(p.monthlyRent),
                mortgage: acc.mortgage + Number(p.principalInterest) + Number(p.escrow),
                net: acc.net + net,
                equity: acc.equity + (Number(p.propertyValue) - Number(p.mortgageBalance)),
            };
        },
        { rent: 0, mortgage: 0, net: 0, equity: 0 }
    );

    const formFields = [
        { label: "Address", key: "address", type: "text", prefix: "" },
        { label: "Property Value", key: "propertyValue", type: "number", prefix: "$" },
        { label: "Mortgage Balance", key: "mortgageBalance", type: "number", prefix: "$" },
        { label: "Interest Rate (%)", key: "interestRate", type: "number", prefix: "" },
        { label: "P&I Payment", key: "principalInterest", type: "number", prefix: "$" },
        { label: "Escrow", key: "escrow", type: "number", prefix: "$" },
        { label: "Monthly Rent", key: "monthlyRent", type: "number", prefix: "$" },
        { label: "Maintenance (%)", key: "maintenancePct", type: "number", prefix: "" },
    ];

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
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Rentals</h1>
                    <button
                        onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium text-white transition-all"
                    >
                        <Plus size={16} /> Add Property
                    </button>
                </div>
            </div>

            <div className="px-4 pb-32 space-y-4">
                {/* Summary stats */}
                {properties.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                            <p className="text-slate-400 text-xs uppercase tracking-wide">Total Monthly Rent</p>
                            <p className="text-white text-xl font-bold mt-1">{formatCurrency(totals.rent)}</p>
                        </div>
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                            <p className="text-slate-400 text-xs uppercase tracking-wide">Total Cash Flow</p>
                            <p className={`text-xl font-bold mt-1 ${totals.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {formatCurrency(totals.net)}
                            </p>
                        </div>
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl col-span-2 p-4">
                            <p className="text-slate-400 text-xs uppercase tracking-wide">Total Equity</p>
                            <p className="text-white text-xl font-bold mt-1">{formatCurrency(totals.equity)}</p>
                        </div>
                    </div>
                )}

                {/* Property cards */}
                {properties.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500">No rental properties added yet.</p>
                    </div>
                ) : (
                    properties.map((prop) => {
                        const netBalance = computeRentalNetBalance(
                            Number(prop.monthlyRent),
                            Number(prop.principalInterest),
                            Number(prop.escrow),
                            Number(prop.maintenancePct)
                        );
                        const totalMortgage = Number(prop.principalInterest) + Number(prop.escrow);
                        const equity = Number(prop.propertyValue) - Number(prop.mortgageBalance);
                        return (
                            <div key={prop.id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-white font-semibold">{prop.address}</h3>
                                        <p className="text-slate-400 text-xs mt-0.5">{Number(prop.interestRate)}% rate</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(prop)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(prop.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    {[
                                        { label: "Property Value", value: formatCurrency(prop.propertyValue) },
                                        { label: "Mortgage Balance", value: formatCurrency(prop.mortgageBalance) },
                                        { label: "Equity", value: formatCurrency(equity), highlight: "text-emerald-400" },
                                        { label: "P&I", value: formatCurrency(prop.principalInterest) },
                                        { label: "Escrow", value: formatCurrency(prop.escrow) },
                                        { label: "Total Mortgage", value: formatCurrency(totalMortgage) },
                                        { label: "Monthly Rent", value: formatCurrency(prop.monthlyRent), highlight: "text-indigo-300" },
                                        { label: "Maintenance", value: formatCurrency(Number(prop.monthlyRent) * Number(prop.maintenancePct)) },
                                    ].map(({ label, value, highlight }) => (
                                        <div key={label}>
                                            <p className="text-slate-500 text-xs">{label}</p>
                                            <p className={`font-medium ${highlight || "text-white"}`}>{value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className={`mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center`}>
                                    <span className="text-slate-400 text-sm font-medium">Net Balance</span>
                                    <span className={`text-lg font-bold ${netBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                        {formatCurrency(netBalance)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add/Edit Bottom Sheet */}
            {showForm && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} />
                    <div className="relative bg-slate-900 rounded-t-3xl border-t border-slate-700 flex flex-col h-[88vh]">

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800 flex-shrink-0">
                            <h3 className="text-lg font-bold text-white">{editingId ? "Edit Property" : "Add Property"}</h3>
                            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable fields — min-h-0 is required for flex children to actually shrink */}
                        <div className="overflow-y-auto px-5 py-4 flex-1 min-h-0">
                            <div className="space-y-3">
                                {formFields.map(({ label, key, type, prefix }) => (
                                    <div key={key}>
                                        <label className="block text-xs text-slate-400 mb-1">{label}</label>
                                        <div className="relative">
                                            {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
                                            <input
                                                type={type}
                                                value={form[key as keyof typeof form]}
                                                onChange={(e) => f(key, e.target.value)}
                                                className={`w-full bg-slate-800 border border-slate-700 rounded-xl ${prefix ? "pl-7" : "px-3"} pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500`}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {form.monthlyRent && (
                                    <div className="bg-slate-800 rounded-xl p-3 flex justify-between">
                                        <span className="text-slate-400 text-sm">Est. Net Balance</span>
                                        <span className={`font-semibold text-sm ${computeRentalNetBalance(parseFloat(form.monthlyRent || "0"), parseFloat(form.principalInterest || "0"), parseFloat(form.escrow || "0"), parseFloat(form.maintenancePct || "10") / 100) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                            {formatCurrency(computeRentalNetBalance(parseFloat(form.monthlyRent || "0"), parseFloat(form.principalInterest || "0"), parseFloat(form.escrow || "0"), parseFloat(form.maintenancePct || "10") / 100))}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit button — always visible at bottom */}
                        <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !form.address}
                                className="w-full py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
                            >
                                {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Property"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
