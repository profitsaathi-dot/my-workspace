"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  PlayCircle,
  Search,
  X,
  MessageCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Input,
  Topbar,
  cn,
} from "@workspace/ui";
import { useT, type MessageKey } from "@/src/i18n/useT";
import {
  HELP_CATEGORIES,
  HELP_TOPICS,
  type HelpCategoryId,
  type HelpTopic,
} from "@/src/config/help-topics";

type CategoryFilter = "ALL" | HelpCategoryId;

/**
 * In-app help / docs. All user-visible text resolves through `useT()` so
 * the page localises with the rest of the app — no hardcoded English.
 */
export default function HelpPage() {
  const t = useT();
 // const [query, setQuery] = useState("");
  const [query, setQuery] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  //const [openId, setOpenId] = useState<string | null>(null);

  const topicSearchIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const topic of HELP_TOPICS) {
      const parts = [t(topic.titleKey), t(topic.summaryKey)];
      for (let i = 0; i < topic.stepCount; i++) {
        parts.push(t(`${topic.keyBase}.s${i}` as MessageKey));
      }
      for (let i = 0; i < topic.tipCount; i++) {
        parts.push(t(`${topic.keyBase}.tip${i}` as MessageKey));
      }
      map.set(topic.id, parts.join(" ").toLowerCase());
    }
    return map;
  }, [t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HELP_TOPICS.filter((topic) => {
      if (category !== "ALL" && topic.category !== category) return false;
      if (!q) return true;
      return (topicSearchIndex.get(topic.id) ?? "").includes(q);
    });
  }, [query, category, topicSearchIndex]);

  const grouped = useMemo(() => {
    const map = new Map<HelpCategoryId, HelpTopic[]>();
    for (const topic of filtered) {
      if (!map.has(topic.category)) map.set(topic.category, []);
      map.get(topic.category)!.push(topic);
    }
    return HELP_CATEGORIES.map((c) => ({
      ...c,
      topics: map.get(c.id) ?? [],
    })).filter((c) => c.topics.length > 0);
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background sm:bg-muted/10 pb-12">
      <Topbar title={t("help.title")} subtitle={t("help.subtitle")} />

      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 md:p-6 lg:flex-row lg:items-start lg:gap-8 lg:p-8 2xl:p-12">
        
        {/* SIDEBAR / MOBILE STICKY HEADER
          On mobile: Sticky top, horizontal scroll chips
          On desktop: Fixed left sidebar
        */}
        <div className="sticky top-0 z-20 -mx-4 bg-background/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:w-72 lg:shrink-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none 2xl:w-80">
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            
            {/* Search Input */}
            <div className="relative group">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("help.searchPlaceholder")}
                className="h-12 rounded-2xl bg-muted/50 pl-10 pr-10 text-base shadow-sm backdrop-blur-sm transition-all focus:bg-background lg:h-11 lg:rounded-xl lg:text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("common.close")}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Filters (Horizontal swipe on mobile, Vertical list on PC) */}
            <div className="-mx-4 flex overflow-x-auto px-4 pb-2 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col lg:overflow-visible">
              <CategoryChip
                active={category === "ALL"}
                onClick={() => setCategory("ALL")}
              >
                {t("help.allCount", { count: HELP_TOPICS.length })}
              </CategoryChip>
              {HELP_CATEGORIES.map((c) => {
                const count = HELP_TOPICS.filter((x) => x.category === c.id).length;
                if (count === 0) return null;
                return (
                  <CategoryChip
                    key={c.id}
                    active={category === c.id}
                    onClick={() => setCategory(c.id)}
                  >
                    {t("help.catCount", { label: t(c.labelKey), count })}
                  </CategoryChip>
                );
              })}
            </div>
          </div>
        </div>

        {/* CONTENT AREA 
        */}
        <div className="flex w-full flex-1 flex-col gap-8 lg:min-w-0">
          
          {/* Empty State */}
          {grouped.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/60 bg-card/50 py-20 text-center shadow-sm">
              <div className="grid size-14 place-items-center rounded-full bg-muted">
                <HelpCircle className="size-7 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">{t("help.noMatchTitle")}</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("help.noMatchDesc")}
              </p>
              {query && (
                <Button variant="outline" className="mt-2 rounded-xl" onClick={() => setQuery("")}>
                  {t("help.clearSearch")}
                </Button>
              )}
            </div>
          )}

          {/* Topic Groups */}
          {grouped.map((group) => (
            <section key={group.id} className="flex flex-col gap-4">
              <h2 className="px-1 text-sm font-bold tracking-tight text-foreground lg:text-base">
                {t(group.labelKey)}
              </h2>
              {/* Responsive Grid: 1 col (Phone), 2 col (Tablet/Laptop), 3 col (Ultrawide/TV) */}
              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
                {group.topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    open={openId === topic.id}
                    onToggle={() =>
                      setOpenId((prev) => (prev === topic.id ? null : topic.id))
                    }
                  />
                ))}
              </div>
            </section>
          ))}

          {/* WhatsApp / Contact Floating Banner Card */}
          <div className="mt-4 rounded-3xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-1 sm:p-2">
            <Card className="border-none bg-transparent shadow-none">
              <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
                    <MessageCircle className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold lg:text-lg">{t("help.contactTitle")}</h3>
                    <p className="text-sm text-muted-foreground lg:text-base">{t("help.contactDesc")}</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NO}?text=Hi%20ProfitSaathi%20support`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full shrink-0 sm:w-auto"
                >
                  <Button className="w-full rounded-xl bg-green-500 text-base font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-400 hover:shadow-green-500/30 sm:w-auto sm:px-8 sm:py-6">
                    {t("help.contactWa")}
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mr-2 shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out lg:mr-0 lg:w-full lg:rounded-xl lg:px-4 lg:py-3 lg:text-left",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-md lg:shadow-none"
          : "border-border/50 bg-card text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function TopicCard({
  topic,
  open,
  onToggle,
}: {
  topic: HelpTopic;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const stepKeys = useMemo(
    () =>
      Array.from(
        { length: topic.stepCount },
        (_, i) => `${topic.keyBase}.s${i}` as MessageKey
      ),
    [topic.keyBase, topic.stepCount]
  );
  const tipKeys = useMemo(
    () =>
      Array.from(
        { length: topic.tipCount },
        (_, i) => `${topic.keyBase}.tip${i}` as MessageKey
      ),
    [topic.keyBase, topic.tipCount]
  );

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 sm:rounded-2xl",
        open ? "border-primary/30 shadow-md ring-1 ring-primary/10" : "border-border/50 shadow-sm hover:border-border hover:shadow-md"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 bg-card p-4 text-left transition-colors hover:bg-muted/30 sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base leading-snug sm:text-lg">{t(topic.titleKey)}</CardTitle>
          <CardDescription className="mt-1.5 line-clamp-2 text-sm leading-relaxed sm:text-base">
            {t(topic.summaryKey)}
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-1">
          {topic.videoUrl && (
            <Badge
  variant="outline"
  className="hidden shrink-0 gap-1.5 rounded-lg px-2.5 py-1 sm:inline-flex"
>
  <PlayCircle className="size-3.5 text-primary" />
  <span>{t("help.videoBadge")}</span>
</Badge>
          )}
          <div className={cn(
            "grid size-8 place-items-center rounded-full transition-colors",
            open ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <ChevronDown
              className={cn(
                "size-5 transition-transform duration-300",
                open && "-rotate-180"
              )}
            />
          </div>
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="flex flex-col gap-6 bg-muted/10 p-4 pt-2 sm:p-5 sm:pt-2">
            
            {topic.videoUrl && (
              <div className="relative w-full overflow-hidden rounded-xl border border-border/50 bg-black shadow-inner">
                <div className="relative pt-[56.25%]">
                  <iframe
                    src={toEmbedUrl(topic.videoUrl)}
                    title={t(topic.titleKey)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 size-full"
                  />
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
                {t("help.steps")}
              </h3>
              <ol className="space-y-3">
                {stepKeys.map((k, idx) => (
                  <li key={k} className="flex items-start gap-3 text-sm leading-relaxed text-foreground sm:text-base">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{t(k)}</span>
                  </li>
                ))}
              </ol>
            </div>

            {tipKeys.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 dark:border-amber-500/10 dark:bg-amber-500/10">
                <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Lightbulb className="size-4" />
                  {t("help.tips")}
                </div>
                <ul className="ml-1 space-y-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {tipKeys.map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500/50" />
                      <span>{t(k)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {topic.links && topic.links.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {topic.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target={l.href.startsWith("http") ? "_blank" : undefined}
                    rel={l.href.startsWith("http") ? "noreferrer" : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
                  >
                    {t(`${topic.keyBase}.link${l.labelKeyIndex}` as MessageKey)}
                    <ExternalLink className="size-3.5" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

/**
 * Rewrites common video share URLs to their embeddable variants.
 */
function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);

    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    if (
      u.hostname === "youtube.com" ||
      u.hostname === "www.youtube.com" ||
      u.hostname === "m.youtube.com" ||
      u.hostname === "youtube-nocookie.com" ||
      u.hostname === "www.youtube-nocookie.com"
    ) {
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.replace("/shorts/", "").replace(/\/$/, "");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.pathname.startsWith("/live/")) {
        const id = u.pathname.replace("/live/", "").replace(/\/$/, "");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    }

    if (u.hostname === "vimeo.com" || u.hostname === "www.vimeo.com") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }

    if (
      (u.hostname === "loom.com" || u.hostname === "www.loom.com") &&
      u.pathname.startsWith("/share/")
    ) {
      const id = u.pathname.replace("/share/", "").replace(/\/$/, "");
      if (id) return `https://www.loom.com/embed/${id}`;
    }

    return url;
  } catch {
    return url;
  }
}