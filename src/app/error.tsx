"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4 text-center">
      <div className="mb-8 rounded-full bg-red-100 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white font-black text-2xl">
          !
        </div>
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        An unexpected error occurred while processing your request.
      </p>
      <div className="flex items-center gap-4">
        <Button onClick={() => reset()} variant="outline">
          Try again
        </Button>
        <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
