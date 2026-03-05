"use client";
import { Suspense, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type State = "loading" | "success" | "error";

function AcceptInviteContent() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [state, setState] = useState<State>("loading");
    const [errorMsg, setErrorMsg] = useState("");
    const [wrongAccount, setWrongAccount] = useState(false);

    useEffect(() => {
        if (!isLoaded) return;

        if (!user) {
            const returnUrl = `/sharing/accept?token=${token}`;
            router.push(`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`);
            return;
        }

        if (!token) {
            setState("error");
            setErrorMsg("No invite token found in the link.");
            return;
        }

        async function accept() {
            try {
                const res = await fetch(`/api/sharing/accept?token=${token}`);
                const data = await res.json();

                if (!res.ok) {
                    setState("error");
                    setErrorMsg(data.error || "Something went wrong.");
                    if (res.status === 403) setWrongAccount(true);
                    return;
                }

                if (data.ownerUserId) {
                    sessionStorage.setItem("viewAs", data.ownerUserId);
                }

                setState("success");
                setTimeout(() => router.push("/"), 2000);
            } catch {
                setState("error");
                setErrorMsg("Network error. Please try again.");
            }
        }

        accept();
    }, [isLoaded, user, token, router]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                {state === "loading" && (
                    <>
                        <Loader2 size={48} className="text-indigo-400 mx-auto mb-4 animate-spin" />
                        <h1 className="text-xl font-bold text-white mb-2">Accepting Invite…</h1>
                        <p className="text-slate-400 text-sm">Just a moment while we set up your access.</p>
                    </>
                )}

                {state === "success" && (
                    <>
                        <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-white mb-2">Access Granted!</h1>
                        <p className="text-slate-400 text-sm">You now have access to the shared financial data. Redirecting to dashboard…</p>
                        <button
                            onClick={() => router.push("/")}
                            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
                        >
                            Go to Dashboard
                        </button>
                    </>
                )}

                {state === "error" && (
                    <>
                        <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-white mb-2">Invite Error</h1>
                        <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
                        {wrongAccount ? (
                            <a
                                href={`/sign-in?redirect_url=${encodeURIComponent(`/sharing/accept?token=${token}`)}`}
                                className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all text-sm mb-3"
                            >
                                Sign in with the correct account
                            </a>
                        ) : null}
                        <button
                            onClick={() => router.push("/")}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
                        >
                            Back to Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function SharingAcceptPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 size={32} className="text-indigo-400 animate-spin" />
            </div>
        }>
            <AcceptInviteContent />
        </Suspense>
    );
}
