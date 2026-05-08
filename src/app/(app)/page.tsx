import { randomUUID } from "node:crypto";
import { Chat } from "@/components/chat";

export default function NewChatPage() {
  // UUID gerado no servidor (cada navegação pra "/" inicia uma conversa nova).
  // RLS do Supabase impede colisão indireta entre usuários.
  const conversationId = randomUUID();
  return <Chat conversationId={conversationId} isNew />;
}
