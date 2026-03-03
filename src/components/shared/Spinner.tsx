import {
    Aperture,
    Book,
    BookOpen,
    Download,
    Loader2,
    Package,
    RefreshCw,
} from "lucide-react";

// ============ Base Spinner Component ============
interface SpinnerProps {
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    variant?:
    | "default"
    | "aperture"
    | "book"
    | "book-open"
    | "package"
    | "refresh"
    | "download";
    className?: string;
}

const sizeMap = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
};

const containerSizeMap = {
    xs: "h-4 w-4",
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-14 w-14",
};

export function Spinner({
    size = "md",
    variant = "default",
    className = "",
}: SpinnerProps) {
    const sizeClass = sizeMap[size];
    const containerSizeClass = containerSizeMap[size];

    if (variant === "aperture") {
        return (
            <span
                className={`relative inline-grid place-items-center ${containerSizeClass} ${className}`}
            >
                <span
                    className={[
                        "absolute inset-0 rounded-full",
                        "bg-[conic-gradient(from_0deg,var(--primary),var(--ring),var(--primary))]",
                        "animate-spin animation-duration-[1200ms] direction-[reverse]",
                        "[-webkit-mask:radial-gradient(farthest-side,transparent_calc(100%-3px),#000_0)]",
                        "[mask:radial-gradient(farthest-side,transparent_calc(100%-3px),#000_0)]",
                        "opacity-90",
                    ].join(" ")}
                />
                <Aperture
                    className={[
                        "relative",
                        sizeClass,
                        "animate-spin animation-duration-[900ms]",
                        "text-primary",
                    ].join(" ")}
                />
            </span>
        );
    }

    const icons = {
        default: Loader2,
        book: Book,
        "book-open": BookOpen,
        package: Package,
        refresh: RefreshCw,
        download: Download,
    } as const;

    const Icon = icons[variant];

    return <Icon className={`animate-spin ${sizeClass} ${className}`} />;
}

// ============ Button Spinner ============
interface ButtonSpinnerProps {
    loading: boolean;
    children: React.ReactNode;
    variant?: SpinnerProps["variant"];
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    buttonVariant?: "primary" | "secondary" | "destructive" | "outline";
}

export function ButtonWithSpinner({
    loading,
    children,
    variant = "default",
    onClick,
    disabled,
    className = "",
    buttonVariant = "primary",
}: ButtonSpinnerProps) {
    const variantStyles = {
        primary:
            "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
        secondary:
            "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90",
        destructive:
            "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90",
        outline:
            "border-2 border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)]",
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${variantStyles[buttonVariant]} ${className}`}
        >
            {loading && <Spinner size="sm" variant={variant} />}
            {children}
        </button>
    );
}

// ============ Section Spinner ============
interface SectionSpinnerProps {
    loading?: boolean;
    text?: string;
    size?: SpinnerProps["size"];
    variant?: SpinnerProps["variant"];
    className?: string;
}

export function SectionSpinner({
    loading = true,
    text = "Loading...",
    size = "lg",
    variant = "default",
    className = "",
}: SectionSpinnerProps) {
    if (!loading) return null;

    return (
        <div
            className={`flex flex-col items-center justify-center p-8 ${className}`}
        >
            <Spinner size={size} variant={variant} className="text-primary" />
            {text && <p className="mt-3 text-sm text-muted-foreground">{text}</p>}
        </div>
    );
}

// ============ Full Screen Spinner ============
interface FullScreenSpinnerProps {
    loading?: boolean;
    text?: string;
    size?: SpinnerProps["size"];
    variant?: SpinnerProps["variant"];
}

export function FullScreenSpinner({
    loading = true,
    text = "Loading...",
    size = "xl",
    variant = "aperture",
}: FullScreenSpinnerProps) {
    if (!loading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            {/* <div className="bg-card rounded-lg p-8 shadow-xl border border-border"> */}
            <div className="flex flex-col items-center">
                <Spinner size={size} variant={variant} className="text-primary" />
                {text && <p className="mt-4 text-base text-card-foreground">{text}</p>}
            </div>
            {/* </div> */}
        </div>
    );
}

// ============ Inline Spinner ============
export function InlineSpinner({
    size = "sm",
    variant = "default",
    className = "",
}: SpinnerProps) {
    return (
        <span className="inline-flex items-center">
            <Spinner size={size} variant={variant} className={className} />
        </span>
    );
}

// ============ Card Spinner Overlay ============
interface CardSpinnerProps {
    loading?: boolean;
    text?: string;
    children: React.ReactNode;
    variant?: SpinnerProps["variant"];
}

export function CardWithSpinner({
    loading = false,
    text,
    children,
    variant = "default",
}: CardSpinnerProps) {
    return (
        <div className="relative">
            {children}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-(--card)/80 backdrop-blur-sm rounded-lg">
                    <div className="flex flex-col items-center">
                        <Spinner size="lg" variant={variant} className="text-primary" />
                        {text && (
                            <p className="mt-3 text-sm text-muted-foreground">{text}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
