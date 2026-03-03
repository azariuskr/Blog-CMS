import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PlanCardProps {
  id: string;
  name: string;
  description: string;
  features: string[];
  priceMonthlyFormatted: string;
  priceYearlyFormatted: string;
  isPopular?: boolean;
  isFree?: boolean;
  isCurrentPlan?: boolean;
  interval: "month" | "year";
  onSelect?: (planId: string, interval: "month" | "year") => void;
  isLoading?: boolean;
  disabled?: boolean;
  buttonLabel?: string;
}

export function PlanCard({
  id,
  name,
  description,
  features,
  priceMonthlyFormatted,
  priceYearlyFormatted,
  isPopular,
  isFree,
  isCurrentPlan,
  interval,
  onSelect,
  isLoading,
  disabled,
  buttonLabel,
}: PlanCardProps) {
  const price = interval === "month" ? priceMonthlyFormatted : priceYearlyFormatted;

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isPopular && "border-primary shadow-md",
        isCurrentPlan && "border-green-500 bg-green-50/50 dark:bg-green-950/20"
      )}
    >
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}
      {isCurrentPlan && (
        <Badge variant="outline" className="absolute -top-3 left-1/2 -translate-x-1/2 border-green-500 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          Current Plan
        </Badge>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-4xl font-bold">{price}</span>
          {!isFree && (
            <span className="text-muted-foreground">/{interval}</span>
          )}
        </div>

        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 shrink-0 text-green-500" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isPopular ? "default" : "outline"}
          onClick={() => onSelect?.(id, interval)}
          disabled={disabled || isLoading || isCurrentPlan || isFree}
        >
          {isLoading ? (
            "Loading..."
          ) : buttonLabel ? (
            buttonLabel
          ) : isCurrentPlan ? (
            "Current Plan"
          ) : isFree ? (
            "Free Forever"
          ) : (
            `Upgrade to ${name}`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
