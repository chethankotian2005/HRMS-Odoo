"use client";

import { useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
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
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-background text-foreground antialiased`}>
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
          <div className="mb-8 rounded-full bg-red-100 p-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white font-black text-2xl">
              !
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Fatal Error</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            A critical error occurred while loading the application.
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
