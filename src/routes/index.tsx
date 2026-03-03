import { LandingPage } from '@/components/landing/LandingPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <LandingPage />
  )
}
