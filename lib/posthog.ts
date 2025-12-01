import { PostHog } from "posthog-node";

// Server-side PostHog client for backend events
let posthogClient: PostHog | null = null;

// Lazily initialize environment variables here to avoid memory leaks
// https://github.com/PostHog/posthog-js/issues/1405
export function getPostHogClient(): PostHog | null {
  // If you want to test posthog on localhost, remove process.env.VERCEL_ENV === 'production'
  // Doing this to save on posthog usage costs.
  if (
    !posthogClient &&
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production" &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY
  ) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      // Since Vercel runs your server-side Next.js code as serverless functions
      // (which are short-lived), you should use flushAt: 1, flushInterval: 0
      // for any server-side PostHog Node client usage.
      flushAt: 1,
      flushInterval: 0,
      // Disable feature flags on server side unless needed
      featureFlagsPollingInterval: 0,
    });
  }

  return posthogClient;
}

// Graceful shutdown function
// THIS NEEDS TO BE CALLED AFTER posthogClient IS DONE BEING USED
// https://posthog.com/docs/libraries/next-js#server-side-analytics
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}
