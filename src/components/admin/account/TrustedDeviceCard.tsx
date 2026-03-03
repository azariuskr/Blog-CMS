import { ActionButton } from "@/components/action-button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useClearTrustedDevice } from "@/hooks/user-actions";

function TrustedDeviceCard() {
	const mutation = useClearTrustedDevice();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Trusted device</CardTitle>
				<CardDescription>
					If you previously selected “Trust this device” during 2FA, you can
					clear it here so the next login requires 2FA again on this browser.
				</CardDescription>
			</CardHeader>
			<CardFooter className="justify-end">
				<ActionButton
					mutation={mutation}
					requireAreYouSure
					areYouSureDescription="You will be asked for 2FA again on this device."
				>
					Forget trusted device
				</ActionButton>
			</CardFooter>
		</Card>
	);
}

export default TrustedDeviceCard;
