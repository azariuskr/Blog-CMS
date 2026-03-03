import { Link } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Shield } from 'lucide-react'

export const Route = createFileRoute('/cookies')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <main className="min-h-screen bg-background py-10 px-4 md:px-8 transition-colors duration-300">
            <div className="container max-w-4xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/">
                        <button className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back to Home
                        </button>
                    </Link>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                            <Shield className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                                Cookie Policy
                            </h1>
                        </div>
                    </div>

                    <div className="h-px w-full bg-border" />
                </div>
                {/* Main Content Card */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <div className="p-6 md:p-8 space-y-10">
                        {/* Intro */}
                        <section className="space-y-4">
                            <p className="text-lg leading-7 text-muted-foreground">
                                At Better Auth Starter, we use cookies to enhance your experience, personalize content, and analyze website traffic. Cookies help us understand how visitors interact with our platform, enabling us to improve our services and ensure a safer, more efficient experience for you.

                                By using our website, you consent to our use of cookies in accordance with this policy. You can manage your cookie preferences through your browser settings at any time. Please note that disabling cookies may affect some functionalities of our platform, and certain features might not work as intended.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    )
}
