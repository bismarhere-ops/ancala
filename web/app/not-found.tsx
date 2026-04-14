import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="font-display text-6xl font-semibold text-primary">404</div>
      <h1 className="mt-3 font-display text-2xl font-semibold">
        This trail leads nowhere.
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The page you tried to reach doesn&rsquo;t exist or has been moved. Head back to the map and try again.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/trails">Browse trails</Link>
        </Button>
      </div>
    </section>
  );
}
