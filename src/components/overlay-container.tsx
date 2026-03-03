import { useOverlay, OVERLAY_CONFIG } from "@/lib/store/overlay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function OverlayContainer() {
    const { id, data, close } = useOverlay();

    if (!id) return null;

    const config = OVERLAY_CONFIG[id];

    return (
        <Dialog open={Boolean(id)} onOpenChange={(open) => !open && close()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{id}</DialogTitle>
                    <DialogDescription>
                        {config.type}
                        {config.side ? ` (${config.side})` : ""}
                    </DialogDescription>
                </DialogHeader>
                <pre className="whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </DialogContent>
        </Dialog>
    );
}
