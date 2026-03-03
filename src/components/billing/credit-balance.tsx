import { format } from "date-fns";
import { Coins, TrendingDown, TrendingUp, Gift, RotateCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOverlay } from "@/lib/store/overlay";
import { cn } from "@/lib/utils";

export interface CreditTransaction {
  id: string;
  type: "purchase" | "bonus" | "usage" | "refund";
  amount: number;
  description?: string | null;
  createdAt: Date;
}

export interface CreditBalanceProps {
  balance: number;
  transactions?: CreditTransaction[];
  showHistory?: boolean;
  className?: string;
}

const TRANSACTION_CONFIG: Record<string, { icon: typeof Coins; color: string; sign: "+" | "-" }> = {
  purchase: { icon: TrendingUp, color: "text-green-500", sign: "+" },
  bonus: { icon: Gift, color: "text-blue-500", sign: "+" },
  usage: { icon: TrendingDown, color: "text-red-500", sign: "-" },
  refund: { icon: RotateCcw, color: "text-orange-500", sign: "+" },
};

export function CreditBalance({
  balance,
  transactions = [],
  showHistory = true,
  className,
}: CreditBalanceProps) {
  const { open } = useOverlay();

  const handleBuyCredits = () => {
    open("purchaseCredits");
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Credit Balance</CardTitle>
            <CardDescription>Your available credits for premium features</CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
            <Coins className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold">{balance.toLocaleString()}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={handleBuyCredits}>
          <Plus className="mr-2 h-4 w-4" />
          Buy Credits
        </Button>
      </CardHeader>

      {showHistory && transactions.length > 0 && (
        <CardContent>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Recent Transactions</p>
          <ScrollArea className="h-50">
            <div className="space-y-2">
              {transactions.map((tx) => {
                const config = TRANSACTION_CONFIG[tx.type] ?? TRANSACTION_CONFIG.usage;
                const Icon = config.icon;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-full bg-muted p-2", config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{tx.type}</p>
                        {tx.description && (
                          <p className="text-xs text-muted-foreground">{tx.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-medium", config.color)}>
                        {config.sign}{Math.abs(tx.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.createdAt), "MMM d, HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      )}

      {showHistory && transactions.length === 0 && (
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
