"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { ChevronUp, ChevronDown } from "lucide-react";

const STEPS = ["Accounts", "Income", "Annual Budget", "Fixed Costs", "Monthly Budget"];

const DEFAULT_FIXED_COSTS = [
    { name: "IRA Contribution", amount: 0 },
    { name: "Primary Mortgage / HOA", amount: 0 },
    { name: "Other Mortgages", amount: 0 },
    { name: "Phone", amount: 0 },
    { name: "Internet", amount: 0 },
    { name: "Utilities", amount: 0 },
    { name: "Subscriptions", amount: 0 },
];

const DEFAULT_MONTHLY = [
    { name: "Grocery & Household", budgetAmount: 1000, type: "MONTHLY" },
    { name: "Car / Gas", budgetAmount: 250, type: "MONTHLY" },
    { name: "Unusual Expense", budgetAmount: 500, type: "MONTHLY" },
    { name: "Restaurant & Entertainment", budgetAmount: 500, type: "MONTHLY" },
];

const DEFAULT_ANNUAL = [
    { name: "Vacation", budgetAmount: 3000, type: "ANNUAL" },
    { name: "Kids' Activities", budgetAmount: 1000, type: "ANNUAL" },
    { name: "Car Insurance", budgetAmount: 1200, type: "ANNUAL" },
    { name: "Amazon / Costco / CC Fees", budgetAmount: 500, type: "ANNUAL" },
    { name: "House Repairs / Maintenance", budgetAmount: 2000, type: "ANNUAL" },
    { name: "Smart Home Subscriptions", budgetAmount: 300, type: "ANNUAL" },
    { name: "Car Maintenance", budgetAmount: 800, type: "ANNUAL" },
    { name: "Life Insurance", budgetAmount: 1200, type: "ANNUAL" },
    { name: "Tax", budgetAmount: 0, type: "ANNUAL" },
];

const ACCOUNT_TYPES = [
    { value: "PRIMARY_CHECKING", label: "Primary Checking" },
    { value: "OTHER_CHECKING", label: "Other Checking" },
    { value: "SAVINGS", label: "Savings" },
    { value: "RETIREMENT_PRETAX", label: "401K (Pre-tax)" },
    { value: "RETIREMENT_AFTERTAX", label: "Roth IRA (After-tax)" },
    { value: "INVESTMENT", label: "Investment" },
    { value: "REAL_ESTATE", label: "Real Estate" },
    { value: "OTHER_ASSET", label: "Other Asset" },
    { value: "MORTGAGE", label: "Mortgage" },
    { value: "CAR_LOAN", label: "Car Loan" },
    { value: "CREDIT_CARD", label: "Credit Card" },
    { value: "OTHER_LIABILITY", label: "Other Liability" },
];

export default function SetupPage() {
    const { user } = useUser();
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);

    const [income, setIncome] = useState({
        grossMonthlySalary: "",
        monthlyRetirementContrib: "",
        netMonthlySalary: "",
    });
    const [extraIncome, setExtraIncome] = useState([
        { name: "Rental Income", amount: 0 },
        { name: "Freelance / Side Income", amount: 0 },
    ]);

    const [fixedCosts, setFixedCosts] = useState(DEFAULT_FIXED_COSTS);
    const [monthlyCategories, setMonthlyCategories] = useState(DEFAULT_MONTHLY);
    const [annualCategories, setAnnualCategories] = useState(DEFAULT_ANNUAL);
    const [accounts, setAccounts] = useState([
        { nickname: "", type: "PRIMARY_CHECKING" },
    ]);
    const [loadingData, setLoadingData] = useState(true);

    function moveAccount(i: number, dir: -1 | 1) {
        setAccounts((p) => {
            const next = [...p];
            const tmp = next[i];
            next[i] = next[i + dir];
            next[i + dir] = tmp;
            return next;
        });
    }

    const [accountFilter, setAccountFilter] = useState("all");

    const ACCOUNT_GROUPS = [
        { label: "All", value: "all", types: [] as string[] },
        { label: "Checking", value: "checking", types: ["PRIMARY_CHECKING", "OTHER_CHECKING"] },
        { label: "Savings", value: "savings", types: ["SAVINGS"] },
        { label: "Retirement", value: "retirement", types: ["RETIREMENT_PRETAX", "RETIREMENT_AFTERTAX"] },
        { label: "Assets", value: "assets", types: ["INVESTMENT", "REAL_ESTATE", "OTHER_ASSET"] },
        { label: "Liabilities", value: "liabilities", types: ["MORTGAGE", "CAR_LOAN", "CREDIT_CARD", "OTHER_LIABILITY"] },
    ];

    // Save wizard draft to localStorage on every state change
    const DRAFT_KEY = `setup-draft-${user?.id ?? "anon"}`;
    useEffect(() => {
        if (loadingData) return; // Don't overwrite with defaults before load finishes
        const draft = { income, extraIncome, fixedCosts, monthlyCategories, annualCategories, accounts, step };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, [income, extraIncome, fixedCosts, monthlyCategories, annualCategories, accounts, step, loadingData, DRAFT_KEY]);

    // Pre-fill from saved data on mount
    useEffect(() => {
        async function loadSaved() {
            try {
                // Always fetch from DB first — accounts must always reflect saved state
                const [configRes, catRes, accRes] = await Promise.all([
                    fetch("/api/config"),
                    fetch("/api/categories"),
                    fetch("/api/accounts"),
                ]);
                const config = await configRes.json();
                const cats = await catRes.json();
                const accs = await accRes.json();

                // Pre-fill income from DB
                if (config && config.grossMonthlySalary != null) {
                    setIncome({
                        grossMonthlySalary: String(config.grossMonthlySalary || ""),
                        monthlyRetirementContrib: String(config.monthlyRetirementContrib || ""),
                        netMonthlySalary: String(config.netMonthlySalary || ""),
                    });
                    const extra = Number(config.avgExtraMonthlyIncome);
                    if (extra > 0) setExtraIncome([{ name: "Extra Income", amount: extra }]);
                }

                // Pre-fill fixed costs from DB
                if (config?.fixedCosts?.length) {
                    const editable = config.fixedCosts
                        .filter((fc: { name: string; amount: number }) => fc.name !== "Annual Budget Set-aside")
                        .map((fc: { name: string; amount: number }) => ({ name: fc.name, amount: fc.amount }));
                    if (editable.length > 0) setFixedCosts(editable);
                }

                // Pre-fill categories from DB
                if (Array.isArray(cats) && cats.length > 0) {
                    const monthly = cats
                        .filter((c: { type: string }) => c.type === "MONTHLY")
                        .map((c: { name: string; budgetAmount: number; type: string }) => ({ name: c.name, budgetAmount: Number(c.budgetAmount), type: c.type }));
                    const annual = cats
                        .filter((c: { type: string }) => c.type === "ANNUAL")
                        .map((c: { name: string; budgetAmount: number; type: string }) => ({ name: c.name, budgetAmount: Number(c.budgetAmount), type: c.type }));
                    if (monthly.length > 0) setMonthlyCategories(monthly);
                    if (annual.length > 0) setAnnualCategories(annual);
                }

                // Pre-fill accounts from DB — always authoritative
                if (Array.isArray(accs) && accs.length > 0) {
                    setAccounts(accs.map((a: { nickname: string; type: string }) => ({ nickname: a.nickname, type: a.type })));
                }

                // Now layer any unsaved draft on top (income/costs/categories only — NOT accounts,
                // since those are always saved-to-DB immediately via the wizard)
                const raw = localStorage.getItem(`setup-draft-${user?.id ?? "anon"}`);
                if (raw) {
                    try {
                        const draft = JSON.parse(raw);
                        // Only restore wizard form fields that haven't been saved yet
                        // Deliberately skip draft.accounts — DB is the source of truth
                        if (draft.income) setIncome(draft.income);
                        if (draft.extraIncome) setExtraIncome(draft.extraIncome);
                        if (draft.fixedCosts) setFixedCosts(draft.fixedCosts);
                        if (draft.monthlyCategories) setMonthlyCategories(draft.monthlyCategories);
                        if (draft.annualCategories) setAnnualCategories(draft.annualCategories);
                        if (draft.step != null) setStep(draft.step);
                    } catch { /* corrupt draft, ignore */ }
                }
            } catch (e) {
                // Ignore — defaults remain
            } finally {
                setLoadingData(false);
            }
        }
        loadSaved();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totalExtraIncome = extraIncome.reduce((a, b) => a + Number(b.amount), 0);
    const totalAnnualBudget = annualCategories.reduce((a, b) => a + Number(b.budgetAmount), 0);
    const annualBudgetSetAside = Math.round(totalAnnualBudget / 12);

    const totalFixed = fixedCosts.reduce((a, b) => a + Number(b.amount), 0) + annualBudgetSetAside;
    const totalMonthly = monthlyCategories.reduce((a, b) => a + Number(b.budgetAmount), 0);
    const netIncome = Number(income.netMonthlySalary) + totalExtraIncome;
    const guiltFree = netIncome - totalFixed;

    async function handleFinish() {
        if (!user) return;
        setSaving(true);
        try {
            // Clear draft on successful save
            localStorage.removeItem(`setup-draft-${user.id}`);
            await fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: user.emailAddresses[0]?.emailAddress || "",
                    grossMonthlySalary: Number(income.grossMonthlySalary),
                    monthlyRetirementContrib: Number(income.monthlyRetirementContrib),
                    netMonthlySalary: Number(income.netMonthlySalary),
                    avgExtraMonthlyIncome: totalExtraIncome,
                    setupComplete: true,
                    fixedCosts: [
                        { name: "Annual Budget Set-aside", amount: annualBudgetSetAside },
                        ...fixedCosts,
                    ],
                }),
            });

            await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categories: [...monthlyCategories, ...annualCategories].map((c, i) => ({
                        ...c,
                        sortOrder: i,
                    })),
                }),
            });

            const validAccounts = accounts.filter((a) => a.nickname.trim());
            if (validAccounts.length > 0) {
                await fetch("/api/accounts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accounts: validAccounts }),
                });
            }

            router.push("/");
        } finally {
            setSaving(false);
        }
    }

    if (loadingData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Header */}
            <div className="px-4 pt-8 pb-4">
                <h1 className="text-2xl font-bold text-white">Setup Your Budget</h1>
                <p className="text-slate-400 text-sm mt-1">Step {step + 1} of {STEPS.length}</p>

                {/* Progress bar */}
                <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                    />
                </div>

                {/* Step tabs */}
                <div className="flex gap-1 mt-3 overflow-x-auto">
                    {STEPS.map((s, i) => (
                        <button
                            key={s}
                            onClick={() => setStep(i)}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${i === step
                                ? "bg-indigo-500 text-white"
                                : i < step
                                    ? "bg-indigo-500/20 text-indigo-400"
                                    : "bg-slate-800 text-slate-500"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 pb-32">
                {/* STEP 0: Accounts */}
                {step === 0 && (
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-white mt-2">Your Accounts</h2>
                        <p className="text-slate-400 text-sm">Add all your bank accounts, investments, and liabilities.</p>

                        {/* Type filter chips */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                            {ACCOUNT_GROUPS.map((g) => {
                                const count = g.value === "all" ? accounts.length : accounts.filter(a => g.types.includes(a.type)).length;
                                return (
                                    <button
                                        key={g.value}
                                        onClick={() => setAccountFilter(g.value)}
                                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${accountFilter === g.value
                                            ? "bg-indigo-600 text-white"
                                            : "bg-slate-800 text-slate-400 hover:text-white"
                                            }`}
                                    >
                                        {g.label}
                                        {count > 0 && (
                                            <span className={`text-[10px] px-1 rounded-full ${accountFilter === g.value ? "bg-white/20" : "bg-slate-700"
                                                }`}>{count}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Account rows (filtered for display, all included on save) */}
                        {accounts.map((acc, i) => {
                            const activeGroup = ACCOUNT_GROUPS.find(g => g.value === accountFilter);
                            if (accountFilter !== "all" && activeGroup && !activeGroup.types.includes(acc.type)) return null;
                            return (
                                <div key={i} className="flex gap-1.5 items-center">
                                    {/* Sort buttons */}
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            onClick={() => moveAccount(i, -1)}
                                            disabled={i === 0}
                                            className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                                        ><ChevronUp size={14} /></button>
                                        <button
                                            onClick={() => moveAccount(i, 1)}
                                            disabled={i === accounts.length - 1}
                                            className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors"
                                        ><ChevronDown size={14} /></button>
                                    </div>
                                    <input
                                        type="text"
                                        value={acc.nickname}
                                        onChange={(e) => setAccounts((p) => p.map((x, j) => j === i ? { ...x, nickname: e.target.value } : x))}
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                        placeholder="Account nickname"
                                    />
                                    <select
                                        value={acc.type}
                                        onChange={(e) => setAccounts((p) => p.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                                        className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                                    >
                                        {ACCOUNT_TYPES.map((at) => (
                                            <option key={at.value} value={at.value}>{at.label}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setAccounts((p) => p.filter((_, j) => j !== i))}
                                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                                    >✕</button>
                                </div>
                            );
                        })}

                        <button
                            onClick={() => setAccounts((p) => [...p, { nickname: "", type: "PRIMARY_CHECKING" }])}
                            className="w-full py-2 border border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-all text-sm"
                        >+ Add Account</button>
                    </div>
                )}

                {/* STEP 1: Income */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white mt-2">Income Setup</h2>

                        {/* Core salary fields */}
                        {[
                            { label: "Gross Monthly Salary", key: "grossMonthlySalary" },
                            { label: "Monthly 401K / Retirement Contribution", key: "monthlyRetirementContrib" },
                            { label: "Net Monthly Salary (take-home)", key: "netMonthlySalary" },
                        ].map(({ label, key }) => (
                            <div key={key}>
                                <label className="block text-sm text-slate-400 mb-1">{label}</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input
                                        type="number"
                                        value={income[key as keyof typeof income]}
                                        onChange={(e) => setIncome((p) => ({ ...p, [key]: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-7 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Dynamic extra income lines */}
                        <div className="pt-2">
                            <p className="text-sm font-medium text-slate-300 mb-2">Extra Monthly Income</p>
                            <div className="space-y-2">
                                {extraIncome.map((line, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={line.name}
                                            onChange={(e) => setExtraIncome((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                            placeholder="Source name"
                                        />
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                            <input
                                                type="number"
                                                value={line.amount}
                                                onChange={(e) => setExtraIncome((p) => p.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-6 pr-2 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                                placeholder="0"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setExtraIncome((p) => p.filter((_, j) => j !== i))}
                                            className="text-slate-600 hover:text-red-400 transition-colors p-1"
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setExtraIncome((p) => [...p, { name: "", amount: 0 }])}
                                className="mt-2 w-full py-2 border border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-all text-sm"
                            >+ Add Income Source</button>
                        </div>

                        {/* Summary */}
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Gross Salary</span>
                                <span className="text-white font-medium">{formatCurrency(Number(income.grossMonthlySalary))}</span>
                            </div>
                            {totalExtraIncome > 0 && extraIncome.filter(e => e.amount > 0).map((e, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-400">{e.name || "Extra"}</span>
                                    <span className="text-slate-300">{formatCurrency(e.amount)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm border-t border-indigo-500/20 pt-1 mt-1">
                                <span className="text-slate-400">Net Total (take-home + extra)</span>
                                <span className="text-emerald-400 font-semibold">{formatCurrency(netIncome)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: Annual Budget */}
                {step === 2 && (
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-white mt-2">Annual Budget Categories</h2>
                        {annualCategories.map((cat, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={cat.name}
                                    onChange={(e) => setAnnualCategories((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                                <div className="relative w-32">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={cat.budgetAmount}
                                        onChange={(e) => setAnnualCategories((p) => p.map((x, j) => j === i ? { ...x, budgetAmount: Number(e.target.value) } : x))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-6 pr-2 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <button
                                    onClick={() => setAnnualCategories((p) => p.filter((_, j) => j !== i))}
                                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                                >✕</button>
                            </div>
                        ))}
                        <button
                            onClick={() => setAnnualCategories((p) => [...p, { name: "", budgetAmount: 0, type: "ANNUAL" }])}
                            className="w-full py-2 border border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-all text-sm"
                        >+ Add Category</button>

                        {/* Summary card */}
                        <div className="bg-slate-800/50 rounded-xl p-4 space-y-2 mt-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Total Annual Budget</span>
                                <span className="text-white font-semibold">{formatCurrency(totalAnnualBudget)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Monthly Set-aside</span>
                                <span className="text-indigo-300 font-semibold">{formatCurrency(annualBudgetSetAside)}<span className="text-slate-500 font-normal"> / mo</span></span>
                            </div>
                            {netIncome > 0 && (
                                <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                                    <span className="text-slate-400">% of Net Monthly Income</span>
                                    <span className={`font-semibold ${annualBudgetSetAside / netIncome > 0.2 ? "text-amber-400" : "text-emerald-400"}`}>
                                        {((annualBudgetSetAside / netIncome) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: Fixed Costs */}
                {step === 3 && (
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-white mt-2">Fixed Monthly Costs</h2>

                        {/* Read-only auto-calculated row */}
                        <div className="flex gap-2 items-center opacity-80">
                            <div className="flex-1 bg-slate-800/40 border border-slate-700/50 border-dashed rounded-xl px-3 py-2.5 text-slate-400 text-sm flex items-center gap-2">
                                Annual Budget Set-aside
                                <span className="ml-auto text-indigo-400 text-xs font-medium bg-indigo-500/10 px-1.5 py-0.5 rounded-md">Auto</span>
                            </div>
                            <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                <input
                                    type="number"
                                    value={annualBudgetSetAside}
                                    readOnly
                                    tabIndex={-1}
                                    className="w-full bg-slate-800/40 border border-slate-700/50 border-dashed rounded-xl pl-6 pr-2 py-2.5 text-slate-400 text-sm cursor-not-allowed"
                                />
                            </div>
                            <div className="w-6" />
                        </div>
                        <p className="text-xs text-slate-600 -mt-1 ml-1">= Total Annual Budget ÷ 12 ({formatCurrency(totalAnnualBudget)} / 12)</p>

                        {fixedCosts.map((fc, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={fc.name}
                                    onChange={(e) => setFixedCosts((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    placeholder="Name"
                                />
                                <div className="relative w-32">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={fc.amount}
                                        onChange={(e) => setFixedCosts((p) => p.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-6 pr-2 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                        placeholder="0"
                                    />
                                </div>
                                <button
                                    onClick={() => setFixedCosts((p) => p.filter((_, j) => j !== i))}
                                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                                >✕</button>
                            </div>
                        ))}
                        <button
                            onClick={() => setFixedCosts((p) => [...p, { name: "", amount: 0 }])}
                            className="w-full py-2 border border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-all text-sm"
                        >+ Add Fixed Cost</button>
                        <div className="bg-slate-800/50 rounded-xl p-3 mt-2 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Total Fixed Costs</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-semibold">{formatCurrency(totalFixed)}</span>
                                    {netIncome > 0 && (
                                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${totalFixed / netIncome > 0.5
                                            ? "bg-amber-500/20 text-amber-300"
                                            : "bg-slate-700 text-slate-400"
                                            }`}>
                                            {((totalFixed / netIncome) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            {netIncome > 0 && (
                                <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                                    <span className="text-slate-400 text-sm">Guilt-Free Budget</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-semibold text-sm ${guiltFree >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                            {formatCurrency(guiltFree)}
                                        </span>
                                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${guiltFree < 0
                                            ? "bg-red-500/20 text-red-300"
                                            : "bg-emerald-500/15 text-emerald-400"
                                            }`}>
                                            {((guiltFree / netIncome) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 4: Monthly Budget */}
                {step === 4 && (
                    <div className="space-y-3">
                        <div className="flex items-baseline justify-between mt-2">
                            <h2 className="text-lg font-semibold text-white">Guilt-Free Budget Categories</h2>
                            {netIncome > 0 && (
                                <span className={`text-sm font-semibold tabular-nums ${guiltFree - totalMonthly < 0 ? "text-red-400" : "text-emerald-400"}`}>
                                    {formatCurrency(Math.abs(guiltFree - totalMonthly))}
                                    <span className="text-xs font-normal text-slate-400 ml-1">
                                        {guiltFree - totalMonthly < 0 ? "over" : "available"}
                                    </span>
                                </span>
                            )}
                        </div>
                        {monthlyCategories.map((cat, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={cat.name}
                                    onChange={(e) => setMonthlyCategories((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                                <div className="relative w-32">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={cat.budgetAmount}
                                        onChange={(e) => setMonthlyCategories((p) => p.map((x, j) => j === i ? { ...x, budgetAmount: Number(e.target.value) } : x))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-6 pr-2 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <button
                                    onClick={() => setMonthlyCategories((p) => p.filter((_, j) => j !== i))}
                                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                                >✕</button>
                            </div>
                        ))}
                        <button
                            onClick={() => setMonthlyCategories((p) => [...p, { name: "", budgetAmount: 0, type: "MONTHLY" }])}
                            className="w-full py-2 border border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-all text-sm"
                        >+ Add Category</button>
                        <div className="bg-slate-800/50 rounded-xl p-3 mt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Total Guilt-Free Monthly Budget</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-semibold">{formatCurrency(totalMonthly)}</span>
                                    {netIncome > 0 && (
                                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${totalMonthly / netIncome > 0.5
                                            ? "bg-amber-500/20 text-amber-300"
                                            : "bg-slate-700 text-slate-400"
                                            }`}>
                                            {((totalMonthly / netIncome) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Dynamic budget status message */}
                        {netIncome > 0 && (() => {
                            const remaining = guiltFree - totalMonthly;
                            const pct = netIncome > 0 ? (remaining / netIncome) * 100 : 0;
                            if (remaining < 0) return (
                                <div className="animate-pulse rounded-xl px-4 py-3 bg-red-500/15 border border-red-500/40 flex items-start gap-2 mt-1">
                                    <span className="text-lg leading-none">🚨</span>
                                    <div>
                                        <p className="text-red-300 font-semibold text-sm">You're over budget by {formatCurrency(Math.abs(remaining))}!</p>
                                        <p className="text-red-400/70 text-xs mt-0.5">Remove some categories or increase your income to get back in the green.</p>
                                    </div>
                                </div>
                            );
                            if (remaining === 0) return (
                                <div className="rounded-xl px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 mt-1">
                                    <span className="text-lg leading-none">🎯</span>
                                    <div>
                                        <p className="text-emerald-300 font-semibold text-sm">Every dollar has a job — perfect allocation!</p>
                                        <p className="text-emerald-400/60 text-xs mt-0.5">Zero-based budget achieved. You're a budgeting pro.</p>
                                    </div>
                                </div>
                            );
                            if (pct <= 5) return (
                                <div className="rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 mt-1">
                                    <span className="text-lg leading-none">⚡</span>
                                    <div>
                                        <p className="text-amber-300 font-semibold text-sm">Almost fully allocated — {formatCurrency(remaining)} left</p>
                                        <p className="text-amber-400/60 text-xs mt-0.5">Tight but good. Consider keeping a small unallocated buffer for flexibility.</p>
                                    </div>
                                </div>
                            );
                            return (
                                <div className="rounded-xl px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2 mt-1">
                                    <span className="text-lg leading-none">💰</span>
                                    <div>
                                        <p className="text-indigo-300 font-semibold text-sm">{formatCurrency(remaining)} still available to allocate</p>
                                        <p className="text-slate-400 text-xs mt-0.5">That's {pct.toFixed(1)}% of your income unbudgeted — keep going or leave it as flex cash!</p>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

            </div>

            {/* Bottom buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
                {step > 0 && (
                    <button
                        onClick={() => setStep((s) => s - 1)}
                        className="flex-1 py-3 rounded-xl font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
                    >
                        Back
                    </button>
                )}
                {step < STEPS.length - 1 ? (
                    <button
                        onClick={() => setStep((s) => s + 1)}
                        className="flex-1 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-all active:scale-[0.98]"
                    >
                        Next →
                    </button>
                ) : (
                    <button
                        onClick={handleFinish}
                        disabled={saving}
                        className="flex-1 py-3 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Finish Setup 🎉"}
                    </button>
                )}
            </div>
        </div>
    );
}
