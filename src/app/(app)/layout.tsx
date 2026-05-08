import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 sm:flex">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <span className="text-sm font-medium tracking-tight">
            Brasa Nobre
          </span>
          <Link
            href="/"
            className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700"
          >
            + nova
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {conversations?.length ? (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/c/${c.id}`}
                    className="block truncate rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200"
                  >
                    {c.title?.trim() || "Conversa sem título"}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-3 text-xs text-zinc-400">
              Nenhuma conversa ainda.
            </p>
          )}
        </nav>
        <div className="border-t border-zinc-200 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-800">
                {profile?.display_name ?? user.email}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {profile?.email ?? user.email}
              </p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs text-zinc-500 hover:text-zinc-900"
              >
                sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-white">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 sm:hidden">
          <span className="text-sm font-medium tracking-tight">
            Brasa Nobre · Advisor
          </span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-xs text-zinc-500">
              sair
            </button>
          </form>
        </header>
        {children}
      </main>
    </div>
  );
}
