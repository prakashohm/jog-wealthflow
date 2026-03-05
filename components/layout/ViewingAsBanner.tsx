"use client";
import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { useSharedContext } from "@/components/SharedContext";

export function ViewingAsBanner() {
    const { viewAs, exitSharedView } = useSharedContext();
    const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

    useEffect(() => {
        if (!viewAs) { setOwnerEmail(null); return; }
        // Fetch a lightweight endpoint to get owner email
        fetch("/api/sharing/owner-info", { headers: { "x-view-as": viewAs } })
            .then((r) => r.ok ? r.json() : null)
            .then((d) => { if (d?.email) setOwnerEmail(d.email); })
            .catch(() => { });
    }, [viewAs]);

    if (!viewAs) return null;

    return (
        <div className="bg-indigo-900/60 border-b border-indigo-700/50 px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
                <Eye size={14} className="text-indigo-300 flex-shrink-0" />
                <p className="text-xs text-indigo-200 truncate">
                    Viewing <span className="font-semibold">{ownerEmail ?? "shared account"}</span>
                </p>
            </div>
            <button
                onClick={exitSharedView}
                className="flex items-center gap-1 text-xs text-indigo-300 hover:text-white transition-colors flex-shrink-0"
            >
                <X size={13} /> Exit
            </button>
        </div>
    );
}
