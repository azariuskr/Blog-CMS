import * as React from "react";
import { Select as BaseSelect } from "@base-ui/react/select";

type SelectCtx = {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
};

const SelectContext = React.createContext<SelectCtx | null>(null);

function useSelectCtx() {
    const ctx = React.useContext(SelectContext);
    if (!ctx) throw new Error("Select components must be used within <Select>.");
    return ctx;
}

export function Select(props: {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    const { value, onValueChange, disabled, children } = props;

    return (
        <SelectContext.Provider value={{ value, onValueChange, disabled }}>
            <BaseSelect.Root
                value={value ?? null}
                onValueChange={(newValue, _event) => {
                    if (newValue !== null && newValue !== undefined) {
                        const stringValue = String(newValue);
                        onValueChange?.(stringValue);
                    }
                }}
            >
                {children}
            </BaseSelect.Root>
        </SelectContext.Provider>
    );
}

export function SelectGroup(props: React.ComponentPropsWithoutRef<'div'>) {
    return <div data-slot="select-group" {...props} />;
}

export function SelectTrigger(props: React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger> & {
    size?: 'sm' | 'default';
}) {
    const { disabled } = useSelectCtx();
    const { size = 'default', className, children, ...rest } = props;

    return (
        <BaseSelect.Trigger
            {...rest}
            disabled={disabled || props.disabled}
            data-slot="select-trigger"
            data-size={size}
            className={[
                "flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
                "data-placeholder:text-muted-foreground",
                "data-[size=default]:h-9 data-[size=sm]:h-8",
                "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
                "dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40",
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            {children}
            <BaseSelect.Icon render={
                <svg className="size-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                </svg>
            }>
            </BaseSelect.Icon>
        </BaseSelect.Trigger >
    );
}

export function SelectValue(props: { placeholder?: string }) {
    const { value } = useSelectCtx();

    return (
        <span data-slot="select-value" className="flex items-center gap-2 line-clamp-1">
            {value ? (
                <BaseSelect.Value />
            ) : (
                <span className="text-muted-foreground" data-placeholder="true">{props.placeholder ?? ""}</span>
            )}
        </span>
    );
}

export function SelectContent(props: {
    children: React.ReactNode;
    sideOffset?: number;
    side?: "top" | "bottom";
    align?: "start" | "center" | "end";
    position?: "popper" | "item-aligned";
    className?: string;
}) {
    const { sideOffset = 1, side = "bottom", align = "start", position = "popper", className, children } = props;

    return (
        <BaseSelect.Portal>
            <BaseSelect.Positioner
                sideOffset={sideOffset}
                side={side}
                align={align}
                collisionPadding={8}
                className="z-50"
            >
                <BaseSelect.Popup
                    data-slot="select-content"
                    className={[
                        "relative max-h-[--radix-select-content-available-height] min-w-32 overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md",
                        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
                        className,
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
                    <BaseSelect.ScrollUpArrow
                        data-slot="select-scroll-up-button"
                        className="flex cursor-default items-center justify-center py-1"
                    >
                        <svg className="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6" />
                        </svg>
                    </BaseSelect.ScrollUpArrow>
                    <BaseSelect.List className={[
                        "p-1",
                        position === "popper" && "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1"
                    ].filter(Boolean).join(" ")}>
                        {children}
                    </BaseSelect.List>
                    <BaseSelect.ScrollDownArrow
                        data-slot="select-scroll-down-button"
                        className="flex cursor-default items-center justify-center py-1"
                    >
                        <svg className="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </BaseSelect.ScrollDownArrow>
                </BaseSelect.Popup>
            </BaseSelect.Positioner>
        </BaseSelect.Portal>
    );
}

export function SelectLabel(props: React.ComponentPropsWithoutRef<'div'>) {
    const { className, ...rest } = props;
    return (
        <div
            data-slot="select-label"
            className={[
                "px-2 py-1.5 text-xs text-muted-foreground",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...rest}
        />
    );
}

export function SelectItem(
    props: React.ComponentPropsWithoutRef<typeof BaseSelect.Item> & {
        value: string;
        children?: React.ReactNode;
    }
) {
    const { value, children, className, ...rest } = props;
    return (
        <BaseSelect.Item
            {...rest}
            value={value}
            data-slot="select-item"
            className={[
                "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 ps-2 pe-8 text-sm outline-hidden select-none",
                "focus:bg-accent focus:text-accent-foreground",
                "data-disabled:pointer-events-none data-disabled:opacity-50",
                "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
                "*:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <span className="absolute end-2 flex size-3.5 items-center justify-center">
                <BaseSelect.ItemIndicator>
                    <svg className="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                </BaseSelect.ItemIndicator>
            </span>
            <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
        </BaseSelect.Item>
    );
}

export function SelectSeparator(props: React.ComponentPropsWithoutRef<'div'>) {
    const { className, ...rest } = props;
    return (
        <div
            data-slot="select-separator"
            className={[
                "pointer-events-none -mx-1 my-1 h-px bg-border",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...rest}
        />
    );
}
