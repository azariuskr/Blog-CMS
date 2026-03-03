import { CURRENCY } from "@/constants";

interface PriceDisplayProps {
	cents: number;
	className?: string;
	showCurrency?: boolean;
}

export function PriceDisplay({
	cents,
	className,
	showCurrency = true,
}: PriceDisplayProps) {
	const formatted = (cents / 100).toFixed(CURRENCY.DECIMAL_PLACES);

	return (
		<span className={className}>
			{showCurrency && CURRENCY.SYMBOL}
			{formatted}
		</span>
	);
}

interface PriceRangeProps {
	minCents: number;
	maxCents: number;
	className?: string;
}

export function PriceRange({ minCents, maxCents, className }: PriceRangeProps) {
	if (minCents === maxCents) {
		return <PriceDisplay cents={minCents} className={className} />;
	}

	return (
		<span className={className}>
			<PriceDisplay cents={minCents} /> - <PriceDisplay cents={maxCents} />
		</span>
	);
}
