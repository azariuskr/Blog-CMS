/**
 * Billing Database Schema
 *
 * This schema handles:
 * - Credit transactions (ledger for credit purchases/usage)
 * - Credit balances (cached balance for quick lookups)
 *
 * Note: Subscription data is managed by Better Auth's Stripe/Polar plugins
 * which add their own tables (subscription, etc.) automatically.
 */

import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

// =============================================================================
// Credit Transactions (Ledger)
// =============================================================================

/**
 * Credit transaction types:
 * - purchase: Credits bought via payment
 * - usage: Credits consumed by an action
 * - bonus: Credits granted for promotions/referrals
 * - refund: Credits returned due to refund
 */
export const creditTransaction = pgTable(
  "credit_transaction",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // purchase, usage, bonus, refund
    amount: integer("amount").notNull(), // positive for credits in, negative for out
    description: text("description").notNull(),
    provider: text("provider"), // stripe, polar, or null for internal
    providerPaymentId: text("provider_payment_id"), // Stripe/Polar payment/order ID
    metadata: json("metadata").$type<Record<string, any>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("credit_transaction_user_id_idx").on(table.userId),
    index("credit_transaction_type_idx").on(table.type),
    index("credit_transaction_created_at_idx").on(table.createdAt),
    index("credit_transaction_provider_payment_id_idx").on(table.providerPaymentId),
  ],
);

// =============================================================================
// Credit Balance (Cached)
// =============================================================================

/**
 * Credit balance cache for quick lookups.
 * Updated atomically with transactions.
 */
export const creditBalance = pgTable(
  "credit_balance",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    available: integer("available").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

// =============================================================================
// Relations
// =============================================================================

export const creditTransactionRelations = relations(creditTransaction, ({ one }) => ({
  user: one(user, {
    fields: [creditTransaction.userId],
    references: [user.id],
  }),
}));

export const creditBalanceRelations = relations(creditBalance, ({ one }) => ({
  user: one(user, {
    fields: [creditBalance.userId],
    references: [user.id],
  }),
}));
