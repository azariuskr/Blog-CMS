interface RateLimitConfig {
    maxAttempts: number;
    windowMs: number;
    storageKey: string;
}

interface RateLimitEntry {
    attempts: number;
    resetAt: number;
}

export class RateLimiter {
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
        this.config = config;
    }

    private getEntry(): RateLimitEntry | null {
        try {
            const stored = localStorage.getItem(this.config.storageKey);
            if (!stored) return null;
            return JSON.parse(stored) as RateLimitEntry;
        } catch {
            return null;
        }
    }

    private setEntry(entry: RateLimitEntry): void {
        try {
            localStorage.setItem(this.config.storageKey, JSON.stringify(entry));
        } catch {
            // Fail silently if localStorage is unavailable
        }
    }

    check(): { allowed: boolean; remainingAttempts: number; resetIn: number } {
        const now = Date.now();
        const entry = this.getEntry();

        // No previous attempts or window expired
        if (!entry || now >= entry.resetAt) {
            return {
                allowed: true,
                remainingAttempts: this.config.maxAttempts - 1,
                resetIn: this.config.windowMs,
            };
        }

        // Check if limit exceeded
        if (entry.attempts >= this.config.maxAttempts) {
            return {
                allowed: false,
                remainingAttempts: 0,
                resetIn: entry.resetAt - now,
            };
        }

        return {
            allowed: true,
            remainingAttempts: this.config.maxAttempts - entry.attempts - 1,
            resetIn: entry.resetAt - now,
        };
    }

    record(): void {
        const now = Date.now();
        const entry = this.getEntry();

        if (!entry || now >= entry.resetAt) {
            // Start new window
            this.setEntry({
                attempts: 1,
                resetAt: now + this.config.windowMs,
            });
        } else {
            // Increment attempts
            this.setEntry({
                attempts: entry.attempts + 1,
                resetAt: entry.resetAt,
            });
        }
    }

    reset(): void {
        try {
            localStorage.removeItem(this.config.storageKey);
        } catch {
            // Fail silently
        }
    }
}

export const authRateLimiters = {
    login: new RateLimiter({
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        storageKey: "auth:rate-limit:login",
    }),

    twoFactor: new RateLimiter({
        maxAttempts: 5,
        windowMs: 5 * 60 * 1000, // 5 minutes
        storageKey: "auth:rate-limit:2fa",
    }),

    passwordReset: new RateLimiter({
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        storageKey: "auth:rate-limit:password-reset",
    }),
};

export function formatTimeRemaining(ms: number): string {
    const minutes = Math.ceil(ms / 60000);
    if (minutes > 1) return `${minutes} minutes`;
    return "1 minute";
}
