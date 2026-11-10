import Image from "next/image";
import { cn } from "@/lib/utils";

/** A framed photo with a caption over its lower edge. Owner photos by default. */
export function CaptionedPhoto({
  src,
  caption,
  credit = "Photo: Jejak Ancala",
  className,
}: {
  src: string;
  caption: string;
  credit?: string | null;
  className?: string;
}) {
  return (
    <figure className={cn("relative overflow-hidden rounded-2xl bg-forest-800 shadow-sm", className)}>
      <Image src={src} alt={caption} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-10 text-sm font-medium text-white">
        {caption}
        {credit && <span className="mt-0.5 block text-[10px] font-normal text-white/65">{credit}</span>}
      </figcaption>
    </figure>
  );
}
