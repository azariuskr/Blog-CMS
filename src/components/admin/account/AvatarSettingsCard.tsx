import { AvatarUpload } from "@/components/File/AvatarUpload";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/hooks/auth-hooks";

export function AvatarSettingsCard() {
	const { data: session } = useSession();
	const user = session?.user;

	if (!user) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Profile Picture</CardTitle>
				<CardDescription>
					Upload a profile picture to personalize your account
				</CardDescription>
			</CardHeader>
			<CardContent>
				<AvatarUpload
					currentAvatar={user.image}
					userName={user.name}
					size="xl"
				/>
			</CardContent>
		</Card>
	);
}
