import { useState } from "react";
import { Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGrantCredits } from "@/hooks/use-billing";
import { useOverlay } from "@/lib/store/overlay";

export function GrantCreditsDialog() {
  const { id, close } = useOverlay();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const grantMutation = useGrantCredits({
    onSuccess: () => {
      close();
      resetForm();
    },
  });

  const resetForm = () => {
    setUserId("");
    setAmount("");
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !amount || !description) return;

    await grantMutation.mutateAsync({
      userId,
      amount: parseInt(amount, 10),
      description,
    });
  };

  const handleClose = () => {
    close();
    resetForm();
  };

  return (
    <Dialog open={id === "grantCredits"} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Grant Bonus Credits
          </DialogTitle>
          <DialogDescription>
            Grant bonus credits to a user. This action will be logged.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              placeholder="Enter user ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder="Number of credits"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Reason</Label>
            <Textarea
              id="description"
              placeholder="Reason for granting credits..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={grantMutation.isPending}>
              {grantMutation.isPending ? "Granting..." : "Grant Credits"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
