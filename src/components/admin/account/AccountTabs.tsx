import {
    AccountSettingsCards,
    SecuritySettingsCards,
    UpdateAvatarCard,
} from "@daveyplate/better-auth-ui";
import TrustedDeviceCard from "@/components/admin/account/TrustedDeviceCard";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { AvatarSettingsCard } from "./AvatarSettingsCard";

type ComingSoonProps = { title: string; description: string };

export function SettingsTab() {
    return (
        <div className="space-y-6">
            {/* <AvatarSettingsCard />
            <UpdateAvatarCard
                classNames={{
                    base: "border-primary",
                    avatar: {
                        base: "border-4 border-primary",
                        fallback: "bg-primary text-white"
                    },
                    footer: "bg-primary-50"
                }}
            /> */}
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
