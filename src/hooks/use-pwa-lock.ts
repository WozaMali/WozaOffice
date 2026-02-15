"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { logAdminSessionEvent } from "@/lib/admin-session-logging";

type PwaLockState = {
	needsSetup: boolean;
	isLocked: boolean;
	username: string | null;
	lockAfterMs: number;
	stickyLocked?: boolean;
};

const LS_LAST_ACTIVE = "pwaLock.lastActiveAt";
const LS_LOCK_AFTER = "pwaLock.lockAfterMs";
const SS_UNLOCKED = "pwaLock.unlockedSession";
const LS_FORCE_LOCK_NEXT = "pwaLock.forceLockNext";
const LS_STICKY = "pwaLock.sticky";

function getNow(): number {
	return Date.now();
}

async function sha256Hex(input: string): Promise<string> {
	const enc = new TextEncoder();
	const data = enc.encode(input);
	const digest = await crypto.subtle.digest("SHA-256", data);
	const bytes = new Uint8Array(digest);
	return Array.from(bytes)
		.map(b => b.toString(16).padStart(2, "0"))
		.join("");
}

function randomSaltHex(bytes: number = 16): string {
	const arr = new Uint8Array(bytes);
	crypto.getRandomValues(arr);
	return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

function readNumber(key: string, fallback: number): number {
	try {
		const v = localStorage.getItem(key);
		if (!v) return fallback;
		const n = Number(v);
		return Number.isFinite(n) ? n : fallback;
	} catch {
		return fallback;
	}
}

function readString(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function usePwaLock(lockAfterMinutes: number = 30) {
	const { user } = useAuth();
    const defaultLockAfter = useMemo(() => Math.max(1, lockAfterMinutes) * 60 * 1000, [lockAfterMinutes]);
	const [state, setState] = useState<PwaLockState>(() => {
		if (typeof window === "undefined") {
			return { needsSetup: false, isLocked: false, username: null, lockAfterMs: defaultLockAfter, stickyLocked: false };
		}
		const configuredLockAfter = readNumber(LS_LOCK_AFTER, defaultLockAfter);
		// Start unlocked by default - only lock if user has been idle for a long time
		return { needsSetup: false, isLocked: false, username: null, lockAfterMs: configuredLockAfter, stickyLocked: false };
	});

	const lock = useCallback(() => {
		try { sessionStorage.removeItem(SS_UNLOCKED); } catch {}
		// Only lock if user has been idle longer than configured threshold
		const last = readNumber(LS_LAST_ACTIVE, 0);
		const configured = readNumber(LS_LOCK_AFTER, state.lockAfterMs);
		const isIdleTooLong = getNow() - last >= configured;
		if (isIdleTooLong) {
			setState(s => ({ ...s, isLocked: true }));
		}
	}, [state.lockAfterMs]);

	// Force an immediate lock regardless of idle time
	const lockImmediate = useCallback(() => {
		try { sessionStorage.removeItem(SS_UNLOCKED); } catch {}
		try { localStorage.setItem(LS_LAST_ACTIVE, "0"); } catch {}
		try { localStorage.setItem(LS_STICKY, "1"); } catch {}
		setState(s => ({ ...s, isLocked: true, stickyLocked: true }));
	}, []);

	const touch = useCallback(() => {
		// Do not mark activity while in sticky lock to avoid auto-unlock
		if (state.stickyLocked) return;
		try { localStorage.setItem(LS_LAST_ACTIVE, String(getNow())); } catch {}
	}, [state.stickyLocked]);

	const setup = useCallback(async (username: string, pin: string): Promise<{ success: boolean; error?: string }> => {
		username = (username || "").trim();
		if (!username) return { success: false, error: "Username required" };
		if (!/^\d{5}$/.test(pin)) return { success: false, error: "PIN must be 5 digits" };
		if (!user?.id) return { success: false, error: "Not authenticated" };
		const salt = randomSaltHex(16);
		const saltedHash = await sha256Hex(`${salt}::${pin}`);
		try {
			const supabase = getSupabaseClient();
			const { error } = await supabase
				.from('user_pins')
				.upsert({ user_id: user.id, username, salt, salted_hash: saltedHash, last_changed_at: new Date().toISOString() }, { onConflict: 'user_id' });
			if (error) return { success: false, error: error.message };
			// Force lock on next load: user must enter PIN immediately after setup
			localStorage.setItem(LS_LAST_ACTIVE, "0");
			localStorage.setItem(LS_LOCK_AFTER, String(state.lockAfterMs));
			localStorage.setItem(LS_FORCE_LOCK_NEXT, "1");
			setState({ needsSetup: false, isLocked: true, username, lockAfterMs: state.lockAfterMs });
			return { success: true };
		} catch (e: any) {
			return { success: false, error: e?.message || "Failed to save PIN" };
		}
	}, [state.lockAfterMs, user?.id]);

	const unlock = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
		if (!/^\d{5}$/.test(pin)) return { success: false, error: "PIN must be 5 digits" };
		if (!user?.id) return { success: false, error: "Not authenticated" };
		try {
			const supabase = getSupabaseClient();
			const { data, error } = await supabase
				.from('user_pins')
				.select('username, salt, salted_hash')
				.eq('user_id', user.id)
				.maybeSingle();
			if (error || !data) return { success: false, error: "Not set up" };
			const hashed = await sha256Hex(`${data.salt}::${pin}`);
			if (hashed !== data.salted_hash) return { success: false, error: "Invalid PIN" };
			localStorage.setItem(LS_LAST_ACTIVE, String(getNow()));
			// Don't save unlocked session - users must enter PIN every time
			// sessionStorage.setItem(SS_UNLOCKED, "true");
			try { localStorage.removeItem(LS_STICKY); } catch {}
			setState(s => ({ ...s, isLocked: false, needsSetup: false, username: data.username, stickyLocked: false }));
			// Log unlock as a session event for admin activity stats
			try { await logAdminSessionEvent(user?.id, 'unlock'); } catch {}
			return { success: true };
		} catch (e: any) {
			return { success: false, error: e?.message || "Unlock failed" };
		}
	}, [user?.id]);

	const updateLockAfterMinutes = useCallback((minutes: number) => {
		const ms = Math.max(1, Math.floor(minutes)) * 60 * 1000;
		try { localStorage.setItem(LS_LOCK_AFTER, String(ms)); } catch {}
		setState(s => ({ ...s, lockAfterMs: ms }));
	}, []);

	// Idle & visibility handling
	const checkIdleRef = useRef<ReturnType<typeof setInterval> | null>(null);
	// Track previous user ID to detect login events
	const prevUserIdRef = useRef<string | null>(null);
	
	useEffect(() => {
		// Fetch pin setup status from server
		const init = async () => {
			if (!user?.id) {
				// If user logs out, reset lock state
				prevUserIdRef.current = null;
				setState(s => ({ ...s, isLocked: false, needsSetup: false, username: null }));
				return;
			}
			
			// Detect if this is a new login (user ID changed from null/other to current)
			const isNewLogin = prevUserIdRef.current !== user.id;
			if (isNewLogin) {
				prevUserIdRef.current = user.id;
				// On fresh login, always reset activity time - user just authenticated
				try { localStorage.setItem(LS_LAST_ACTIVE, String(getNow())); } catch {}
			}
			
			try {
				const supabase = getSupabaseClient();
				const { data } = await supabase
					.from('user_pins')
					.select('username')
					.eq('user_id', user.id)
					.maybeSingle();
				const forceNext = readString(LS_FORCE_LOCK_NEXT);
				// Only lock if forced, or if user has been idle longer than configured threshold
				const last = readNumber(LS_LAST_ACTIVE, 0);
				const configured = readNumber(LS_LOCK_AFTER, state.lockAfterMs);
				const shouldForceLock = !!forceNext && !!data;
				
				// On fresh login, always reset activity and don't lock
				// For existing sessions, check if user has been idle
				if (isNewLogin) {
					// Fresh login - don't lock, activity time already set above
					if (shouldForceLock) {
						try { localStorage.removeItem(LS_FORCE_LOCK_NEXT); } catch {}
						try { localStorage.setItem(LS_STICKY, "1"); } catch {}
					}
					
					setState(s => ({
						...s,
						needsSetup: !data,
						// On fresh login, only lock if explicitly forced (e.g., after PIN setup)
						isLocked: shouldForceLock ? true : false,
						stickyLocked: shouldForceLock ? true : false,
						username: data?.username || null,
					}));
					return;
				}
				
				// For existing sessions (not fresh login), check idle time
				// Only check idle time if last > 0 (has activity recorded)
				const isIdleTooLong = last === 0 ? false : (getNow() - last >= configured);
				
				if (shouldForceLock) {
					try { localStorage.removeItem(LS_FORCE_LOCK_NEXT); } catch {}
					try { localStorage.setItem(LS_STICKY, "1"); } catch {}
				}
				
                setState(s => ({
                    ...s,
                    needsSetup: !data,
                    // Only lock if:
                    // 1. PIN exists and forced (e.g., just set up PIN or manual lock)
                    // 2. PIN exists and user has been idle too long
                    // Don't lock if no PIN is set - let user access dashboard first
					isLocked: data ? (shouldForceLock ? true : (isIdleTooLong)) : false,
					stickyLocked: shouldForceLock ? true : (readString(LS_STICKY) ? true : false),
                    username: data?.username || null,
                }));
			} catch {}
		};
		init();
	}, [user?.id, state.lockAfterMs]);

	useEffect(() => {
		// Only lock/unlock based on idle if not in sticky lock
		if (!state.needsSetup) {
			const last = readNumber(LS_LAST_ACTIVE, 0);
			const configured = readNumber(LS_LOCK_AFTER, state.lockAfterMs);
			// Don't lock if last === 0 (fresh login) - treat as active
			const isIdleTooLong = last === 0 ? false : (getNow() - last >= configured);
			if (!state.stickyLocked) {
				if (!state.isLocked || (state.isLocked && isIdleTooLong)) {
					if (state.isLocked !== isIdleTooLong) {
						setState(s => ({ ...s, isLocked: isIdleTooLong }));
					}
				}
			}
		}
		const onActivity = () => {
			if (!state.isLocked) touch();
		};
		const onVisibility = () => {
			if (document.visibilityState === "visible") {
				const last = readNumber(LS_LAST_ACTIVE, 0);
				// Only lock if user has been away for more than 30 minutes
				// Don't lock if last === 0 (fresh login)
				if (last > 0 && getNow() - last >= 1800000) {
					lock();
				}
			} else {
				// Update last active time when tab becomes hidden
				touch();
			}
		};
		// Handle cross-tab session activity using storage events
		const onStorage = (e: StorageEvent) => {
			if (e.key === LS_LAST_ACTIVE && e.newValue) {
				if (!state.isLocked) {
					// Keep session alive across tabs
					setState(s => ({ ...s }));
				}
			}
			if (e.key === LS_FORCE_LOCK_NEXT && e.newValue) {
				// Enforce lock across tabs
				setState(s => ({ ...s, isLocked: true }));
			}
		};
		window.addEventListener("mousemove", onActivity);
		window.addEventListener("keydown", onActivity);
		window.addEventListener("click", onActivity, { capture: true });
		window.addEventListener("touchstart", onActivity, { passive: true });
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("storage", onStorage);
		checkIdleRef.current = setInterval(() => {
			const last = readNumber(LS_LAST_ACTIVE, 0);
			const configured = readNumber(LS_LOCK_AFTER, state.lockAfterMs);
			// Only lock if user has been idle longer than configured threshold and not sticky
			// Don't lock if last === 0 (fresh login) - treat as active
			if (!state.stickyLocked && !state.isLocked && last > 0 && getNow() - last >= configured) {
				lock();
			}
		}, 5 * 60 * 1000); // Check every 5 minutes instead of every minute
		return () => {
			window.removeEventListener("mousemove", onActivity);
			window.removeEventListener("keydown", onActivity);
			window.removeEventListener("click", onActivity, { capture: true } as any);
			window.removeEventListener("touchstart", onActivity as any);
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("storage", onStorage);
			if (checkIdleRef.current) clearInterval(checkIdleRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.isLocked, state.needsSetup, state.lockAfterMs, lock, touch]);

	return {
		needsSetup: state.needsSetup,
		isLocked: state.isLocked,
		username: state.username,
		lockAfterMs: state.lockAfterMs,
		setup,
		unlock,
		lock,
		touch,
		updateLockAfterMinutes,
		lockImmediate,
	};
}


