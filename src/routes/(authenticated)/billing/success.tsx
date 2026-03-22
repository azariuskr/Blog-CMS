import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle } from "lucide-react";
import { z } from "zod";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants";

const searchSchema = z.object({
  plan: z.string().optional(),
  checkout_id: z.string().optional(),
});

export const Route = createFileRoute("/(authenticated)/billing/success")({
  validateSearch: searchSchema,
  component: BillingSuccessPage,
});

function BillingSuccessPage() {
  const { plan } = Route.useSearch();

  return (
    <PageContainer>
      <div className="mx-auto max-w-lg">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              Thank you for your purchase. Your subscription is now active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan && (
              <p className="text-muted-foreground">
                You've successfully upgraded to the <strong className="capitalize">{plan}</strong> plan.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to your email address with the details of your purchase.
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Link to={"/billing" as string}>
                <Button className="w-full">View Billing Dashboard</Button>
              </Link>
              <Link to={ROUTES.DASHBOARD as string}>
                <Button variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
