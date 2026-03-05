"use client";
import { createContext, useContext, useEffect, useState } from "react";

interface SharedContextValue {
    viewAs: string | null;        // ownerUserId being viewed, or null for self
    setViewAs: (id: string | null) => void;
    exitSharedView: () => void;
}

const SharedContext = createContext<SharedContextValue>({
    viewAs: null,
    setViewAs: () => { },
    exitSharedView: () => { },
});

export function SharedContextProvider({ children }: { children: React.ReactNode }) {
    const [viewAs, setViewAsState] = useState<string | null>(null);

    useEffect(() => {
        // Hydrate from sessionStorage on mount
        const stored = sessionStorage.getItem("viewAs");
        if (stored) setViewAsState(stored);
    }, []);

    function setViewAs(id: string | null) {
        if (id) {
            sessionStorage.setItem("viewAs", id);
        } else {
            sessionStorage.removeItem("viewAs");
        }
        setViewAsState(id);
    }

    function exitSharedView() {
        setViewAs(null);
        window.location.reload(); // force data refresh
    }

    return (
        <SharedContext.Provider value={{ viewAs, setViewAs, exitSharedView }}>
            {children}
        </SharedContext.Provider>
    );
}

export function useSharedContext() {
    return useContext(SharedContext);
}

/** Builds headers with x-view-as if in shared mode */
export function sharedHeaders(): HeadersInit {
    const viewAs = typeof window !== "undefined" ? sessionStorage.getItem("viewAs") : null;
    return viewAs ? { "x-view-as": viewAs } : {};
}
