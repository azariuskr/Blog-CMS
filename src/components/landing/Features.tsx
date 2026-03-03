import {
    Route as RouteIcon,
    Server,
    Shield,
    Sparkles,
    Waves,
    Zap,
} from 'lucide-react'

type FeatureCardProps = {
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
    title: string
    description: string
}

export const Features = () => {
    const features: FeatureCardProps[] = [
        {
            icon: Zap,
            title: 'Powerful Server Functions',
            description:
                'Write server-side code that seamlessly integrates with your client components. Type-safe, secure, and simple.',
        },
        {
            icon: Server,
            title: 'Flexible Server Side Rendering',
            description:
                'Full-document SSR, streaming, and progressive enhancement out of the box. Control exactly what renders where.',
        },
        {
            icon: RouteIcon,
            title: 'API Routes',
            description:
                'Build type-safe API endpoints alongside your application. No separate backend needed.',
        },
        {
            icon: Shield,
            title: 'Strongly Typed Everything',
            description:
                'End-to-end type safety from server to client. Catch errors before they reach production.',
        },
        {
            icon: Waves,
            title: 'Full Streaming Support',
            description:
                'Stream data from server to client progressively. Perfect for AI applications and real-time updates.',
        },
        {
            icon: Sparkles,
            title: 'Next Generation Ready',
            description:
                'Built from the ground up for modern web applications. Deploy anywhere JavaScript runs.',
        },
    ]

    return (
        <section className="py-24 relative">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-foreground to-muted-foreground">
                        Everything you need to ship
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        A complete toolkit for building full-stack web applications with
                        unmatched developer experience.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    )
}

export const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
    return (
        <div className="group relative glass-card rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative flex flex-col h-full">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <Icon size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    )
}
