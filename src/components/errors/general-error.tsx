import { useNavigate, useRouter } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface GeneralErrorProps {
  error?: unknown;
  isRoot?: boolean;
  message?: string;
  className?: string;
}

export function GeneralError({
  error,
  isRoot = false,
  message,
  className,
}: GeneralErrorProps) {
  const navigate = useNavigate();
  const router = useRouter();

  const errorMessage = message || (error instanceof Error ? error.message : undefined);
  const isDev = import.meta.env.DEV;

  const errorDetails: string | null = !error
    ? null
    : error instanceof Error
      ? (error.stack ?? error.message)
      : (() => {
        try {
          return JSON.stringify(error, null, 2);
        } catch {
          return String(error);
        }
      })();

  return (
    <div className={cn('h-svh w-full', className)}>
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] leading-tight font-bold">500</h1>
        <span className="font-medium">Oops! Something went wrong {`:')`}</span>
        <p className="text-center text-muted-foreground">
          {errorMessage || (
            <>
              We apologize for the inconvenience. <br />
              Please try again later.
            </>
          )}
        </p>

        {isDev && errorDetails && (
          <details className="mt-4 max-w-2xl rounded-md bg-destructive/10 p-4">
            <summary className="cursor-pointer font-medium text-sm">
              Error Details (Dev Only)
            </summary>
            <pre className="mt-2 text-xs overflow-auto">{errorDetails}</pre>
          </details>
        )}

        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={() => router.invalidate()}>
            Try Again
          </Button>
          {!isRoot && (
            <Button variant="outline" onClick={() => router.history.go(-1)}>
              Go Back
            </Button>
          )}
          <Button onClick={() => navigate({ to: "/" })}>Back to Home</Button>
        </div>
      </div>
    </div>
  );
}
