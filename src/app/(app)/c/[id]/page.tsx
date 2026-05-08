import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { Chat } from "@/components/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ConversationPage(
  props: PageProps<"/c/[id]">,
) {
  const { id } = await props.params;

  const supabase = await createSupabaseServerClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) notFound();

  const { data: rows } = await supabase
    .from("messages")
    .select("id, role, content")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const initialMessages: UIMessage[] = (rows ?? []).map((r) => ({
    id: r.id,
    role: r.role as UIMessage["role"],
    parts: [{ type: "text", text: r.content }],
  }));

  return (
    <Chat
      conversationId={id}
      initialMessages={initialMessages}
      isNew={false}
    />
  );
}
