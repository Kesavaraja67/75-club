import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="inline-block p-10 bg-white rounded-3xl border-4 border-black neo-shadow-lg">
          <div className="text-8xl mb-4">🤔</div>
          <h1 className="text-6xl font-display font-black mb-4">404</h1>
          <h2 className="text-2xl font-display font-bold mb-4">Page Not Found</h2>
          <p className="text-muted-foreground mb-8 font-medium">
            Oops! Looks like this page decided to bunk class too. 😅
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="font-display font-bold rounded-2xl w-full sm:w-auto">
              <Link href="/">
                🏠 Go Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="font-display font-bold rounded-2xl w-full sm:w-auto">
              <Link href="/dashboard">
                📊 Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
