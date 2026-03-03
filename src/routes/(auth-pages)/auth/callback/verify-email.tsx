import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import authClient from "@/lib/auth/auth-client";
import { InlineSpinner } from "@/components/shared/Spinner"
import { ROUTES } from "@/constants";

type RouterInstance = ReturnType<typeof useRouter>;
type NavigateArgs = Parameters<RouterInstance["navigate"]>[0];
type To = NavigateArgs["to"];

export const Route = createFileRoute("/(auth-pages)/auth/callback/verify-email")({
    component: VerifyEmailComponent,
    validateSearch: (search: Record<string, unknown>) => {
        return {
            token: (search.token as string) || "",
            callbackURL: (search.callbackURL as string) || ROUTES.LOGIN,
        };
    },
});

function VerifyEmailComponent() {
    const router = useRouter();
    const { token, callbackURL } = Route.useSearch();
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
    const [errorMessage, setErrorMessage] = useState<string>("");

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const verifyEmailWithToken = async () => {
            if (!token) {
                setStatus("error");
                setErrorMessage("No verification token provided in URL");
                return;
            }

            try {
                const result = await authClient.verifyEmail({
                    query: {
                        token: token,
                    },
                });

                if (result.error) {
                    throw new Error(result.error.message || "Verification failed");
                }

                setStatus("success");

                // Redirect after success
                timeoutId = setTimeout(() => {
                    router.navigate({ to: callbackURL as To });
                }, 2000);
            } catch (error) {
                console.error("Email verification error:", error);
                setStatus("error");
                setErrorMessage(
                    error instanceof Error ? error.message : "Failed to verify email. The link may be expired."
                );
            }
        };

        verifyEmailWithToken();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [token, router, callbackURL]);

    return (
        <div className="flex flex-col items-center justify-center space-y-6 p-8 bg-card rounded-lg shadow-lg">
            {status === "verifying" && (
                <>
                    <InlineSpinner size="xl" className="text-primary" />
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold">Verifying your email...</h2>
                        <p className="text-muted-foreground">Please wait while we verify your email address.</p>
                    </div>
                </>
            )}

            {status === "success" && (
                <>
                    <div className="rounded-full bg-green-500/10 p-4">
                        <svg
                            className="h-16 w-16 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold">Email verified!</h2>
                        <p className="text-muted-foreground">
                            Your email has been successfully verified. Redirecting you now...
                        </p>
                    </div>
                </>
            )}

            {status === "error" && (
                <>
                    <div className="rounded-full bg-red-500/10 p-4">
                        <svg
                            className="h-16 w-16 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </div>
                    <div className="text-center space-y-3">
                        <h2 className="text-2xl font-bold">Verification failed</h2>
                        <p className="text-muted-foreground max-w-md">{errorMessage}</p>
                        <div className="flex gap-3 justify-center pt-2">
                            <button
                                onClick={() => router.navigate({ to: ROUTES.SIGNUP })}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                            >
                                Sign Up Again
                            </button>
                            <button
                                onClick={() => router.navigate({ to: ROUTES.LOGIN })}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                            >
                                Go to Login
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
