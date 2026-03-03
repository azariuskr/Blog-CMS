import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import React from "react";

export interface ActionMenuItem {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
    variant?: "default" | "destructive";
    separator?: boolean;
}

export interface ActionMenuGroup {
    label?: string;
    items: ActionMenuItem[];
}

interface BaseActionMenuProps {
    groups: ActionMenuGroup[];
    align?: "start" | "center" | "end";
    disabled?: boolean;
}

export function BaseActionMenu({ groups, align = "end", disabled }: BaseActionMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={
                <Button variant="ghost" size="icon" disabled={disabled}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                </Button>
            }>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align}>
                {groups.map((group, groupIndex) => (
                    <DropdownMenuGroup key={groupIndex}>
                        {group.label && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
                        {group.label && <DropdownMenuSeparator />}
                        {group.items.map((item, itemIndex) => (
                            <React.Fragment key={itemIndex}>
                                {item.separator && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                    onClick={item.onClick}
                                    disabled={item.disabled}
                                    className={item.variant === "destructive" ? "text-destructive focus:text-destructive" : undefined}
                                >
                                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                    {item.label}
                                </DropdownMenuItem>
                            </React.Fragment>
                        ))}
                    </DropdownMenuGroup>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
