"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogPortal(props: DialogPrimitive.DialogPortalProps) {
  return <DialogPrimitive.Portal {...props} />;
}

export const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-[60] bg-black/50 backdrop-blur-[1px]", className)}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
      "fixed left-1/2 top-1/2 z-[70] w-[min(92vw,900px)] -translate-x-1/2 -translate-y-1/2",
      "rounded-2xl border bg-white shadow-xl outline-none",
      "max-h-[85vh] max-w-[92vw] flex flex-col overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Кнопка-крестик (закрыть диалог) */}
      <DialogPrimitive.Close
        className={cn(
          "absolute right-3 top-3 h-8 w-8 rounded-xl text-zinc-500",
          "hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
         )}
        aria-label="Закрыть"
      >
        ×
      </DialogPrimitive.Close>        
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("border-b px-6 py-4", props.className)} {...props} />;
}
export function DialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold", props.className)} {...props} />;
}
export function DialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-zinc-600", props.className)} {...props} />;
}
export function DialogBody(props: React.HTMLAttributes<HTMLDivElement>) {
  // внутренняя прокрутка только у тела
  return <div className={cn("px-6 py-5 flex-1 overflow-auto", props.className)} {...props} />;
}
export function DialogFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t px-6 py-4 flex items-center justify-end gap-2", props.className)} {...props} />;
}
