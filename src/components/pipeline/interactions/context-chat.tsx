"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/types/pipeline";
import { cn } from "@/lib/utils";

interface ContextChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ContextChat({
  messages,
  onSend,
  isLoading = false,
  placeholder = "Add additional context...",
}: ContextChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="rounded-md border">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="max-h-[120px] overflow-y-auto p-3 space-y-2"
      >
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No messages yet. Type below to add context.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[80%] rounded-lg px-3 py-2 text-sm",
              msg.role === "user"
                ? "ml-auto bg-[var(--pipeline-navy)] text-white"
                : "mr-auto bg-[var(--pipeline-surface)] text-foreground"
            )}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="mr-auto bg-[var(--pipeline-surface)] rounded-lg px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 border-t px-3 py-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={placeholder}
          disabled={isLoading}
          className="h-8 text-sm border-0 shadow-none focus-visible:ring-0"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="h-8 w-8 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
