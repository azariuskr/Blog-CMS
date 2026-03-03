import { ROUTES } from "@/constants"
import { AuthView } from "@daveyplate/better-auth-ui"
import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/(auth-pages)/auth/$authView")({
  component: RouteComponent
})

function RouteComponent() {
  const { authView } = Route.useParams()

  return (
    <>
      <AuthView
        pathname={authView}
        classNames={{
          title: "text-center font-extrabold tracking-tight text-2xl"
        }}
      />
      {!["callback", "sign-out"].includes(authView) && (
        <p className="mx-auto max-w-xs text-center text-muted-foreground text-xs">
          By continuing, you agree to our{" "}
          <Link className="text-warning underline" to={ROUTES.TERMS} target="_blank">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="text-warning underline" to={ROUTES.PRIVACY} target="_blank">
            Privacy Policy
          </Link>
          .
        </p>
      )}
    </>
  )
}
