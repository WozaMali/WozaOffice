import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  try {
    const value = Number.isFinite(amount) ? amount : 0
    return `C ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  } catch {
    const value = Number.isFinite(amount) ? amount : 0
    return `C ${value.toFixed(2)}`
  }
}

// Simple exponential backoff array generator
export function backoffDelays(options?: { baseMs?: number; maxMs?: number; factor?: number; jitter?: boolean; maxAttempts?: number }): number[] {
  const baseMs = options?.baseMs ?? 1000
  const maxMs = options?.maxMs ?? 30000
  const factor = options?.factor ?? 2
  const jitter = options?.jitter ?? true
  const maxAttempts = options?.maxAttempts ?? Infinity
  const delays: number[] = []
  let current = baseMs
  let attempt = 0
  while (attempt < maxAttempts) {
    const delay = jitter ? Math.min(maxMs, current) * (0.5 + Math.random()) : Math.min(maxMs, current)
    delays.push(Math.floor(delay))
    current = Math.min(maxMs, Math.floor(current * factor))
    attempt += 1
  }
  return delays
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}