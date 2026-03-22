import { Button } from '@/components/ui/button'
import { SignedIn, SignedOut } from '@daveyplate/better-auth-ui'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { ROUTES } from "@/constants"
import { useHasCapability } from "@/hooks/auth-hooks"

export const Hero = () => {
    const navigate = useNavigate();
    const canAccessAdmin = useHasCapability("canAccessAdmin");

    return (
        <section className="relative pt-20 pb-32 overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 bg-grid z-[-1]" />
            <div className="absolute top-[-20%] left-[20%] w-125 h-125 bg-primary/20 rounded-full blur-[100px] animate-blob z-[-1]" />
            <div className="absolute top-[20%] right-[10%] w-100 h-100 bg-accent/10 rounded-full blur-[100px] animate-blob animation-delay-2000 z-[-1]" />

            <div className="container mx-auto px-4 text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-6 animate-fade-in">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    v1.0 is now available
                </div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 animate-slide-up">
                    The Future of <br />
                    <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-blue-400 to-purple-500">
                        Full Stack React
                    </span>
                </h1>

                <p
                    className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up"
                    style={{ animationDelay: '0.1s' }}
                >
                    Build type-safe, server-side rendered applications with a developer
                    experience designed for the modern web.
                </p>

                <div
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
                    style={{ animationDelay: '0.2s' }}
                >
                    <SignedOut>
                        <Button onClick={() => navigate({ to: ROUTES.SIGNUP })} size="lg" className="h-12 px-8 text-base group">
                            Get Started
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                        <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                            Documentation
                        </Button>
                    </SignedOut>

                    <SignedIn>
                        {canAccessAdmin ? (
                            <Button
                                onClick={() => navigate({ to: ROUTES.DASHBOARD as string })}
                                size="lg"
                                className="h-12 px-8 text-base bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            >
                                Go to Dashboard
                            </Button>
                        ) : (
                            <Button
                                onClick={() => navigate({ to: ROUTES.ACCOUNT.BASE as string })}
                                size="lg"
                                className="h-12 px-8 text-base bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            >
                                Go to Account
                            </Button>
                        )}
                    </SignedIn>
                </div>

                <div className="mt-12 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                    <p className="text-sm text-muted-foreground font-mono">
                        src/routes/index.tsx
                    </p>
                </div>
            </div>
        </section>
    )
}

