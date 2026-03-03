/**
 * Credits System (Server-side)
 *
 * A ledger-based credit system for metered usage billing.
 * Credits can be purchased via Stripe or Polar and used for various actions.
 *
 * NOTE: This file contains server-only database operations.
 * For client-safe types and constants, import from credits.shared.ts
 */

import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { creditTransaction, creditBalance } from "@/lib/db/schema";
import { CREDIT_COSTS, type CreditAction } from "./credits.shared";

// Re-export shared types and constants for backwards compatibility
export {
  CREDIT_PACKAGES,
  CREDIT_COSTS,
  getCreditPackage,
  getActionCost,
  formatCredits,
  type CreditPackage,
  type CreditAction,
} from "./credits.shared";

// =============================================================================
// Credit Operations
// =============================================================================

/**
 * Get a user's current credit balance
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const [balance] = await db
    .select({ available: creditBalance.available })
    .from(creditBalance)
    .where(eq(creditBalance.userId, userId))
    .limit(1);

  return balance?.available ?? 0;
}

/**
 * Get a user's credit transactions
 */
export async function getCreditTransactions(userId: string, limit: number = 50) {
  return db
    .select()
    .from(creditTransaction)
    .where(eq(creditTransaction.userId, userId))
    .orderBy(desc(creditTransaction.createdAt))
    .limit(limit);
}

/**
 * Grant credits to a user
 */
export async function grantCredits(options: {
  userId: string;
  amount: number;
  type: "purchase" | "bonus" | "refund";
  description: string;
  provider?: "stripe" | "polar";
  providerPaymentId?: string;
  metadata?: Record<string, any>;
}): Promise<{ transactionId: string; newBalance: number }> {
  const transactionId = crypto.randomUUID();

  // Check for duplicate payment processing
  if (options.providerPaymentId) {
    const existing = await db
      .select({ id: creditTransaction.id })
      .from(creditTransaction)
      .where(eq(creditTransaction.providerPaymentId, options.providerPaymentId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[Credits] Payment ${options.providerPaymentId} already processed`);
      const balance = await getCreditBalance(options.userId);
      return { transactionId: existing[0].id, newBalance: balance };
    }
  }

  // Use transaction for atomicity
  await db.transaction(async (tx) => {
    // Insert transaction record
    await tx.insert(creditTransaction).values({
      id: transactionId,
      userId: options.userId,
      type: options.type,
      amount: options.amount,
      description: options.description,
      provider: options.provider ?? null,
      providerPaymentId: options.providerPaymentId ?? null,
      metadata: options.metadata ?? {},
      createdAt: new Date(),
    });

    // Upsert balance
    await tx
      .insert(creditBalance)
      .values({
        userId: options.userId,
        available: options.amount,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: creditBalance.userId,
        set: {
          available: sql`${creditBalance.available} + ${options.amount}`,
          updatedAt: new Date(),
        },
      });
  });

  const newBalance = await getCreditBalance(options.userId);

  console.log(`[Credits] Granted ${options.amount} credits to user ${options.userId}. New balance: ${newBalance}`);

  return { transactionId, newBalance };
}

/**
 * Spend credits for an action
 */
export async function spendCredits(options: {
  userId: string;
  amount: number;
  action: CreditAction;
  description?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; transactionId?: string; remainingBalance: number; error?: string }> {
  const transactionId = crypto.randomUUID();

  try {
    await db.transaction(async (tx) => {
      // Ensure balance row exists
      await tx
        .insert(creditBalance)
        .values({ userId: options.userId, available: 0, updatedAt: new Date() })
        .onConflictDoNothing();

      // Atomic decrement with balance check
      const updated = await tx
        .update(creditBalance)
        .set({
          available: sql`${creditBalance.available} - ${options.amount}`,
          updatedAt: new Date(),
        })
        .where(sql`${creditBalance.userId} = ${options.userId} AND ${creditBalance.available} >= ${options.amount}`)
        .returning({ available: creditBalance.available });

      if (updated.length === 0) {
        throw new Error("Insufficient credits");
      }

      // Record transaction
      await tx.insert(creditTransaction).values({
        id: transactionId,
        userId: options.userId,
        type: "usage",
        amount: -options.amount,
        description: options.description ?? `${options.action}: ${options.amount} credits`,
        metadata: {
          action: options.action,
          ...options.metadata,
        },
        createdAt: new Date(),
      });
    });

    const remainingBalance = await getCreditBalance(options.userId);

    return {
      success: true,
      transactionId,
      remainingBalance,
    };
  } catch (error: any) {
    const remainingBalance = await getCreditBalance(options.userId);

    return {
      success: false,
      remainingBalance,
      error: error.message || "Failed to spend credits",
    };
  }
}

/**
 * Check if user has enough credits for an action
 */
export async function hasEnoughCredits(userId: string, action: CreditAction, quantity: number = 1): Promise<boolean> {
  const balance = await getCreditBalance(userId);
  const required = CREDIT_COSTS[action] * quantity;
  return balance >= required;
}
