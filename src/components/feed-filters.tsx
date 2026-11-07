import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BUILDINGS, CATEGORIES, CONDITIONS, TRANSACTION_TYPES, type FeedFilters } from "@/lib/redorm";

type ListKey = "categories" | "conditions" | "buildings" | "types";

const GROUPS: { key: ListKey; title: string; options: readonly string[] }[] = [
  { key: "types", title: "Deal type", options: TRANSACTION_TYPES },
  { key: "categories", title: "Category", options: CATEGORIES },
  { key: "conditions", title: "Condition", options: CONDITIONS },
  { key: "buildings", title: "Building", options: BUILDINGS },
];

export function activeFilterCount(f: FeedFilters) {
  return f.categories.length + f.conditions.length + f.buildings.length + f.types.length + (f.availableOnly ? 1 : 0);
}

export function FeedFiltersPanel({
  value,
  onChange,
  counts,
}: {
  value: FeedFilters;
  onChange: (f: FeedFilters) => void;
  counts: Record<string, number>;
}) {
  function toggle(key: ListKey, opt: string) {
    const cur = value[key];
    onChange({ ...value, [key]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="available-only" className="text-sm font-medium">
          Available only
        </Label>
        <Switch
          id="available-only"
          checked={value.availableOnly}
          onCheckedChange={(c) => onChange({ ...value, availableOnly: c })}
        />
      </div>
      {GROUPS.map((g) => (
        <fieldset key={g.key}>
          <legend className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.title}
          </legend>
          <div className="space-y-2">
            {g.options.map((opt) => {
              const id = `${g.key}-${opt}`;
              return (
                <div key={opt} className="flex items-center gap-2.5">
                  <Checkbox id={id} checked={value[g.key].includes(opt)} onCheckedChange={() => toggle(g.key, opt)} />
                  <Label htmlFor={id} className="flex flex-1 cursor-pointer items-center justify-between text-sm font-normal">
                    {opt}
                    <span className="text-xs text-muted-foreground">{counts[`${g.key}:${opt}`] ?? 0}</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
      {activeFilterCount(value) > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => onChange({ ...value, categories: [], conditions: [], buildings: [], types: [], availableOnly: false })}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
