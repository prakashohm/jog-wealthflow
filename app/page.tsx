"use client";
import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { BottomNav } from "@/components/layout/BottomNav";
import { formatCurrency, formatPercent, daysLeftInMonth, valueColor } from "@/lib/formatters";
import { computeGuiltFreeBudget } from "@/lib/calculations";
import { TrendingUp, TrendingDown, Plus, RefreshCw, AlertCircle } from "lucide-react";
import { sharedHeaders } from "@/components/SharedContext";

interface Category {
  id: string;
  name: string;
  type: string;
  budgetAmount: number;
}

interface Expense {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  categoryId: string;
  category: Category;
}

interface BalanceEntry {
  accountId: string;
  value: number;
  month: string;
  account: { type: string; nickname: string };
}

interface Config {
  netMonthlySalary: number;
  avgExtraMonthlyIncome: number;
  fixedCosts: { amount: number }[];
}

function OverviewCard({
  label,
  value,
  change,
}: {
  label: string;
  value: number;
  change?: number;
}) {
  const isUp = (change ?? 0) >= 0;
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 backdrop-blur-sm">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-white text-xl font-bold mt-1">{formatCurrency(value)}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${isUp ? "text-emerald-400" : "text-red-400"}`}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{formatPercent(change)} vs last mo</span>
        </div>
      )}
    </div>
  );
}

function NetWorthHeroCard({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <div className="relative overflow-hidden rounded-3xl p-6"
      style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)" }}>
      {/* Decorative glow rings */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-violet-500/15 blur-2xl pointer-events-none" />
      {/* Label */}
      <p className="relative text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-1">Net Worth</p>
      {/* Value */}
      <p className={`relative text-4xl font-extrabold tracking-tight ${isPositive ? "text-white" : "text-red-300"
        }`}>
        {formatCurrency(value)}
      </p>
      {/* Positive / negative pill */}
      <div className={`relative mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isPositive
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          : "bg-red-500/20 text-red-300 border border-red-500/30"
        }`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {isPositive ? "Positive net worth" : "Negative net worth"}
      </div>
    </div>
  );
}


function BudgetBar({
  name,
  budgeted,
  spent,
  lastMonthSpent,
}: {
  name: string;
  budgeted: number;
  spent: number;
  lastMonthSpent?: number;
}) {
  const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
  const lastPct = budgeted > 0 && lastMonthSpent != null
    ? Math.min((lastMonthSpent / budgeted) * 100, 100)
    : null;
  const remaining = budgeted - spent;
  const barColor = pct < 60 ? "bg-emerald-500" : pct < 85 ? "bg-amber-500" : "bg-red-500";
  const ghostColor = pct < 60 ? "bg-emerald-500/25" : pct < 85 ? "bg-amber-500/25" : "bg-red-500/25";
  const trend = lastMonthSpent != null ? spent - lastMonthSpent : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-300 font-medium truncate">{name}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {trend != null && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${trend > 0 ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
              }`}>
              {trend > 0 ? "↑" : "↓"} {formatCurrency(Math.abs(trend))}
            </span>
          )}
          <span className={`text-xs font-semibold ${remaining >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
          </span>
        </div>
      </div>

      {/* Single layered bar: ghost = last month behind, solid = this month on top */}
      <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden relative">
        {lastPct != null && (
          <div className={`absolute inset-y-0 left-0 ${ghostColor} rounded-full`} style={{ width: `${lastPct}%` }} />
        )}
        <div className={`absolute inset-y-0 left-0 ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>{formatCurrency(spent)} spent</span>
        {lastMonthSpent != null && <span className="text-slate-600">{formatCurrency(lastMonthSpent)} last mo</span>}
        <span>of {formatCurrency(budgeted)}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balanceEntries, setBalanceEntries] = useState<BalanceEntry[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChartCategory, setSelectedChartCategory] = useState<string>("all");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const fetchData = useCallback(async () => {
    try {
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const hdrs = sharedHeaders();
      const [catRes, expRes, balRes, balAllRes, cfgRes] = await Promise.all([
        fetch("/api/categories", { headers: hdrs }),
        fetch("/api/expenses", { headers: hdrs }),
        fetch(`/api/balance-sheet?month=${currentMonthKey}`, { headers: hdrs }),
        fetch("/api/balance-sheet", { headers: hdrs }),
        fetch("/api/config", { headers: hdrs }),
      ]);
      const [cats, exps, balCurrent, balAll, cfg] = await Promise.all([
        catRes.json(),
        expRes.json(),
        balRes.json(),
        balAllRes.json(),
        cfgRes.json(),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setExpenses(Array.isArray(exps) ? exps : []);
      // Use current month entries if available — matches what Balance Sheet shows.
      // Fall back to all entries (deduped to latest-per-account) only if no current month data.
      const currentMonthHasData = Array.isArray(balCurrent) && balCurrent.length > 0;
      setBalanceEntries(currentMonthHasData ? balCurrent : (Array.isArray(balAll) ? balAll : []));
      setConfig(cfg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
  }

  // Compute spending by category for current month
  const currentMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const spentByCategory = currentMonthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.categoryId] = (acc[e.categoryId] || 0) + Number(e.amount);
    return acc;
  }, {});

  // Current year annual expenses
  const currentYearExpenses = expenses.filter(
    (e) => new Date(e.date).getFullYear() === currentYear
  );
  const spentByAnnualCategory = currentYearExpenses.reduce<Record<string, number>>((acc, e) => {
    if (e.category?.type === "ANNUAL") {
      acc[e.categoryId] = (acc[e.categoryId] || 0) + Number(e.amount);
    }
    return acc;
  }, {});

  // Deduplicate: keep only the most recent entry per account
  const latestByAccount = Object.values(
    balanceEntries.reduce<Record<string, BalanceEntry>>((acc, e) => {
      if (!acc[e.accountId] || e.month > acc[e.accountId].month) {
        acc[e.accountId] = e;
      }
      return acc;
    }, {})
  );

  // Balance sheet totals (using latest entry per account)
  const assetTypes = ["PRIMARY_CHECKING", "OTHER_CHECKING", "SAVINGS", "RETIREMENT_PRETAX", "RETIREMENT_AFTERTAX", "INVESTMENT", "REAL_ESTATE", "OTHER_ASSET"];
  const liabilityTypes = ["MORTGAGE", "CAR_LOAN", "CREDIT_CARD", "OTHER_LIABILITY"];

  const totalAssets = latestByAccount
    .filter((e) => assetTypes.includes(e.account?.type))
    .reduce((a, e) => a + Number(e.value), 0);
  const totalLiabilities = latestByAccount
    .filter((e) => liabilityTypes.includes(e.account?.type))
    .reduce((a, e) => a + Number(e.value), 0);
  const netWorth = totalAssets - totalLiabilities;

  const checkingBalance = latestByAccount
    .filter((e) => e.account?.type === "PRIMARY_CHECKING" || e.account?.type === "OTHER_CHECKING")
    .reduce((a, e) => a + Number(e.value), 0);

  const liquidSavings = latestByAccount
    .filter((e) => e.account?.type === "SAVINGS")
    .reduce((a, e) => a + Number(e.value), 0);

  const retirement = latestByAccount
    .filter((e) => e.account?.type === "RETIREMENT_PRETAX" || e.account?.type === "RETIREMENT_AFTERTAX")
    .reduce((a, e) => a + Number(e.value), 0);

  const totalNetIncome = config
    ? Number(config.netMonthlySalary) + Number(config.avgExtraMonthlyIncome)
    : 0;

  const totalFixed = config?.fixedCosts?.reduce((a, f) => a + Number(f.amount), 0) || 0;
  const guiltFree = computeGuiltFreeBudget(
    Number(config?.netMonthlySalary || 0),
    Number(config?.avgExtraMonthlyIncome || 0),
    totalFixed
  );
  const totalSpentThisMonth = currentMonthExpenses.reduce((a, e) => a + Number(e.amount), 0);
  const guiltFreeRemaining = guiltFree - totalSpentThisMonth;

  // Chart data: last 7 months with total spending
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentYear, currentMonth - (6 - i), 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const monthExpenses = expenses.filter((e) => {
      const ed = new Date(e.date);
      return (
        ed.getFullYear() === y &&
        ed.getMonth() === m &&
        (selectedChartCategory === "all" || e.categoryId === selectedChartCategory)
      );
    });
    const total = monthExpenses.reduce((a, e) => a + Number(e.amount), 0);
    return { month: label, spent: total };
  });

  // Last month spending by category
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
  });
  const lastMonthByCategory = lastMonthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.categoryId] = (acc[e.categoryId] || 0) + Number(e.amount);
    return acc;
  }, {});

  const monthlyCategories = categories.filter((c) => c.type === "MONTHLY");
  const annualCategories = categories.filter((c) => c.type === "ANNUAL");

  const totalMonthlyBudgeted = monthlyCategories.reduce((a, c) => a + Number(c.budgetAmount), 0);
  const totalMonthlySpent = monthlyCategories.reduce((a, c) => a + (spentByCategory[c.id] || 0), 0);

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
      <div className="px-4 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-6 pb-8">
        {/* Overview Cards */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Overview</h2>
          {/* Net Worth — hero */}
          <NetWorthHeroCard value={netWorth} />
          {/* Supporting metrics grid */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <OverviewCard label="Monthly Income" value={totalNetIncome} />
            <OverviewCard label="Liquid Savings" value={liquidSavings} />
            <OverviewCard label="Retirement" value={retirement} />
            <OverviewCard label="Checking Balance" value={checkingBalance} />
            <OverviewCard label="Total Assets" value={totalAssets} />
          </div>
        </section>

        {/* Monthly Budget Progress */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">This Month&apos;s Budget</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${totalMonthlySpent > totalMonthlyBudgeted ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
              {formatCurrency(totalMonthlySpent)} / {formatCurrency(totalMonthlyBudgeted)}
            </span>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-4">
            {monthlyCategories.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No categories set up yet. <a href="/setup" className="text-indigo-400">Set up now →</a></p>
            ) : (
              monthlyCategories.map((cat) => (
                <BudgetBar
                  key={cat.id}
                  name={cat.name}
                  budgeted={Number(cat.budgetAmount)}
                  spent={spentByCategory[cat.id] || 0}
                  lastMonthSpent={lastMonthByCategory[cat.id]}
                />
              ))
            )}
          </div>
        </section>

        {/* Annual Budget */}
        {annualCategories.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">This Year&apos;s Annual Budget</h2>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-4">
              {annualCategories.map((cat) => (
                <BudgetBar
                  key={cat.id}
                  name={cat.name}
                  budgeted={Number(cat.budgetAmount)}
                  spent={spentByAnnualCategory[cat.id] || 0}
                />
              ))}
            </div>
          </section>
        )}

        {/* Spending Chart */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Spending History</h2>
            <select
              value={selectedChartCategory}
              onChange={(e) => setSelectedChartCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
                  labelStyle={{ color: "#94a3b8" }}
                  formatter={(v: number | undefined) => formatCurrency(v ?? 0)}
                />
                <Bar dataKey="spent" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Quick Stats */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Quick Stats</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3 text-center">
              <p className={`text-lg font-bold ${valueColor(guiltFreeRemaining)}`}>
                {formatCurrency(Math.abs(guiltFreeRemaining))}
              </p>
              <p className="text-slate-500 text-[10px] mt-1 leading-tight">
                {guiltFreeRemaining >= 0 ? "Guilt-free left" : "Over budget"}
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-white">{daysLeftInMonth()}</p>
              <p className="text-slate-500 text-[10px] mt-1 leading-tight">Days left</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-white">{currentMonthExpenses.length}</p>
              <p className="text-slate-500 text-[10px] mt-1 leading-tight">Expenses logged</p>
            </div>
          </div>
        </section>
      </div>

      {/* FAB */}
      <a
        href="/expenses"
        className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/50 active:scale-95 transition-all"
      >
        <Plus size={24} className="text-white" />
      </a>

      <BottomNav />
    </div>
  );
}
