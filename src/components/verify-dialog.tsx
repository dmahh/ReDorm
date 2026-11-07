import { createContext, useCallback, useContext, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUILDINGS, isEduEmail, verifySchema } from "@/lib/redorm";
import { verifyStudent } from "@/lib/redorm.functions";
import { clearStudent, saveStudent, useStudent } from "@/lib/student-session";

type VerifyCtx = {
  /** Runs `then` right away when verified, otherwise opens the verify dialog first. */
  requireVerified: (then?: () => void) => void;
  openVerify: () => void;
  /** Call when a server action reports the device token is no longer valid. */
  handleAuthError: (err: unknown) => boolean;
};

const Ctx = createContext<VerifyCtx | null>(null);

export function useVerify() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useVerify must be used inside VerifyProvider");
  return v;
}

export function VerifyProvider({ children }: { children: ReactNode }) {
  const stored = useStudent();
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | undefined>(undefined);

  const requireVerified = useCallback(
    (then?: () => void) => {
      if (stored) {
        then?.();
        return;
      }
      pending.current = then;
      setOpen(true);
    },
    [stored],
  );

  const handleAuthError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("verify your student email again")) {
      clearStudent();
      toast.error("Please verify your student email again.");
      setOpen(true);
      return true;
    }
    return false;
  }, []);

  return (
    <Ctx.Provider value={{ requireVerified, openVerify: () => setOpen(true), handleAuthError }}>
      {children}
      <VerifyDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) pending.current = undefined;
        }}
        onVerified={() => {
          setOpen(false);
          const next = pending.current;
          pending.current = undefined;
          next?.();
        }}
      />
    </Ctx.Provider>
  );
}

type VErrors = Partial<Record<"name" | "email" | "dorm", string>>;

function VerifyDialog({
  open,
  onOpenChange,
  onVerified,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onVerified: () => void;
}) {
  const verify = useServerFn(verifyStudent);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dorm, setDorm] = useState<string>("");
  const [errors, setErrors] = useState<VErrors>({});
  const [busy, setBusy] = useState(false);

  const emailTouchedInvalid = email.length > 3 && email.includes("@") && !isEduEmail(email);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = verifySchema.safeParse({ name, email, dorm });
    if (!parsed.success) {
      const errs: VErrors = {};
      for (const i of parsed.error.issues) errs[String(i.path[0]) as keyof VErrors] = i.message;
      if (!dorm) errs.dorm = "Pick your dorm";
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await verify({ data: parsed.data });
      saveStudent(res);
      toast.success(`Welcome, ${res.student.name.split(" ")[0]}! You're verified.`);
      onVerified();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
            <GraduationCap className="size-5" />
          </div>
          <DialogTitle className="text-xl">Verify you're a student</DialogTitle>
          <DialogDescription>
            ReDorm is for students only. Use your school email ending in <strong>.edu</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="v-name">Your name</Label>
            <Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Smith" autoComplete="name" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-email">School email</Label>
            <Input
              id="v-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              autoComplete="email"
              aria-invalid={emailTouchedInvalid || !!errors.email}
            />
            {(errors.email || emailTouchedInvalid) && (
              <p className="text-xs text-destructive">{errors.email ?? "Only .edu email addresses can join"}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Your dorm</Label>
            <Select value={dorm} onValueChange={setDorm}>
              <SelectTrigger aria-label="Your dorm">
                <SelectValue placeholder="Choose your building" />
              </SelectTrigger>
              <SelectContent>
                {BUILDINGS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dorm && <p className="text-xs text-destructive">{errors.dorm}</p>}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Verify & continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
