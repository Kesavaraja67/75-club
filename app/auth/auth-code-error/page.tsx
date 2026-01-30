import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="flex max-w-sm flex-col items-center space-y-4 text-center">
        <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
          <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Authentication Error
        </h1>
        <p className="text-muted-foreground">
          The sign-in link is invalid or has expired. This often happens if you click the link in your email more than once.
        </p>
        <div className="flex gap-2">
           <Button asChild>
            <Link href="/login">Back to Login</Link>
           </Button>
           <Button asChild variant="outline">
             <Link href="/">Go Home</Link>
           </Button>
        </div>
      </div>
    </div>
  );
}
