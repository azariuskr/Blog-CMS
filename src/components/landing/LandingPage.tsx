import { Features } from "./Features"
import { Footer } from "./Footer"
import { Hero } from "./Hero"
import { Navbar } from "./Navbar"

export const LandingPage = () => {
    return (
        <div className="min-h-screen flex flex-col font-sans selection:bg-primary/30">
            <Navbar />
            <main className="flex-1">
                <Hero />
                <Features />
            </main>
            <Footer />
        </div>
    )
}
