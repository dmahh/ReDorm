import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getConversation, sendMessage } from "@/lib/redorm.functions";
import { toSession, useStudent } from "@/lib/student-session";
import { useVerify } from "@/components/verify-dialog";

export type ChatTarget = {
  itemId: string;
  itemTitle: string;
  itemPhoto?: string | null;
  otherId: string;
  otherName: string;
  otherDorm?: string;
};

export function ChatDialog({ target, onClose }: { target: ChatTarget | null; onClose: () => void }) {
  const stored = useStudent();
  const { handleAuthError } = useVerify();
  const qc = useQueryClient();
  const fetchConvo = useServerFn(getConversation);
  const send = useServerFn(sendMessage);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const key = ["conversation", target?.itemId, target?.otherId, stored?.student.id];
  const { data: messages, isLoading } = useQuery({
    queryKey: key,
    enabled: !!target && !!stored,
    refetchInterval: 4000,
    queryFn: async () => {
      try {
        return await fetchConvo({
          data: { session: toSession(stored!), itemId: target!.itemId, otherId: target!.otherId },
        });
      } catch (err) {
        handleAuthError(err);
        throw err;
      }
    },
  });

  const mutation = useMutation({
    mutationFn: (content: string) =>
      send({ data: { session: toSession(stored!), itemId: target!.itemId, otherId: target!.otherId, content } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["inbox"] });
    },
    onError: (err) => {
      if (!handleAuthError(err)) toast.error(err instanceof Error ? err.message : "Message not sent");
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || mutation.isPending) return;
    mutation.mutate(content);
  }

  const first = target?.otherName.split(" ")[0] ?? "";

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[min(640px,90vh)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4 text-left">
          <div className="flex items-center gap-3">
            {target?.itemPhoto ? (
              <img src={target.itemPhoto} alt="" className="size-11 rounded-lg object-cover" width={44} height={44} />
            ) : null}
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">{target?.otherName}</DialogTitle>
              <DialogDescription className="truncate">
                About “{target?.itemTitle}”{target?.otherDorm ? ` · ${target.otherDorm}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-2 overflow-y-auto bg-surface p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="animate-spin" />
            </div>
          ) : !messages?.length ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Say hi to {first} 👋</p>
              <p className="mt-1 max-w-xs">Ask if it's still available, or suggest a time to meet at {target?.otherDorm || "their dorm"}.</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === stored?.student.id;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                      mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={cn("mt-0.5 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {format(new Date(m.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="flex gap-2 border-t p-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${first}…`}
            maxLength={1000}
            aria-label="Message"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={!text.trim() || mutation.isPending} aria-label="Send">
            {mutation.isPending ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
