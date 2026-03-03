import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { SignedIn, SignedOut, UserButton } from '@daveyplate/better-auth-ui'
import { useNavigate } from '@tanstack/react-router'
import {
    LayoutDashboard,
    Zap,
} from 'lucide-react'
import { ROUTES } from "@/constants"

export const Navbar = ({ ...props }) => {
    const navigate = useNavigate();
    const userButtonSize = props.buttonSize;
    return (
        <nav className="sticky top-0 z-50 w-full glass-nav">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <a
                    href="#"
                    className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary"
                >
                    <div className="bg-primary text-primary-foreground p-1 rounded-md">
                        <Zap size={20} fill="currentColor" strokeWidth={0} />
                    </div>
                    <span className="bg-clip-text text-transparent bg-linear-to-r from-primary to-accent-foreground">
                        TanStack Start
                    </span>
                </a>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <div className="h-6 w-px bg-border mx-1" />
                    <SignedOut>
                        <Button onClick={() => navigate({ to: ROUTES.LOGIN })} variant="ghost" size="sm">
                            Log in
                        </Button>
                        <Button onClick={() => navigate({ to: ROUTES.SIGNUP })} size="sm" className="shadow-lg shadow-primary/20">
                            Get Started
                        </Button>
                    </SignedOut>
                    <SignedIn>
                        <UserButton size={userButtonSize ?? "icon"} additionalLinks={[
                            {
                                href: "/dashboard",
                                label: "Dashboard",
                                icon: <LayoutDashboard size={16} />,
                            },
                        ]}
                        />
                    </SignedIn>
                </div>
            </div>
        </nav>
    )
}
