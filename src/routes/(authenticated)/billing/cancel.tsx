import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(authenticated)/billing/cancel")({
  component: BillingCancelPage,
});

function BillingCancelPage() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-lg">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Payment Canceled</CardTitle>
            <CardDescription>
              Your payment was canceled. No charges were made.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you experienced any issues during checkout, please contact our support team.
              You can try upgrading again at any time.
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Link to={"/billing" as string}>
                <Button className="w-full">Back to Billing</Button>
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
