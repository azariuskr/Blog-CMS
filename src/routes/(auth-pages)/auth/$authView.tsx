import { ROUTES } from "@/constants"
import { AuthView } from "@daveyplate/better-auth-ui"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useEffect } from "react"

const AUTH_VIEW_MAP = {
	login: "SIGN_IN",
	signup: "SIGN_UP",
	"forgot-password": "FORGOT_PASSWORD",
	"reset-password": "RESET_PASSWORD",
	"magic-link": "MAGIC_LINK",
	"verify-email": "EMAIL_VERIFICATION",
	"accept-invitation": "ACCEPT_INVITATION",
	"two-factor": "TWO_FACTOR",
	"email-otp": "EMAIL_OTP",
	logout: "SIGN_OUT",
	callback: "CALLBACK",
} as const

type AuthRouteView = keyof typeof AUTH_VIEW_MAP

export const Route = createFileRoute("/(auth-pages)/auth/$authView")({
	component: RouteComponent,
	beforeLoad: ({ params }) => {
		if (!(params.authView in AUTH_VIEW_MAP)) {
			return {
				authView: "login" as AuthRouteView,
				authUiView: AUTH_VIEW_MAP.login,
			}
		}

		const authView = params.authView as AuthRouteView
		return {
			authView,
			authUiView: AUTH_VIEW_MAP[authView],
		}
	},
})

function RouteComponent() {
	const { authView } = Route.useParams()
	const router = useRouter()

	useEffect(() => {
		if (authView !== "accept-invitation") return

		const params = new URLSearchParams(window.location.search)
		const invitationId = params.get("invitationId") || ""
		const redirectTo = params.get("redirectTo") || ROUTES.ACCOUNT.ORGANIZATIONS

		void router.navigate({
			to: ROUTES.AUTH.CALLBACK.ACCEPT_INVITATION as string,
			search: { invitationId, redirectTo } as never,
			replace: true,
		})
	}, [authView, router])

	if (authView === "accept-invitation") {
		return null
	}

	return (
		<>
			<AuthView
				pathname={authView}
				classNames={{
					title: "text-center font-extrabold tracking-tight text-2xl",
				}}
			/>
			{!["callback", "logout"].includes(authView) && (
				<p className="mx-auto max-w-xs text-center text-xs text-muted-foreground">
					By continuing, you agree to our{" "}
					<a className="text-primary underline underline-offset-2 hover:opacity-80" href={ROUTES.TERMS} target="_blank" rel="noopener noreferrer">
						Terms of Service
					</a>{" "}
					and{" "}
					<a className="text-primary underline underline-offset-2 hover:opacity-80" href={ROUTES.PRIVACY} target="_blank" rel="noopener noreferrer">
						Privacy Policy
					</a>
					.
				</p>
			)}
		</>
	)
}
