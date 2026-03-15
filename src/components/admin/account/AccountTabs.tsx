import {
	AccountSettingsCards,
	OrganizationsCard,
	SecuritySettingsCards,
	UserInvitationsCard,
} from "@daveyplate/better-auth-ui";
import { useEffect, useRef, useState } from "react";
import TrustedDeviceCard from "@/components/admin/account/TrustedDeviceCard";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	organization,
	useActiveOrganization,
	useListOrganizations,
} from "@/lib/auth/auth-client";
import { useMyAuthorApplication, useUpsertAuthorProfile } from "@/lib/blog/queries";
import { toast } from "sonner";
import { AvatarUploadCard } from "@/components/admin/account/AvatarUploadCard";

type ComingSoonProps = { title: string; description: string };

export function SettingsTab() {
	return (
		<div className="space-y-6">
			<AvatarUploadCard />
			<AccountSettingsCards />
		</div>
	);
}

export function SecurityTab() {
	return (
		<>
			<TrustedDeviceCard />
			<SecuritySettingsCards />
		</>
	);
}

export function SessionsTab() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Active Sessions</CardTitle>
				<CardDescription>
					Manage your active sessions across devices
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					Session management is available through the Security tab. Use the
					"Active Sessions" section to view and revoke sessions.
				</p>
			</CardContent>
		</Card>
	);
}

export function ComingSoonCard({ title, description }: ComingSoonProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-center py-8 text-muted-foreground">
					Coming soon
				</div>
			</CardContent>
		</Card>
	);
}

export function AppearanceTab() {
	return (
		<ComingSoonCard
			title="Appearance"
			description="Customize the look and feel of the application"
		/>
	);
}

export function NotificationsTab() {
	return (
		<ComingSoonCard
			title="Notifications"
			description="Configure your notification preferences"
		/>
	);
}

export function OrganizationsTab() {
	const { data: activeOrg } = useActiveOrganization();
	const { data: organizations } = useListOrganizations();
	const didSetActiveRef = useRef(false);

	useEffect(() => {
		if (didSetActiveRef.current) return;
		if (activeOrg?.id) return;

		const fallbackOrg = organizations?.[0];
		if (!fallbackOrg?.id) return;

		didSetActiveRef.current = true;
		void organization.setActive({ organizationId: fallbackOrg.id });
	}, [activeOrg?.id, organizations]);

	return (
		<div className="space-y-6">
			<UserInvitationsCard />
			<OrganizationsCard />
		</div>
	);
}

export function AuthorProfileTab() {
	const profileQuery = useMyAuthorApplication();
	const upsert = useUpsertAuthorProfile();
	const profile = profileQuery.data?.ok ? (profileQuery.data.data as any) : null;

	const [form, setForm] = useState({
		username: "",
		displayName: "",
		bio: "",
		website: "",
		location: "",
		twitterHandle: "",
		githubHandle: "",
		linkedinHandle: "",
	});
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		if (profile && !initialized) {
			setForm({
				username: profile.username ?? "",
				displayName: profile.displayName ?? "",
				bio: profile.bio ?? "",
				website: profile.website ?? "",
				location: profile.location ?? "",
				twitterHandle: profile.twitterHandle ?? "",
				githubHandle: profile.githubHandle ?? "",
				linkedinHandle: profile.linkedinHandle ?? "",
			});
			setInitialized(true);
		}
	}, [profile, initialized]);

	const set = (k: keyof typeof form) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			setForm((p) => ({ ...p, [k]: e.target.value }));

	const handleSave = async () => {
		if (!profile?.userId) {
			toast.error("Author profile not found. Complete the 'Become an Author' flow first.");
			return;
		}
		if (!form.username.trim()) {
			toast.error("Username is required.");
			return;
		}
		const result = await upsert.mutateAsync({
			userId: profile.userId,
			username: form.username,
			displayName: form.displayName || undefined,
			bio: form.bio || undefined,
			website: form.website || undefined,
			location: form.location || undefined,
			twitterHandle: form.twitterHandle || undefined,
			githubHandle: form.githubHandle || undefined,
			linkedinHandle: form.linkedinHandle || undefined,
		});
		if (result?.ok) {
			toast.success("Author profile updated.");
		} else {
			toast.error("Failed to update profile.");
		}
	};

	if (profileQuery.isLoading) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">
					Loading…
				</CardContent>
			</Card>
		);
	}

	if (!profile) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Author Profile</CardTitle>
					<CardDescription>
						You don't have an author profile yet.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						To set up your author profile, go to{" "}
						<a href="/dashboard/become-author" className="text-primary hover:underline">
							Become an Author
						</a>
						.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Author Profile</CardTitle>
				<CardDescription>
					Update your public author profile information.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-1.5">
						<Label htmlFor="ap-username">Username *</Label>
						<Input id="ap-username" value={form.username} onChange={set("username")} placeholder="jane_doe" className="font-mono" />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="ap-displayName">Display Name</Label>
						<Input id="ap-displayName" value={form.displayName} onChange={set("displayName")} placeholder="Jane Doe" />
					</div>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="ap-bio">Bio</Label>
					<Textarea id="ap-bio" value={form.bio} onChange={set("bio")} placeholder="Tell readers about yourself…" rows={4} />
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-1.5">
						<Label htmlFor="ap-location">Location</Label>
						<Input id="ap-location" value={form.location} onChange={set("location")} placeholder="San Francisco, CA" />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="ap-website">Website</Label>
						<Input id="ap-website" value={form.website} onChange={set("website")} placeholder="https://…" type="url" />
					</div>
				</div>
				<div className="grid grid-cols-3 gap-3">
					<div className="space-y-1.5">
						<Label htmlFor="ap-twitter">Twitter</Label>
						<Input id="ap-twitter" value={form.twitterHandle} onChange={set("twitterHandle")} placeholder="handle" />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="ap-github">GitHub</Label>
						<Input id="ap-github" value={form.githubHandle} onChange={set("githubHandle")} placeholder="handle" />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="ap-linkedin">LinkedIn</Label>
						<Input id="ap-linkedin" value={form.linkedinHandle} onChange={set("linkedinHandle")} placeholder="handle" />
					</div>
				</div>
				<div className="flex justify-end pt-2">
					<Button onClick={handleSave} disabled={upsert.isPending}>
						{upsert.isPending ? "Saving…" : "Save Profile"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
