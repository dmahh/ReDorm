// Server-only helpers for ReDorm server functions.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Item, StudentSession } from "./redorm";

export const PHOTO_BUCKET = "item-photos";

export async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function newToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

/** Publishable-key client for public reads (RLS applies). */
export function createPublicClient(): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Confirms the caller's device token matches the verified student. */
export async function requireStudent(session: StudentSession) {
  const admin = await getAdmin();
  const { data, error } = await admin
    .from("students")
    .select("id, name, email, dorm, token_hash")
    .eq("id", session.studentId)
    .maybeSingle();
  if (error) {
    console.error(error);
    throw new Error("Could not check your student verification");
  }
  if (!data || !data.token_hash || data.token_hash !== (await hashToken(session.token))) {
    throw new Error("Please verify your student email again");
  }
  return { admin, student: { id: data.id, name: data.name, email: data.email, dorm: data.dorm } };
}

type ItemRow = Database["public"]["Tables"]["items"]["Row"];

export async function signPhotos(
  client: SupabaseClient<Database>,
  paths: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const storagePaths = Array.from(new Set(paths.filter((p) => !p.startsWith("/") && !p.startsWith("http"))));
  if (storagePaths.length) {
    const { data, error } = await client.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(storagePaths, 60 * 60 * 24);
    if (error) console.error("sign photos", error);
    data?.forEach((d) => {
      if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
    });
  }
  return out;
}

export function toItem(row: ItemRow, signed: Map<string, string>): Item {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as Item["category"],
    condition: row.condition as Item["condition"],
    transactionType: row.transaction_type as Item["transactionType"],
    price: row.price == null ? null : Number(row.price),
    swapDetails: row.swap_details,
    building: row.building,
    photos: row.photos
      .map((p) => (p.startsWith("/") || p.startsWith("http") ? p : signed.get(p)))
      .filter((p): p is string => !!p),
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    sellerDorm: row.seller_dorm,
    reserved: row.reserved,
    reservedBy: row.reserved_by,
    createdAt: row.created_at,
  };
}
