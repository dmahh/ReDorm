import { useState } from "react";
import { BookmarkCheck, Bookmark, Building2, Loader2, MessageCircle, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { priceLabel, type Item } from "@/lib/redorm";

export function ItemCard({
  item,
  meId,
  onContact,
  onReserve,
  reserving,
}: {
  item: Item;
  meId: string | null;
  onContact: () => void;
  onReserve: () => void;
  reserving: boolean;
}) {
  const [photo, setPhoto] = useState(0);
  const mine = meId === item.sellerId;
  const reservedByMe = item.reserved && item.reservedBy === meId;
  const price = priceLabel(item);

  return (
    <article className="card-lift group flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {item.photos[photo] ? (
          <img
            src={item.photos[photo]}
            alt={item.title}
            loading="lazy"
            width={800}
            height={600}
            className={cn(
              "size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]",
              item.reserved && "opacity-70",
            )}
          />
        ) : null}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge variant={item.transactionType === "Free" ? "free" : item.transactionType === "Swap" ? "swap" : "solid"}>
            {item.transactionType === "Swap" && <Repeat className="size-3" />}
            {price}
          </Badge>
        </div>
        {item.reserved && (
          <div className="absolute right-3 top-3">
            <Badge variant="reserved">{reservedByMe ? "Reserved by you" : "Reserved"}</Badge>
          </div>
        )}
        {item.photos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {item.photos.map((_, i) => (
              <button
                key={i}
                aria-label={`Photo ${i + 1}`}
                onClick={() => setPhoto(i)}
                className={cn("size-2 rounded-full bg-background/70", i === photo && "bg-background")}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold leading-snug">{item.title}</h3>
            <span className={cn("shrink-0 font-semibold", item.transactionType === "Free" ? "text-primary" : "text-foreground")}>
              {price}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
          {item.transactionType === "Swap" && item.swapDetails && (
            <p className="mt-1.5 line-clamp-1 text-xs text-swap-foreground">
              <span className="font-medium">Wants:</span> {item.swapDetails}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="tag">{item.category}</Badge>
          <Badge variant="tag">{item.condition}</Badge>
        </div>

        <div className="mt-auto flex items-center gap-2.5 border-t pt-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-strong">
            {item.sellerName.slice(0, 1)}
          </span>
          <div className="min-w-0 text-sm leading-tight">
            <div className="truncate font-medium">{mine ? "You" : item.sellerName}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="size-3" /> {item.building}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onContact} disabled={mine}>
            <MessageCircle /> Contact
          </Button>
          <Button
            size="sm"
            variant={reservedByMe ? "soft" : "default"}
            onClick={onReserve}
            disabled={reserving || mine || (item.reserved && !reservedByMe)}
          >
            {reserving ? <Loader2 className="animate-spin" /> : reservedByMe ? <BookmarkCheck /> : <Bookmark />}
            {reservedByMe ? "Unreserve" : item.reserved ? "Reserved" : "Reserve"}
          </Button>
        </div>
      </div>
    </article>
  );
}
