"use client";

import * as React from "react";
import * as R from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = R.Root;
export const DropdownMenuTrigger = R.Trigger;

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof R.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <R.Portal>
    <R.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[12rem] overflow-hidden rounded-2xl border bg-white p-1 text-sm shadow-lg",
        className
      )}
      {...props}
    />
  </R.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof R.Label>
>(({ className, ...props }, ref) => (
  <R.Label ref={ref} className={cn("px-3 py-2 text-xs text-zinc-500", className)} {...props} />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof R.Separator>
>(({ className, ...props }, ref) => (
  <R.Separator ref={ref} className={cn("my-1 h-px bg-zinc-200", className)} {...props} />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof R.Item>
>(({ className, ...props }, ref) => (
  <R.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 outline-none hover:bg-zinc-100",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";
