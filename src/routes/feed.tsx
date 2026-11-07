import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PackageOpen, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ItemCard } from "@/components/item-card";
import { ChatDialog, type ChatTarget } from "@/components/chat-dialog";
import { FeedFiltersPanel, activeFilterCount } from "@/components/feed-filters";
import { useVerify } from "@/components/verify-dialog";
import { itemsQuery } from "@/lib/queries";
import { toggleReserve } from "@/lib/redorm.functions";
import { EMPTY_FILTERS, filterItems, type FeedFilters, type Item } from "@/lib/redorm";
import { currentSession, useStudent } from "@/lib/student-session";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Browse dorm items — ReDorm" },
      { name: "description", content: "Find free, swap and second-hand dorm essentials from students in your building." },
      { property: "og:title", content: "Browse dorm items — ReDorm" },
      { property: "og:description", content: "Lamps, mini-fridges, textbooks and more from students on campus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(itemsQuery),
  component: FeedPage,
});

function FeedPage() {
  const { data: items } = useSuspenseQuery(itemsQuery);
  const stored = useStudent();
  const meId = stored?.student.id ?? null;
  const { requireVerified, handleAuthError } = useVerify();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reserve = useServerFn(toggleReserve);
  const [filters, setFilters] = useState<FeedFilters>(EMPTY_FILTERS);
  const [chat, setChat] = useState<ChatTarget | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);

  const visible = useMemo(() => filterItems(items, filters), [items, filters]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    const bump = (k: string) => (c[k] = (c[k] ?? 0) + 1);
    for (const it of filterItems(items, { ...EMPTY_FILTERS, q: filters.q })) {
      bump(`categories:${it.category}`);
      bump(`conditions:${it.condition}`);
      bump(`buildings:${it.building}`);
      bump(`types:${it.transactionType}`);
    }
    return c;
  }, [items, filters.q]);

  const mutation = useMutation({
    mutationFn: async (item: Item) => {
      setReservingId(item.id);
      return reserve({ data: { session: currentSession(), itemId: item.id } });
    },
    onSuccess: (res, item) => {
      toast.success(res.reserved ? `Reserved “${item.title}”. Message the seller to arrange pickup.` : "Reservation released");
      qc.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (err) => {
      if (!handleAuthError(err)) toast.error(err instanceof Error ? err.message : "Something went wrong");
      qc.invalidateQueries({ queryKey: ["items"] });
    },
    onSettled: () => setReservingId(null),
  });

  const filterCount = activeFilterCount(filters);

  return (
    <div className="bg-surface">
      <div className="container-page py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Campus finds</h1>
            <p className="mt-1 text-muted-foreground">
              {items.length} items from students across campus
            </p>
          </div>
          <div className="flex gap-2 sm:w-[26rem]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                placeholder="Search lamps, textbooks, fridges…"
                className="h-10 bg-background pl-9 pr-9"
                aria-label="Search items"
              />
              {filters.q && (
                <button
                  onClick={() => setFilters({ ...filters, q: "" })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-10 bg-background lg:hidden">
                  <SlidersHorizontal /> Filters{filterCount ? ` (${filterCount})` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6">
                  <FeedFiltersPanel value={filters} onChange={setFilters} counts={counts} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border bg-card p-5">
              <FeedFiltersPanel value={filters} onChange={setFilters} counts={counts} />
            </div>
          </aside>

          <section>
            {visible.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
                <PackageOpen className="size-10 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">Nothing matches yet</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Try a different search or clear some filters — or be the first to list one.
                </p>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Clear all
                  </Button>
                  <Button onClick={() => requireVerified(() => navigate({ to: "/sell" }))}>
                    <Plus /> List an item
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    meId={meId}
                    reserving={reservingId === item.id}
                    onContact={() =>
                      requireVerified(() =>
                        setChat({
                          itemId: item.id,
                          itemTitle: item.title,
                          itemPhoto: item.photos[0],
                          otherId: item.sellerId,
                          otherName: item.sellerName,
                          otherDorm: item.sellerDorm,
                        }),
                      )
                    }
                    onReserve={() => requireVerified(() => mutation.mutate(item))}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <ChatDialog target={chat} onClose={() => setChat(null)} />
    </div>
  );
}
