"use client";

import * as React from "react";
import { Dialog } from "radix-ui";
import { useTambo } from "@tambo-ai/react";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type { messageVariants } from "@/components/tambo/message";
import {
  MessageInput,
  MessageInputTextarea,
  MessageInputToolbar,
  MessageInputSubmitButton,
  MessageInputError,
  MessageInputFileButton,
  MessageInputMcpPromptButton,
  MessageInputMcpResourceButton,
} from "@/components/tambo/message-input";
import {
  ThreadContent,
  ThreadContentMessages,
} from "@/components/tambo/thread-content";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";

export interface ControlBarProps extends React.HTMLAttributes<HTMLDivElement> {
  hotkey?: string;
  variant?: VariantProps<typeof messageVariants>["variant"];
}

export const ControlBar = React.forwardRef<HTMLDivElement, ControlBarProps>(
  ({ className, hotkey = "mod+k", variant, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    // Gate rendering until after hydration to prevent Radix aria-controls mismatch
    const [mounted, setMounted] = React.useState(false);
    const isMac =
      typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");
    const { thread } = useTambo();

    React.useEffect(() => {
      setMounted(true);
    }, []);

    React.useEffect(() => {
      const down = (e: KeyboardEvent) => {
        const [modifier, key] = hotkey.split("+");
        const isModifierPressed =
          modifier === "mod" ? e.metaKey || e.ctrlKey : false;
        if (e.key === key && isModifierPressed) {
          e.preventDefault();
          setOpen((open) => !open);
        }
      };
      document.addEventListener("keydown", down);
      return () => document.removeEventListener("keydown", down);
    }, [hotkey, setOpen]);

    // Don't render Dialog until after hydration — prevents Radix
    // generating mismatched aria-controls IDs on server vs client
    if (!mounted) return null;

    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          {/* Bottom-LEFT to avoid overlapping MTC which is bottom-right */}
          <button
            className="fixed top-4 right-4 z-30 bg-background/50 backdrop-blur-sm border rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
            suppressHydrationWarning
          >
            Talk to AI (
            <span suppressHydrationWarning>
              {hotkey.replace("mod", isMac ? "⌘" : "Ctrl")}
            </span>
            )
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content
            ref={ref}
            className={cn(
              "fixed top-1/4 left-1/2 -translate-x-1/2 w-[440px] rounded-lg shadow-lg transition-all duration-200 outline-none z-50",
              className,
            )}
            {...props}
          >
            <Dialog.Title className="sr-only">Control Bar</Dialog.Title>
            <div className="flex flex-col gap-3">
              <div className="bg-background border rounded-lg p-3 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <MessageInput>
                    <MessageInputTextarea />
                    <MessageInputToolbar>
                      <MessageInputFileButton />
                      <MessageInputMcpPromptButton />
                      <MessageInputMcpResourceButton />
                      <MessageInputSubmitButton />
                    </MessageInputToolbar>
                    <MessageInputError />
                  </MessageInput>
                </div>
              </div>
              {thread?.messages && thread.messages.length > 0 && (
                <ScrollableMessageContainer className="bg-background border rounded-lg p-4 max-h-[500px]">
                  <ThreadContent variant={variant}>
                    <ThreadContentMessages />
                  </ThreadContent>
                </ScrollableMessageContainer>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  },
);
ControlBar.displayName = "ControlBar";