import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { buildSystemPrompt } from "@/lib/persona";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = "google/gemini-3-pro-preview";

type ChatBody = {
  messages: UIMessage[];
  conversationId: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response("OPENROUTER_API_KEY não configurada", { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Não autenticado", { status: 401 });
  }

  const { messages, conversationId } = (await req.json()) as ChatBody;

  if (!conversationId || !messages?.length) {
    return new Response("Body inválido: conversationId e messages obrigatórios", {
      status: 400,
    });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? "sócio";

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return new Response("Nenhuma mensagem do usuário", { status: 400 });
  }
  const lastUserText = extractText(lastUserMessage);

  // Garante que a conversa existe (RLS impede criar pra outro user)
  await supabase
    .from("conversations")
    .upsert(
      {
        id: conversationId,
        user_id: user.id,
        title: deriveTitle(lastUserText),
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

  // Salva a mensagem do user (id da UIMessage; idempotente em re-tries)
  await supabase.from("messages").upsert(
    {
      id: lastUserMessage.id,
      conversation_id: conversationId,
      role: "user",
      content: lastUserText,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  const openrouter = createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": "Brasa Nobre Advisor",
    },
  });

  const result = streamText({
    model: openrouter.chat(process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL),
    system: buildSystemPrompt(displayName),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage, isAborted }) => {
      if (isAborted) return;
      const text = extractText(responseMessage);
      if (!text) return;
      await supabase.from("messages").insert({
        id: responseMessage.id,
        conversation_id: conversationId,
        role: "assistant",
        content: text,
      });
    },
  });
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } =>
      p.type === "text" && typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join("");
}

function deriveTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 60) return trimmed;
  return trimmed.slice(0, 57) + "…";
}
