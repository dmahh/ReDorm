import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { Inbox, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatDialog, type ChatTarget } from "@/components/chat-dialog";
import { useVerify } from "@/components/verify-dialog";
import { listInbox } from "@/lib/redorm.functions";
import { toSession, useStudent } from "@/lib/student-session";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Messages — ReDorm" },
      { name: "description", content: "Your conversations with students about dorm items." },
      { property: "og:title", content: "Messages — ReDorm" },
      { property: "og:description", content: "Chat with buyers and sellers on campus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const stored = useStudent();
  const { openVerify, handleAuthError } = useVerify();
  const fetchInbox = useServerFn(listInbox);
  const [chat, setChat] = useState<ChatTarget | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inbox", stored?.student.id],
    enabled: !!stored,
    refetchInterval: 8000,
    queryFn: async () => {
      try {
        return await fetchInbox({ data: { session: toSession(stored!) } });
      } catch (err) {
        handleAuthError(err);
        throw err;
      }
    },
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Messages</h1>
        <p className="mt-1 text-muted-foreground">Chats with buyers and sellers about your items.</p>

        <div className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-card">
          {stored === undefined || (stored && isLoading) ? (
            <div className="flex justify-center p-12 text-muted-foreground">
              <Loader2 className="animate-spin" />
            </div>
          ) : !stored ? (
            <Empty
              title="Verify to see your messages"
              body="Messages are tied to your student email."
              action={<Button onClick={openVerify}>Verify my .edu email</Button>}
            />
          ) : !data?.length ? (
            <Empty
              title="No conversations yet"
              body="Tap “Contact” on any listing to message the seller."
              action={
                <Button asChild>
                  <Link to="/feed">Browse items</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {data.map((t) => (
                <li key={`${t.itemId}:${t.otherId}`}>
                  <button
                    onClick={() =>
                      setChat({
                        itemId: t.itemId,
                        itemTitle: t.itemTitle,
                        itemPhoto: t.itemPhoto,
                        otherId: t.otherId,
                        otherName: t.otherName,
                        otherDorm: t.otherDorm,
                      })
                    }
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface"
                  >
                    {t.itemPhoto ? (
                      <img src={t.itemPhoto} alt="" className="size-12 shrink-0 rounded-lg object-cover" width={48} height={48} />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <MessageCircle className="size-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{t.otherName}</span>
                        {t.iAmSeller && <Badge variant="tag">Your listing</Badge>}
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(t.lastAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{t.itemTitle}</p>
                      <p className="mt-0.5 truncate text-sm">{t.lastMessage}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <ChatDialog target={chat} onClose={() => setChat(null)} />
    </div>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <Inbox className="size-10 text-muted-foreground" />
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}
