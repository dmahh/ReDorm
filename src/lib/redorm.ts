// Client-safe ReDorm taxonomy, types and validation rules.
import { z } from "zod";

export const CATEGORIES = [
  "Electronics",
  "Study Materials",
  "Furniture",
  "Kitchen",
  "Appliances",
  "Free",
] as const;
export const CONDITIONS = ["Like New", "Good", "Used"] as const;
export const TRANSACTION_TYPES = ["Sell", "Free", "Swap"] as const;
export const BUILDINGS = ["Maple Hall", "Oak Hall", "Birch Hall", "Cedar Hall", "Pine Hall"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Only .edu addresses can verify. */
export function isEduEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.edu$/i.test(email.trim());
}

export const verifySchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine(isEduEmail, "Use your school .edu email address"),
  dorm: z.enum(BUILDINGS),
});

export const listingSchema = z
  .object({
    title: z.string().trim().min(1, "Add a title").max(100),
    description: z.string().trim().min(1, "Add a description").max(2000),
    category: z.enum(CATEGORIES),
    condition: z.enum(CONDITIONS),
    transactionType: z.enum(TRANSACTION_TYPES),
    price: z.number().min(0).max(100000).nullable(),
    swapDetails: z.string().trim().max(300).nullable(),
    building: z.enum(BUILDINGS),
  })
  .superRefine((v, ctx) => {
    if (v.transactionType === "Sell" && (v.price == null || v.price <= 0)) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Set a price above $0" });
    }
    if (v.transactionType === "Swap" && !v.swapDetails) {
      ctx.addIssue({ code: "custom", path: ["swapDetails"], message: "Say what you'd swap for" });
    }
  });

export type ListingInput = z.infer<typeof listingSchema>;

export const sessionSchema = z.object({
  studentId: z.string().uuid(),
  token: z.string().min(20).max(200),
});
export type StudentSession = z.infer<typeof sessionSchema>;

export type Student = { id: string; name: string; email: string; dorm: string };

export type Item = {
  id: string;
  title: string;
  description: string;
  category: Category;
  condition: Condition;
  transactionType: TransactionType;
  price: number | null;
  swapDetails: string | null;
  building: string;
  photos: string[];
  sellerId: string;
  sellerName: string;
  sellerDorm: string;
  reserved: boolean;
  reservedBy: string | null;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
};

export type InboxThread = {
  itemId: string;
  itemTitle: string;
  itemPhoto: string | null;
  otherId: string;
  otherName: string;
  otherDorm: string;
  lastMessage: string;
  lastAt: string;
  iAmSeller: boolean;
};

export function priceLabel(item: Pick<Item, "transactionType" | "price">): string {
  if (item.transactionType === "Free") return "Free";
  if (item.transactionType === "Swap") return "Swap";
  if (item.price == null) return "—";
  return `$${Number.isInteger(item.price) ? item.price : item.price.toFixed(2)}`;
}

export type FeedFilters = {
  q: string;
  categories: string[];
  conditions: string[];
  buildings: string[];
  types: string[];
  availableOnly: boolean;
};

export const EMPTY_FILTERS: FeedFilters = {
  q: "",
  categories: [],
  conditions: [],
  buildings: [],
  types: [],
  availableOnly: false,
};

export function filterItems(items: Item[], f: FeedFilters): Item[] {
  const q = f.q.trim().toLowerCase();
  return items.filter((it) => {
    if (f.categories.length && !f.categories.includes(it.category)) return false;
    if (f.conditions.length && !f.conditions.includes(it.condition)) return false;
    if (f.buildings.length && !f.buildings.includes(it.building)) return false;
    if (f.types.length && !f.types.includes(it.transactionType)) return false;
    if (f.availableOnly && it.reserved) return false;
    if (q) {
      const hay = `${it.title} ${it.description} ${it.category} ${it.building} ${it.sellerName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
