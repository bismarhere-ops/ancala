import Image from "next/image";
import { Backpack, BookOpen, Camera, ExternalLink, Gauge, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { MountainStory as Story } from "@/lib/types";

const SECTION_LABEL: Record<string, string> = {
  highlights: "highlights",
  stats: "key numbers",
  packing: "packing list",
  assessment: "trail assessment",
};

function SectionTitle({ icon: Icon, children }: { icon: typeof Sparkles; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
      <Icon className="size-5 text-primary" /> {children}
    </h2>
  );
}

/**
 * The visitor-facing layer of a trail page: highlights, key numbers, gallery,
 * packing list and a plain-language assessment. Every section renders only
 * when it has content, so a thinly researched mountain shows less rather than
 * padded or invented text.
 */
export function MountainStory({ story, name }: { story: Story; name: string }) {
  const { highlights, stats, gallery, packing, assessment } = story;

  return (
    <div className="container space-y-12 pt-10">
      {highlights.length > 0 && (
        <section>
          <SectionTitle icon={Sparkles}>Why {name}?</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((h) => (
              <Card key={h.title}>
                <CardContent className="space-y-2 p-5">
                  <h3 className="font-display text-lg font-semibold leading-tight">{h.title}</h3>
                  <p className="text-sm text-muted-foreground">{h.body}</p>
                  {h.source && (
                    <a
                      href={h.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Source <ExternalLink className="size-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {stats.length > 0 && (
        <section>
          <SectionTitle icon={Gauge}>{name} by the numbers</SectionTitle>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-forest-900 p-5 text-white">
                <dd className="font-display text-3xl font-semibold text-amber-300">{s.value}</dd>
                <dt className="mt-1 text-sm font-medium">{s.label}</dt>
                {s.note && <p className="mt-1 text-xs text-forest-100/80">{s.note}</p>}
              </div>
            ))}
          </dl>
        </section>
      )}

      {gallery.length > 0 && (
        <section>
          <SectionTitle icon={Camera}>Gallery</SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {gallery.map((g, i) => (
              <a
                key={g.src}
                href={g.src}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  "group relative block overflow-hidden rounded-xl bg-forest-800 " +
                  (i === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-[4/3]")
                }
              >
                <Image
                  src={g.src}
                  alt={g.caption}
                  fill
                  sizes={i === 0 ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 50vw"}
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-semibold uppercase tracking-wide text-white">
                  {g.caption}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {(packing.length > 0 || assessment.length > 0) && (
        <div className="grid gap-8 md:grid-cols-2">
          {packing.length > 0 && (
            <section>
              <SectionTitle icon={Backpack}>What to put in your bag</SectionTitle>
              <ul className="grid gap-3 sm:grid-cols-2">
                {packing.map((p) => (
                  <li key={p.item} className="rounded-xl border bg-card p-4">
                    <div className="font-semibold">{p.item}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.why}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {assessment.length > 0 && (
            <section>
              <SectionTitle icon={Gauge}>Trail assessment</SectionTitle>
              <ul className="space-y-3">
                {assessment.map((a) => (
                  <li key={a.title} className="rounded-xl border-l-4 border-primary bg-card p-4">
                    <div className="font-semibold">{a.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <StoryFooter story={story} />
    </div>
  );
}

function StoryFooter({ story }: { story: Story }) {
  const missing = story.unknown.map((u) => SECTION_LABEL[u] ?? u);
  const linked = story.sources.filter((s) => s.url);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5 font-medium text-foreground">
        <BookOpen className="size-3.5" />
        {story.origin === "owner" ? "From our own trip notes" : "Researched from public sources"}
        {story.updated && <span className="font-normal text-muted-foreground">· {story.updated}</span>}
      </div>
      {missing.length > 0 && (
        <p>Not yet verified, so not shown: {missing.join(", ")}.</p>
      )}
      {linked.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {linked.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
