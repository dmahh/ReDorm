import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, filterItems, isEduEmail, listingSchema, priceLabel, type Item } from "./redorm";

const base = {
  title: "Lamp",
  description: "Works",
  category: "Electronics",
  condition: "Good",
  building: "Maple Hall",
  price: null,
  swapDetails: null,
} as const;

describe("student verification", () => {
  it("accepts .edu emails", () => {
    expect(isEduEmail("jordan@stateu.edu")).toBe(true);
    expect(isEduEmail("Jordan@Cs.MIT.EDU")).toBe(true);
  });
  it("rejects non-.edu emails", () => {
    expect(isEduEmail("jordan@gmail.com")).toBe(false);
    expect(isEduEmail("jordan@stateu.edu.com")).toBe(false);
    expect(isEduEmail("edu@example.org")).toBe(false);
  });
});

describe("listing rules", () => {
  it("requires a price above zero to sell", () => {
    expect(listingSchema.safeParse({ ...base, transactionType: "Sell", price: 0 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, transactionType: "Sell", price: 12 }).success).toBe(true);
  });
  it("requires swap details to swap", () => {
    expect(listingSchema.safeParse({ ...base, transactionType: "Swap" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, transactionType: "Swap", swapDetails: "a fan" }).success).toBe(true);
  });
  it("allows free listings without a price", () => {
    expect(listingSchema.safeParse({ ...base, transactionType: "Free" }).success).toBe(true);
  });
  it("labels free items as Free", () => {
    expect(priceLabel({ transactionType: "Free", price: null })).toBe("Free");
    expect(priceLabel({ transactionType: "Sell", price: 45 })).toBe("$45");
  });
});

describe("feed filters", () => {
  const mk = (o: Partial<Item>): Item => ({
    id: Math.random().toString(),
    title: "x",
    description: "",
    category: "Kitchen",
    condition: "Good",
    transactionType: "Sell",
    price: 5,
    swapDetails: null,
    building: "Oak Hall",
    photos: [],
    sellerId: "s",
    sellerName: "S",
    sellerDorm: "Oak Hall",
    reserved: false,
    reservedBy: null,
    createdAt: "",
    ...o,
  });
  const items = [
    mk({ title: "Desk lamp", category: "Electronics", building: "Maple Hall" }),
    mk({ title: "Kettle", transactionType: "Free", reserved: true }),
  ];
  it("filters by building and keyword", () => {
    expect(filterItems(items, { ...EMPTY_FILTERS, buildings: ["Maple Hall"] }).map((i) => i.title)).toEqual(["Desk lamp"]);
    expect(filterItems(items, { ...EMPTY_FILTERS, q: "kett" }).map((i) => i.title)).toEqual(["Kettle"]);
  });
  it("hides reserved items when available only is on", () => {
    expect(filterItems(items, { ...EMPTY_FILTERS, availableOnly: true }).map((i) => i.title)).toEqual(["Desk lamp"]);
  });
});
