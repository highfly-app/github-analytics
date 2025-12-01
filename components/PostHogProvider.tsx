"use client";

import { posthog } from "posthog-js";
import { useEffect } from "react";
import { generatePostHogSnippet } from "@/lib/posthog-snippet";

// Declare posthog as global variable loaded from CDN
declare global {
  interface Window {
    posthog: typeof posthog;
  }
}

// Lazily initialize environment variables here to avoid memory leaks
// https://github.com/PostHog/posthog-js/issues/1405
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load PostHog from CDN
    // If you want to test posthog on localhost, remove process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'
    // Doing this to save on posthog usage costs.
    if (
      typeof window !== "undefined" &&
      !window.posthog &&
      process.env.NEXT_PUBLIC_VERCEL_ENV === "production" &&
      process.env.NEXT_PUBLIC_POSTHOG_KEY
    ) {
      const script = document.createElement("script");
      script.innerHTML = generatePostHogSnippet(
        process.env.NEXT_PUBLIC_POSTHOG_KEY!,
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com"
      );
      document.head.appendChild(script);
    }
  }, []);

  return <>{children}</>;
}
