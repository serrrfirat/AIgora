"use client";

import { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
}

interface ChatWindowProps {
  marketId: bigint;
  initialMessages?: ChatMessage[];
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function sortMessagesByTimestamp(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // Sort in descending order (newest first)
  });
}

const INITIAL_RETRY_DELAY = 2000; // Start with 2 seconds
const MAX_RETRY_DELAY = 30000; // Max delay of 30 seconds
const MAX_RETRIES = 5; // Maximum number of retries before giving up

export function ChatWindow({
  marketId,
  initialMessages = [],
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    sortMessagesByTimestamp(initialMessages)
  );
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const retryDelay = useRef(INITIAL_RETRY_DELAY);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Initial fetch of messages
  const fetchMessages = async () => {
    try {
      console.log(
        "[MiniChatWindow] Fetching messages for market:",
        marketId.toString()
      );
      const response = await fetch(`/api/chat/${marketId}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "X-Request-Time": Date.now().toString(),
        },
        cache: "no-store",
      });

      if (response.status === 404) {
        console.log(
          `[MiniChatWindow] 404 for market ${marketId}, attempt ${
            retryCount.current + 1
          }/${MAX_RETRIES}`
        );

        if (retryCount.current < MAX_RETRIES) {
          retryDelay.current = Math.min(
            retryDelay.current * 2,
            MAX_RETRY_DELAY
          );
          retryCount.current++;
          reconnectTimeoutRef.current = setTimeout(
            fetchMessages,
            retryDelay.current
          );
          setError(
            `No messages found. Retrying in ${
              retryDelay.current / 1000
            } seconds...`
          );
          return;
        } else {
          throw new Error("Max retries reached. Messages not found.");
        }
      }

      if (!response.ok) {
        console.error(
          "[MiniChatWindow] HTTP error from API:",
          response.status,
          response.statusText
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if ("error" in data) {
        console.error("[MiniChatWindow] API returned error:", data.error);
        throw new Error(data.error);
      }

      console.log("[MiniChatWindow] Received messages:", data);
      setMessages(sortMessagesByTimestamp(data));
      setError(null);

      // Reset retry counters on successful fetch
      retryCount.current = 0;
      retryDelay.current = INITIAL_RETRY_DELAY;

      // Initialize WebSocket connection after successful fetch
      initializeWebSocket();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch messages";
      console.error("[MiniChatWindow] Error fetching messages:", errorMessage);
      setError(errorMessage);

      if (retryCount.current < MAX_RETRIES) {
        reconnectTimeoutRef.current = setTimeout(
          fetchMessages,
          INITIAL_RETRY_DELAY
        );
      }
    }
  };

  const initializeWebSocket = () => {
    const coordinatorUrl = process.env.NEXT_PUBLIC_COORDINATOR_URL;
    if (!coordinatorUrl) {
      console.error("[MiniChatWindow] NEXT_PUBLIC_COORDINATOR_URL is not set");
      return;
    }

    // Get the host from coordinator URL and use port 3004
    const wsHost = new URL(coordinatorUrl).hostname;
    const ws = new WebSocket(`ws://${wsHost}:3004/${marketId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(
        `[MiniChatWindow] WebSocket connected for market ${marketId}`
      );
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const newMessage = JSON.parse(event.data) as ChatMessage;
        setMessages((prevMessages) =>
          sortMessagesByTimestamp([...prevMessages, newMessage])
        );
      } catch (err) {
        console.error("[MiniChatWindow] Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = (event) => {
      console.error("[MiniChatWindow] WebSocket error:", event);
      setError("Connection error. Attempting to reconnect...");
    };

    ws.onclose = () => {
      console.log(
        "[MiniChatWindow] WebSocket closed. Attempting to reconnect..."
      );
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(
        initializeWebSocket,
        INITIAL_RETRY_DELAY
      );
    };
  };

  useEffect(() => {
    setMounted(true);
    return () => {
      // Cleanup WebSocket and timeouts on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Reset state when marketId changes
    retryCount.current = 0;
    retryDelay.current = INITIAL_RETRY_DELAY;
    setError(null);

    // Close existing WebSocket if any
    if (wsRef.current) {
      wsRef.current.close();
    }
    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    fetchMessages();

    // Cleanup on unmount or marketId change
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [marketId]);

  if (!mounted) {
    return (
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          {sortMessagesByTimestamp(initialMessages).map((message) => (
            <div key={message.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[#CCAA00]">
                  {message.sender}
                </p>
                <Badge
                  variant="outline"
                  className="px-2 py-0.5 text-xs bg-[#FAF9F6]/5 text-[#FAF9F6] border-[#FAF9F6]/20"
                >
                  {message.sender}
                </Badge>
              </div>
              <Card className="bg-[#52362B]/80 border border-[#FAF9F6]/10 shadow-lg">
                <div className="p-3">
                  <p className="text-sm text-[#FAF9F6]/90 whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {error && (
          <Card className="bg-red-900/20 border-red-500/20">
            <div className="p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </Card>
        )}
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="px-2 py-0.5 text-xs bg-[#FAF9F6]/5 text-[#FAF9F6] border-[#FAF9F6]/20 hover:bg-[#FAF9F6]/10 transition-colors"
              >
                {message.sender}
              </Badge>
              <span className="text-xs text-[#FAF9F6]/50">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            <Card className="bg-[#52362B]/80 border border-[#FAF9F6]/10 shadow-lg hover:border-[#FAF9F6]/20 transition-all">
              <div className="p-3">
                <p className="text-sm text-[#FAF9F6]/90 whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
