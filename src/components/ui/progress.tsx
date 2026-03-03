import { Progress } from "@base-ui/react/progress";

type Props = {
    label?: string;
    value: number; // 0..100
};

export function ProgressBar({ label = "Uploading", value }: Props) {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));

    return (
        <Progress.Root
            value={clamped}
            className="grid w-48 grid-cols-2 gap-x-1 gap-y-2"
        >
            <Progress.Label className="text-sm font-medium text-gray-900">
                {label}
            </Progress.Label>

            <Progress.Value className="m-0 text-right text-sm text-gray-900" />

            <Progress.Track className="col-span-2 h-1 overflow-hidden rounded bg-gray-200 shadow-[inset_0_0_0_1px_rgb(229_231_235)]">
                <Progress.Indicator className="block h-full bg-gray-500 transition-[width] duration-500" />
            </Progress.Track>
        </Progress.Root>
    );
}
