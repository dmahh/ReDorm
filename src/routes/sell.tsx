import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVerify } from "@/components/verify-dialog";
import { cn } from "@/lib/utils";
import {
  BUILDINGS,
  CATEGORIES,
  CONDITIONS,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  TRANSACTION_TYPES,
  listingSchema,
  priceLabel,
  type TransactionType,
} from "@/lib/redorm";
import { createListing } from "@/lib/redorm.functions";
import { currentSession, useStudent } from "@/lib/student-session";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "List an item — ReDorm" },
      { name: "description", content: "Give away, swap or sell your dorm essentials to students on campus in a few steps." },
      { property: "og:title", content: "List an item — ReDorm" },
      { property: "og:description", content: "Pass on your dorm essentials to the next student." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SellPage,
});

const STEPS = ["Photos", "Details", "Deal & pickup", "Review"] as const;

type Draft = {
  title: string;
  description: string;
  category: string;
  condition: string;
  transactionType: TransactionType;
  price: string;
  swapDetails: string;
  building: string;
};

function SellPage() {
  const stored = useStudent();
  const { openVerify, handleAuthError } = useVerify();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createListing);
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft>({
    title: "",
    description: "",
    category: "",
    condition: "",
    transactionType: "Sell",
    price: "",
    swapDetails: "",
    building: "",
  });

  useEffect(() => {
    if (stored && !draft.building) setDraft((d) => ({ ...d, building: stored.student.dorm }));
  }, [stored, draft.building]);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  if (stored === undefined) {
    return <div className="min-h-[60vh] bg-surface" />;
  }
  if (!stored) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-surface px-4">
        <div className="max-w-sm rounded-2xl border bg-card p-8 text-center shadow-card">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Verify to list an item</h1>
          <p className="mt-2 text-sm text-muted-foreground">Listings come from verified students only, so everyone knows who they're meeting.</p>
          <Button className="mt-6 w-full" onClick={openVerify}>
            Verify my .edu email
          </Button>
        </div>
      </div>
    );
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} isn't an image`);
        return false;
      }
      if (f.size > MAX_PHOTO_BYTES) {
        toast.error(`${f.name} is over 5 MB`);
        return false;
      }
      return true;
    });
    setFiles((cur) => {
      const next = [...cur, ...incoming].slice(0, MAX_PHOTOS);
      if (cur.length + incoming.length > MAX_PHOTOS) toast.info(`Up to ${MAX_PHOTOS} photos`);
      return next;
    });
  }

  function parsed() {
    return listingSchema.safeParse({
      ...draft,
      price: draft.transactionType === "Sell" && draft.price !== "" ? Number(draft.price) : null,
      swapDetails: draft.transactionType === "Swap" ? draft.swapDetails || null : null,
    });
  }

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 0 && files.length === 0) errs.photos = "Add at least one photo";
    if (s >= 1) {
      const r = parsed();
      if (!r.success) {
        const fields = s === 1 ? ["title", "description", "category", "condition"] : ["price", "swapDetails", "building"];
        for (const i of r.error.issues) {
          const f = String(i.path[0]);
          if (fields.includes(f) && !errs[f]) errs[f] = i.message.startsWith("Invalid") ? "Required" : i.message;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function publish() {
    const r = parsed();
    if (!r.success || files.length === 0) {
      toast.error("Some details are missing");
      return;
    }
    setBusy(true);
    try {
      const session = currentSession();
      const fd = new FormData();
      fd.set("studentId", session.studentId);
      fd.set("token", session.token);
      fd.set("title", r.data.title);
      fd.set("description", r.data.description);
      fd.set("category", r.data.category);
      fd.set("condition", r.data.condition);
      fd.set("transactionType", r.data.transactionType);
      fd.set("price", r.data.price == null ? "" : String(r.data.price));
      fd.set("swapDetails", r.data.swapDetails ?? "");
      fd.set("building", r.data.building);
      files.forEach((f) => fd.append("photos", f));
      await create({ data: fd });
      await qc.invalidateQueries({ queryKey: ["items"] });
      toast.success("Your listing is live!");
      navigate({ to: "/feed" });
    } catch (err) {
      if (!handleAuthError(err)) toast.error(err instanceof Error ? err.message : "Couldn't publish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <Link to="/feed" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to browse
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">List an item</h1>
        <p className="mt-1 text-muted-foreground">Give your stuff a second semester.</p>

        <ol className="mt-8 grid grid-cols-4 gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="space-y-2">
              <div className={cn("h-1.5 rounded-full bg-border", i <= step && "bg-primary")} />
              <p className={cn("text-xs", i === step ? "font-medium text-foreground" : "text-muted-foreground")}>
                <span className="hidden sm:inline">{i + 1}. </span>
                {label}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-2xl border bg-card p-5 shadow-card sm:p-7">
          {step === 0 && (
            <div>
              <h2 className="font-semibold">Add photos</h2>
              <p className="mt-1 text-sm text-muted-foreground">Clear, well-lit photos help your item go faster. Up to {MAX_PHOTOS}.</p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {previews.map((src, i) => (
                  <div key={src} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">Cover</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}
                      className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 text-foreground"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                {files.length < MAX_PHOTOS && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:bg-primary-wash hover:text-primary-strong">
                    <ImagePlus className="size-6" />
                    <span className="text-xs font-medium">Add photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
              {errors.photos && <p className="mt-3 text-sm text-destructive">{errors.photos}</p>}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-semibold">Describe it</h2>
              <Field label="Title" error={errors.title}>
                <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. IKEA desk lamp, white" maxLength={100} />
              </Field>
              <Field label="Description" error={errors.description}>
                <Textarea
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Size, age, any wear, why you're passing it on…"
                  rows={4}
                  maxLength={2000}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Category" error={errors.category}>
                  <Select value={draft.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger aria-label="Category">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Condition" error={errors.condition}>
                  <div className="grid grid-cols-3 gap-2">
                    {CONDITIONS.map((c) => (
                      <ChoiceChip key={c} active={draft.condition === c} onClick={() => set("condition", c)}>
                        {c}
                      </ChoiceChip>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold">How do you want to pass it on?</h2>
              <div className="grid grid-cols-3 gap-2">
                {TRANSACTION_TYPES.map((t) => (
                  <ChoiceChip key={t} active={draft.transactionType === t} onClick={() => set("transactionType", t)} large>
                    {t === "Sell" ? "Sell it" : t === "Free" ? "Give away" : "Swap it"}
                  </ChoiceChip>
                ))}
              </div>
              {draft.transactionType === "Sell" && (
                <Field label="Price (USD)" error={errors.price}>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      value={draft.price}
                      onChange={(e) => set("price", e.target.value)}
                      className="pl-7"
                      placeholder="15"
                    />
                  </div>
                </Field>
              )}
              {draft.transactionType === "Swap" && (
                <Field label="What would you swap for?" error={errors.swapDetails}>
                  <Input
                    value={draft.swapDetails}
                    onChange={(e) => set("swapDetails", e.target.value)}
                    placeholder="e.g. a desk fan or a Calc I textbook"
                    maxLength={300}
                  />
                </Field>
              )}
              {draft.transactionType === "Free" && (
                <p className="rounded-lg bg-primary-wash p-3 text-sm text-primary-strong">
                  Nice — giving things away keeps them out of the dumpster at move-out. 🌱
                </p>
              )}
              <Field label="Pickup building" error={errors.building}>
                <Select value={draft.building} onValueChange={(v) => set("building", v)}>
                  <SelectTrigger aria-label="Pickup building">
                    <SelectValue placeholder="Choose building" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILDINGS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-semibold">Review your listing</h2>
              <div className="mt-5 overflow-hidden rounded-xl border">
                {previews[0] && <img src={previews[0]} alt="" className="aspect-[4/3] w-full object-cover" />}
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{draft.title}</h3>
                    <span className="font-semibold text-primary">
                      {priceLabel({ transactionType: draft.transactionType, price: draft.price ? Number(draft.price) : null })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{draft.description}</p>
                  <dl className="grid grid-cols-2 gap-2 pt-2 text-sm">
                    <Meta k="Category" v={draft.category} />
                    <Meta k="Condition" v={draft.condition} />
                    <Meta k="Pickup" v={draft.building} />
                    <Meta k="Photos" v={String(files.length)} />
                    {draft.transactionType === "Swap" && <Meta k="Swap for" v={draft.swapDetails} />}
                  </dl>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Listed as {stored.student.name} · {stored.student.email}</p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t pt-5">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
              <ArrowLeft /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => validateStep(step) && setStep((s) => s + 1)}>
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button onClick={publish} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Check />} Publish listing
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ChoiceChip({
  active,
  onClick,
  children,
  large,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-2 text-sm font-medium transition-colors",
        large ? "py-3" : "h-9",
        active ? "border-primary bg-primary-wash text-primary-strong" : "hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
