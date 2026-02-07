"use client";

import type { messageVariants } from "@/components/tambo/message";
import {
  MessageInput,
  MessageInputError,
  MessageInputFileButton,
  MessageInputMcpPromptButton,
  MessageInputMcpResourceButton,
  MessageInputSubmitButton,
  MessageInputTextarea,
  MessageInputToolbar,
} from "@/components/tambo/message-input";
import {
  MessageSuggestions,
  MessageSuggestionsList,
  MessageSuggestionsStatus,
} from "@/components/tambo/message-suggestions";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";
import {
  ThreadContent,
  ThreadContentMessages,
} from "@/components/tambo/thread-content";
import { ThreadDropdown } from "@/components/tambo/thread-dropdown";
import { cn } from "@/lib/utils";
import { type Suggestion, useTambo } from "@tambo-ai/react";
import { type VariantProps } from "class-variance-authority";
import { XIcon, Loader2 } from "lucide-react";
import { Collapsible } from "radix-ui";
import * as React from "react";

/**
 * Props for the MessageThreadCollapsible component
 */
export interface MessageThreadCollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
  variant?: VariantProps<typeof messageVariants>["variant"];
  height?: string;
  /** @deprecated Use height instead. */
  maxHeight?: string;
}

/**
 * Custom hook — uses ⌘J / Ctrl+J (NOT ⌘K, which is reserved for ControlBar)
 */
const useCollapsibleState = (defaultOpen = false) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");
  const shortcutText = isMac ? "⌘J" : "Ctrl+J";

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ⌘J / Ctrl+J — different from ControlBar's ⌘K
      if ((event.metaKey || event.ctrlKey) && event.key === "j") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { isOpen, setIsOpen, shortcutText };
};

interface CollapsibleContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const CollapsibleContainer = React.forwardRef<
  HTMLDivElement,
  CollapsibleContainerProps
>(({ className, isOpen, onOpenChange, children, ...props }, ref) => (
  <Collapsible.Root
    ref={ref}
    open={isOpen}
    onOpenChange={onOpenChange}
    className={cn(
      // Positioned bottom-right but ABOVE the ControlBar pill (bottom-14 instead of bottom-4)
      "fixed bottom-14 right-4 w-full max-w-sm sm:max-w-md md:max-w-lg rounded-lg shadow-lg bg-background border border-border z-40",
      "transition-all duration-300 ease-in-out",
      className,
    )}
    {...props}
  >
    {children}
  </Collapsible.Root>
));
CollapsibleContainer.displayName = "CollapsibleContainer";

interface CollapsibleTriggerProps {
  isOpen: boolean;
  shortcutText: string;
  onClose: () => void;
  onThreadChange: () => void;
  threadLoading: boolean;
  config: {
    labels: {
      openState: string;
      closedState: string;
    };
  };
}

const CollapsibleTrigger = ({
  isOpen,
  shortcutText,
  onClose,
  onThreadChange,
  threadLoading,
  config,
}: CollapsibleTriggerProps) => (
  <>
    {!isOpen && (
      <Collapsible.Trigger asChild>
        <button
          className={cn(
            "flex items-center justify-between w-full p-4",
            "hover:bg-muted/50 transition-colors",
          )}
          aria-expanded={isOpen}
          aria-controls="message-thread-content"
        >
          <span>{config.labels.closedState}</span>
          <span
            className="text-xs text-muted-foreground pl-8"
            suppressHydrationWarning
          >
            {`(${shortcutText})`}
          </span>
        </button>
      </Collapsible.Trigger>
    )}
    {isOpen && (
      <div className="flex items-center justify-between w-full p-4">
        <div className="flex items-center gap-2">
          <span>{config.labels.openState}</span>
          <ThreadDropdown onThreadChange={onThreadChange} />
          {threadLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <button
          className="p-1 rounded-full hover:bg-muted/70 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    )}
  </>
);
CollapsibleTrigger.displayName = "CollapsibleTrigger";

export const MessageThreadCollapsible = React.forwardRef<
  HTMLDivElement,
  MessageThreadCollapsibleProps
>(
  (
    { className, defaultOpen = false, variant, height, maxHeight, ...props },
    ref,
  ) => {
    const { isOpen, setIsOpen, shortcutText } =
      useCollapsibleState(defaultOpen);

    const { thread } = useTambo();

    // Track thread loading — when thread is null/undefined or switching
    const [threadLoading, setThreadLoading] = React.useState(false);
    const prevThreadId = React.useRef<string | null>(null);

    React.useEffect(() => {
      const currentId = thread?.id ?? null;

      if (prevThreadId.current !== null && currentId !== prevThreadId.current) {
        // Thread is switching
        setThreadLoading(true);
      }

      if (currentId) {
        // Thread loaded
        setThreadLoading(false);
      }

      prevThreadId.current = currentId;
    }, [thread?.id]);

    const effectiveHeight = height ?? maxHeight;

    const handleThreadChange = React.useCallback(() => {
      setThreadLoading(true);
      setIsOpen(true);
    }, [setIsOpen]);

    const THREAD_CONFIG = {
      labels: {
        openState: "Conversations",
        closedState: "Start chatting with tambo",
      },
    };

    const defaultSuggestions: Suggestion[] = [
      {
        id: "suggestion-1",
        title: "Get started",
        detailedSuggestion: "What can you help me with?",
        messageId: "welcome-query",
      },
      {
        id: "suggestion-2",
        title: "Learn more",
        detailedSuggestion: "Tell me about your capabilities.",
        messageId: "capabilities-query",
      },
      {
        id: "suggestion-3",
        title: "Examples",
        detailedSuggestion: "Show me some example queries I can try.",
        messageId: "examples-query",
      },
    ];

    return (
      <CollapsibleContainer
        ref={ref}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        className={className}
        {...props}
      >
        <CollapsibleTrigger
          isOpen={isOpen}
          shortcutText={shortcutText}
          onClose={() => setIsOpen(false)}
          onThreadChange={handleThreadChange}
          threadLoading={threadLoading}
          config={THREAD_CONFIG}
        />
        <Collapsible.Content>
          <div
            className={cn("flex flex-col", effectiveHeight ? "" : "h-[80vh]")}
            style={effectiveHeight ? { height: effectiveHeight } : undefined}
          >
            {/* Thread loading indicator */}
            {threadLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading thread...</span>
              </div>
            )}

            {/* Message thread content — only render when not loading */}
            {!threadLoading && (
              <ScrollableMessageContainer className="p-4">
                <ThreadContent variant={variant}>
                  <ThreadContentMessages />
                </ThreadContent>
              </ScrollableMessageContainer>
            )}

            <MessageSuggestions>
              <MessageSuggestionsStatus />
            </MessageSuggestions>

            <div className="p-4">
              <MessageInput>
                <MessageInputTextarea placeholder="Type your message or paste images..." />
                <MessageInputToolbar>
                  <MessageInputFileButton />
                  <MessageInputMcpPromptButton />
                  <MessageInputMcpResourceButton />
                  <MessageInputSubmitButton />
                </MessageInputToolbar>
                <MessageInputError />
              </MessageInput>
            </div>

            <MessageSuggestions initialSuggestions={defaultSuggestions}>
              <MessageSuggestionsList />
            </MessageSuggestions>
          </div>
        </Collapsible.Content>
      </CollapsibleContainer>
    );
  },
);
MessageThreadCollapsible.displayName = "MessageThreadCollapsible";