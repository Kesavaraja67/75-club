"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Sparkles } from "lucide-react";
import { fetchSubscriptionStatus } from "@/lib/subscription";
import UpgradeDialog from "@/components/subscription/UpgradeDialog";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "Can I bunk today?",
  "What's my overall attendance?",
  "Which subject can I safely skip?",
  "How many classes can I miss?",
  "Am I at risk of detention?",
];

export default function AIBuddyPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isProUser, setIsProUser] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Check auth and Pro status
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { isProUser: isPro } = await fetchSubscriptionStatus(user.id, supabase);
      setIsProUser(isPro);
      setCheckingAuth(false);

      // Add welcome message
      if (isPro) {
        setMessages([{
          role: "assistant",
          content: "Hey! 👋 I'm your AI Buddy. Ask me anything about your attendance, and I'll help you make smart bunking decisions! 😎",
          timestamp: new Date(),
        }]);
      }
    };

    checkAccess();
  }, [router, supabase]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Call API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      // Add AI response
      const aiMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again! 😅",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

  // Show upgrade prompt for free users
  if (!isProUser) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-8 text-center border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-16 w-16 text-yellow-500" />
          </div>
          <h2 className="text-3xl font-black mb-4">AI Buddy is Pro Only! 🤖</h2>
          <p className="text-gray-600 mb-6 text-lg">
            Get personalized attendance advice from your AI assistant. Upgrade to Pro to unlock this feature!
          </p>
          <Button
            onClick={() => setShowUpgrade(true)}
            className="font-bold text-lg px-8 py-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
          >
            Upgrade to Pro
          </Button>
        </Card>
        <UpgradeDialog
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          feature="AI Buddy"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-black flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-yellow-500" />
          AI Buddy
        </h1>
        <p className="text-gray-600">Your smart attendance assistant</p>
      </div>

      {/* Quick Prompts */}
      {messages.length === 1 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2 font-medium">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleQuickPrompt(prompt)}
                className="border-2 border-black rounded-xl hover:bg-gray-100 font-medium"
                disabled={loading}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <Card className="flex-1 overflow-y-auto p-4 mb-4 border-2 border-black">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-black border-2 border-black"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none [&>p]:my-0 [&>p]:leading-relaxed [&_strong]:font-bold [&_em]:italic">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 border-2 border-black rounded-2xl px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !loading && sendMessage(input)}
          placeholder="Ask me anything about your attendance..."
          disabled={loading}
          className="border-2 border-black rounded-xl focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black"
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
