"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Receipt,
    BarChart3,
    Home,
    Settings,
} from "lucide-react";

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/balance-sheet", label: "Balance", icon: BarChart3 },
    { href: "/rentals", label: "Rentals", icon: Home },
    { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 pb-safe">
            <div className="flex items-center justify-around px-2 py-2">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex flex-col items-center gap-0.5 min-w-[48px] min-h-[48px] justify-center rounded-xl transition-all duration-200 px-3 py-2 ${isActive
                                    ? "text-indigo-400 bg-indigo-500/10"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                                }`}
                        >
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                            <span className="text-[10px] font-medium leading-none mt-0.5">{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
