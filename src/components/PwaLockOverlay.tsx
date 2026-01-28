"use client";

import { useState } from "react";
import { usePwaLock } from "@/hooks/use-pwa-lock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";


export default function PwaLockOverlay() {
    const { user, profile, logout } = useAuth();
    const { needsSetup, isLocked, setup, unlock, lockImmediate } = usePwaLock();
	const [username, setUsername] = useState("");
	const [pin, setPin] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Only show overlay after authentication
	if (!user) return null;

	if (!needsSetup && !isLocked) return null;

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
    try {
			if (needsSetup) {
        const res = await setup(username, pin);
				if (!res.success) {
          setError(res.error || "Failed");
        } else {
          // Lock immediately and show unlock view without refreshing
          lockImmediate();
          setUsername("");
          setPin("");
          return;
        }
			} else {
				const res = await unlock(pin);
				if (!res.success) setError(res.error || "Failed");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>{needsSetup ? "Set up Quick PIN" : "Unlock"}</CardTitle>
				</CardHeader>
				<CardContent>
					{needsSetup && (
						<div className="mb-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
							<div className="font-medium mb-1">Your account</div>
							<div className="space-y-1">
								<div>
									<span className="text-gray-500">User ID:</span>{' '}
									<span className="font-mono break-all">{user.id}</span>
								</div>
								<div>
									<span className="text-gray-500">Name:</span>{' '}
									{profile?.full_name || '—'}
								</div>
								<div>
									<span className="text-gray-500">Email:</span>{' '}
									{profile?.email || user.email || '—'}
								</div>
								<div>
									<span className="text-gray-500">Role:</span>{' '}
									{profile?.role || '—'}
								</div>
							</div>
						</div>
					)}
					<form onSubmit={onSubmit} className="space-y-3">
                        {needsSetup && (
                            <div>
                                <label className="text-sm">Username</label>
                                <Input 
                                    value={username}
                                    onChange={e => setUsername(e.target.value)} 
                                    placeholder="e.g. office-admin"
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                            </div>
                        )}
						<div>
							<label className="text-sm">5-digit PIN</label>
                            <Input 
                                type="password" 
                                name="pin_code"
                                inputMode="numeric" 
                                pattern="\d{5}" 
                                maxLength={5} 
                                value={pin} 
                                onChange={e => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0,5))} 
                                placeholder="•••••" 
                                autoComplete="off"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                            />
						</div>
						{error && <div className="text-sm text-red-600">{error}</div>}
                        <Button type="submit" className="w-full" disabled={loading}>
							{loading ? (needsSetup ? "Saving..." : "Unlocking...") : (needsSetup ? "Save PIN" : "Unlock")}
						</Button>
                        {!needsSetup && (
                          <Button type="button" variant="outline" className="w-full mt-2" onClick={async () => {
                            try { await logout(); } catch {}
                            try { window.location.href = "/admin-login"; } catch {}
                          }}>
                            Sign out
                          </Button>
                        )}
					</form>
				</CardContent>
			</Card>
		</div>
	);
}


