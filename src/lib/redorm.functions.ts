import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  listingSchema,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  sessionSchema,
  verifySchema,
  type ChatMessage,
  type InboxThread,
  type Item,
  type Student,
} from "./redorm";
import {
  createPublicClient,
  getAdmin,
  hashToken,
  newToken,
  PHOTO_BUCKET,
  requireStudent,
  signPhotos,
  toItem,
} from "./redorm.server";

/** Verifies a .edu email and issues a device token (no full account). */
export const verifyStudent = createServerFn({ method: "POST" })
  .inputValidator((data) => verifySchema.parse(data))
  .handler(async ({ data }): Promise<{ student: Student; token: string }> => {
    const admin = await getAdmin();
    const token = newToken();
    const token_hash = await hashToken(token);
    const { data: row, error } = await admin
      .from("students")
      .upsert({ email: data.email, name: data.name, dorm: data.dorm, token_hash }, { onConflict: "email" })
      .select("id, name, email, dorm")
      .single();
    if (error || !row) {
      console.error(error);
      throw new Error("We couldn't verify you right now. Please try again.");
    }
    return { student: row, token };
  });

export const listItems = createServerFn({ method: "GET" }).handler(async (): Promise<Item[]> => {
  const client = createPublicClient();
  const { data, error } = await client
    .from("items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    console.error(error);
    throw new Error("Couldn't load listings");
  }
  const signed = await signPhotos(client, data.flatMap((r) => r.photos));
  return data.map((r) => toItem(r, signed));
});

export const toggleReserve = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ session: sessionSchema, itemId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { admin, student } = await requireStudent(data.session);
    const { data: item, error } = await admin
      .from("items")
      .select("id, seller_id, reserved, reserved_by")
      .eq("id", data.itemId)
      .maybeSingle();
    if (error || !item) throw new Error("Listing not found");

    if (!item.reserved) {
      if (item.seller_id === student.id) throw new Error("You can't reserve your own listing");
      const { error: upErr } = await admin
        .from("items")
        .update({ reserved: true, reserved_by: student.id })
        .eq("id", item.id)
        .eq("reserved", false);
      if (upErr) throw new Error("Couldn't reserve this item");
      return { reserved: true };
    }
    if (item.reserved_by !== student.id && item.seller_id !== student.id) {
      throw new Error("Someone else already reserved this item");
    }
    const { error: upErr } = await admin
      .from("items")
      .update({ reserved: false, reserved_by: null })
      .eq("id", item.id);
    if (upErr) throw new Error("Couldn't release this reservation");
    return { reserved: false };
  });

export const createListing = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) throw new Error("Expected form data");
    const session = sessionSchema.parse({
      studentId: data.get("studentId"),
      token: data.get("token"),
    });
    const priceRaw = data.get("price");
    const listing = listingSchema.parse({
      title: data.get("title"),
      description: data.get("description"),
      category: data.get("category"),
      condition: data.get("condition"),
      transactionType: data.get("transactionType"),
      price: priceRaw === null || priceRaw === "" ? null : Number(priceRaw),
      swapDetails: (data.get("swapDetails") as string | null) || null,
      building: data.get("building"),
    });
    const photos = data.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    if (photos.length === 0) throw new Error("Add at least one photo");
    if (photos.length > MAX_PHOTOS) throw new Error(`Up to ${MAX_PHOTOS} photos`);
    for (const p of photos) {
      if (!p.type.startsWith("image/")) throw new Error("Photos must be images");
      if (p.size > MAX_PHOTO_BYTES) throw new Error("Each photo must be under 5 MB");
    }
    return { session, listing, photos };
  })
  .handler(async ({ data }) => {
    const { admin, student } = await requireStudent(data.session);
    const paths: string[] = [];
    for (const file of data.photos) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${student.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await admin.storage
        .from(PHOTO_BUCKET)
        .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
      if (error) {
        console.error(error);
        throw new Error("Photo upload failed. Try a smaller image.");
      }
      paths.push(path);
    }
    const l = data.listing;
    const { data: row, error } = await admin
      .from("items")
      .insert({
        title: l.title,
        description: l.description,
        category: l.category,
        condition: l.condition,
        transaction_type: l.transactionType,
        price: l.transactionType === "Sell" ? l.price : null,
        swap_details: l.transactionType === "Swap" ? l.swapDetails : null,
        building: l.building,
        photos: paths,
        seller_id: student.id,
        seller_name: student.name,
        seller_dorm: student.dorm,
      })
      .select("id")
      .single();
    if (error || !row) {
      console.error(error);
      throw new Error("Couldn't publish your listing");
    }
    return { id: row.id };
  });

const threadInput = z.object({
  session: sessionSchema,
  itemId: z.string().uuid(),
  otherId: z.string().uuid(),
});

export const getConversation = createServerFn({ method: "POST" })
  .inputValidator((data) => threadInput.parse(data))
  .handler(async ({ data }): Promise<ChatMessage[]> => {
    const { admin, student } = await requireStudent(data.session);
    const me = student.id;
    const other = data.otherId;
    const { data: rows, error } = await admin
      .from("messages")
      .select("id, sender_id, recipient_id, content, created_at")
      .eq("item_id", data.itemId)
      .or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      console.error(error);
      throw new Error("Couldn't load messages");
    }
    return rows.map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      recipientId: r.recipient_id,
      content: r.content,
      createdAt: r.created_at,
    }));
  });

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    threadInput.extend({ content: z.string().trim().min(1).max(1000) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { admin, student } = await requireStudent(data.session);
    if (data.otherId === student.id) throw new Error("You can't message yourself");
    const { data: item } = await admin
      .from("items")
      .select("id, seller_id")
      .eq("id", data.itemId)
      .maybeSingle();
    if (!item) throw new Error("Listing not found");

    // Buyers can only message the seller; sellers can reply to anyone who wrote to them.
    if (item.seller_id !== data.otherId) {
      if (item.seller_id !== student.id) throw new Error("You can only message the seller");
      const { count } = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("item_id", item.id)
        .eq("sender_id", data.otherId)
        .eq("recipient_id", student.id);
      if (!count) throw new Error("This student hasn't contacted you about this item");
    }
    const { error } = await admin.from("messages").insert({
      item_id: item.id,
      sender_id: student.id,
      recipient_id: data.otherId,
      content: data.content,
    });
    if (error) {
      console.error(error);
      throw new Error("Message not sent");
    }
    return { ok: true };
  });

export const listInbox = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ session: sessionSchema }).parse(data))
  .handler(async ({ data }): Promise<InboxThread[]> => {
    const { admin, student } = await requireStudent(data.session);
    const me = student.id;
    const { data: rows, error } = await admin
      .from("messages")
      .select("item_id, sender_id, recipient_id, content, created_at")
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error(error);
      throw new Error("Couldn't load your inbox");
    }
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const other = r.sender_id === me ? r.recipient_id : r.sender_id;
      const key = `${r.item_id}:${other}`;
      if (!latest.has(key)) latest.set(key, r);
    }
    const itemIds = Array.from(new Set(rows.map((r) => r.item_id)));
    const otherIds = Array.from(
      new Set(rows.map((r) => (r.sender_id === me ? r.recipient_id : r.sender_id))),
    );
    const [{ data: items }, { data: others }] = await Promise.all([
      admin.from("items").select("id, title, photos, seller_id").in("id", itemIds.length ? itemIds : ["00000000-0000-0000-0000-000000000000"]),
      admin.from("students").select("id, name, dorm").in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);
    const signed = await signPhotos(admin, (items ?? []).map((i) => i.photos[0]).filter(Boolean));
    const itemMap = new Map((items ?? []).map((i) => [i.id, i]));
    const otherMap = new Map((others ?? []).map((o) => [o.id, o]));
    return Array.from(latest.entries()).map(([, r]) => {
      const otherId = r.sender_id === me ? r.recipient_id : r.sender_id;
      const it = itemMap.get(r.item_id);
      const o = otherMap.get(otherId);
      const first = it?.photos[0];
      return {
        itemId: r.item_id,
        itemTitle: it?.title ?? "Listing",
        itemPhoto: first ? (first.startsWith("/") ? first : (signed.get(first) ?? null)) : null,
        otherId,
        otherName: o?.name ?? "Student",
        otherDorm: o?.dorm ?? "",
        lastMessage: r.content,
        lastAt: r.created_at,
        iAmSeller: it?.seller_id === me,
      };
    });
  });
