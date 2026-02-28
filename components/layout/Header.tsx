"use client";
import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function Header() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const [menuOpen, setMenuOpen] = useState(false);

    const initials = user
        ? (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? user.emailAddresses[0]?.emailAddress[0] ?? "")
        : "?";

    const displayName = user?.firstName
        ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
        : user?.emailAddresses[0]?.emailAddress ?? "";

    return (
        <header className="sticky top-0 z-50 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60">
            <div className="flex items-center justify-between px-4 h-14">

                {/* Logo + Name */}
                <div className="flex items-center gap-2.5">
                    {/* Logo mark */}
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/40 flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 12 L5 8 L8 10 L11 5 L14 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="14" cy="7" r="1.2" fill="white" />
                        </svg>
                    </div>
                    <div className="leading-tight">
                        <p className="text-white font-bold text-sm tracking-tight">JOG WealthFlow</p>
                        <p className="text-slate-500 text-[10px] leading-none">Jeevitha&apos;s Family Finance</p>
                    </div>
                </div>

                {/* User menu */}
                {user && (
                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen(o => !o)}
                            className="flex items-center gap-2 py-1 px-2 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            {/* Avatar */}
                            {user.imageUrl ? (
                                <img
                                    src={user.imageUrl}
                                    alt={displayName}
                                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700"
                                />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                    {initials.toUpperCase()}
                                </div>
                            )}
                            <span className="text-slate-300 text-xs font-medium hidden sm:block max-w-[120px] truncate">
                                {displayName}
                            </span>
                            <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none">
                                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {/* Dropdown */}
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                <div className="absolute right-0 top-full mt-2 z-20 w-52 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-xl shadow-black/40 overflow-hidden">
                                    {/* User info */}
                                    <div className="px-4 py-3 border-b border-slate-800">
                                        <p className="text-white text-sm font-medium truncate">{displayName}</p>
                                        <p className="text-slate-500 text-xs truncate mt-0.5">
                                            {user.emailAddresses[0]?.emailAddress}
                                        </p>
                                    </div>
                                    {/* Sign out */}
                                    <button
                                        onClick={() => signOut({ redirectUrl: "/" })}
                                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut size={15} />
                                        Sign out
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
