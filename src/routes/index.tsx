import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Leaf, MessageCircle, Recycle, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerify } from "@/components/verify-dialog";
import { useStudent } from "@/lib/student-session";
import heroImg from "@/assets/hero-dorm.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReDorm — Give, swap & sell dorm essentials on campus" },
      {
        name: "description",
        content:
          "ReDorm helps dorm students pass on lamps, mini-fridges, textbooks and more to other verified students. Less waste, more savings.",
      },
      { property: "og:title", content: "ReDorm — Give, swap & sell dorm essentials" },
      { property: "og:description", content: "A student-only exchange for second-hand dorm essentials. Verify with your .edu email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: GraduationCap, title: "Verify with .edu", body: "Only students can join, so you always know who you're meeting." },
  { icon: Sparkles, title: "Find or list", body: "Browse by building, category and condition — or list in under a minute." },
  { icon: MessageCircle, title: "Chat & pick up", body: "Message the seller, reserve the item, and grab it down the hall." },
];

const STATS = [
  { value: "1,200+", label: "items rehomed" },
  { value: "8 tons", label: "kept out of landfill" },
  { value: "$40k", label: "saved by students" },
];

function Landing() {
  const stored = useStudent();
  const { requireVerified } = useVerify();
  const navigate = useNavigate();
  const start = () => requireVerified(() => navigate({ to: "/feed" }));

  return (
    <div>
      <section className="relative overflow-hidden border-b bg-primary-wash">
        <div className="container-page grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-strong">
              <Leaf className="size-3.5" /> Made for out-of-town dorm students
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Your dorm stuff deserves a <span className="text-primary">second semester.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Give away, swap, or sell lamps, mini-fridges, textbooks and more to students in your building — instead of
              leaving them by the dumpster at move-out.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={start} className="h-12 px-6 text-base">
                {stored ? "Browse items" : "Verify student email"} <ArrowRight />
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 bg-background px-6 text-base">
                <Link to="/feed">Just looking</Link>
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" /> .edu emails only · no passwords · free forever
            </p>
          </div>
          <div className="relative">
            <img
              src={heroImg}
              alt="A bright dorm room with a desk lamp, mini-fridge, books and plants"
              width={1536}
              height={1024}
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift"
            />
            <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl border bg-card p-3 pr-5 shadow-lift">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Recycle className="size-5" />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Mini fridge · Oak Hall</div>
                <div className="text-xs text-muted-foreground">Reserved 2 min ago</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Reuse is the easiest way to go green.</h2>
          <p className="mt-3 text-muted-foreground">
            Every year, perfectly good dorm essentials get thrown out because students can't ship them home. ReDorm keeps
            them on campus and in use.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                  <s.icon className="size-5" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface">
        <div className="container-page grid gap-8 py-14 sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <div className="text-3xl font-bold text-primary">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:p-12">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Moving out soon?</h2>
            <p className="mt-2 max-w-md text-primary-foreground/80">List what you can't take home. Someone down the hall needs it.</p>
          </div>
          <Button size="lg" variant="secondary" className="h-12 px-6 text-base" onClick={() => requireVerified(() => navigate({ to: "/sell" }))}>
            List an item <ArrowRight />
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="container-page flex flex-col gap-2 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span className="flex items-center gap-1.5">
            <Leaf className="size-4 text-primary" /> ReDorm — reuse, on campus.
          </span>
          <span>For verified students only.</span>
        </div>
      </footer>
    </div>
  );
}
