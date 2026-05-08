"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type ChatProps = {
  conversationId: string;
  initialMessages?: UIMessage[];
  isNew: boolean;
};

export function Chat({ conversationId, initialMessages, isNew }: ChatProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId },
      }),
    [conversationId],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    id: conversationId,
    transport,
    messages: initialMessages,
  });

  const [input, setInput] = useState("");
  const [hasSent, setHasSent] = useState(!isNew);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
  }, [input]);

  // Quando o usuário envia a primeira mensagem em /, sobe a URL pra /c/<id>
  // sem reload, pra ele poder dar refresh e cair na conversa certa.
  useEffect(() => {
    if (isNew && hasSent && typeof window !== "undefined") {
      const newPath = `/c/${conversationId}`;
      if (window.location.pathname !== newPath) {
        window.history.replaceState(null, "", newPath);
      }
    }
  }, [isNew, hasSent, conversationId]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
    setHasSent(true);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          {isEmpty ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <h1 className="text-3xl font-medium tracking-tight text-zinc-900 sm:text-4xl">
                Como posso ajudar hoje?
              </h1>
              <p className="mt-3 max-w-md text-sm text-zinc-500">
                Advisor de marketing e negócios da Brasa Nobre. Direto, prático,
                e sem inventar.
              </p>
            </div>
          ) : (
            <div className="space-y-6 py-8">
              {messages.map((m) => (
                <Message key={m.id} message={m} />
              ))}
              {status === "submitted" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500">
                    pensando…
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
          {error && (
            <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error.message || "Erro ao consultar o advisor."}
            </div>
          )}
          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3 focus-within:border-zinc-400 focus-within:bg-white"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e as unknown as FormEvent);
                }
              }}
              rows={1}
              placeholder="Pergunte ao advisor…"
              className="flex-1 resize-none bg-transparent text-sm leading-6 placeholder:text-zinc-400 focus:outline-none"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
              >
                parar
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:bg-zinc-300"
              >
                enviar
              </button>
            )}
          </form>
          <p className="mt-2 text-center text-[11px] text-zinc-400">
            Uso interno Brasa Nobre. O advisor pode errar; confira números e
            datas.
          </p>
        </div>
      </div>
    </div>
  );
}

function Message({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter(
      (p): p is { type: "text"; text: string } =>
        p.type === "text" && typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join("");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm text-white"
            : "max-w-[85%] whitespace-pre-wrap text-sm leading-6 text-zinc-800"
        }
      >
        {text}
      </div>
    </div>
  );
}
