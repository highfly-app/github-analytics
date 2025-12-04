import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const allowedOrigins = process.env.NEXT_PUBLIC_APP_URL?.split(",") || [
    "localhost:3000",
  ];

  // Check if this is a PostHog relay request
  const isPostHogRelay = pathname.startsWith("/relay-github-analytics");

  // Allow CORS for static assets and PostHog relay when proxied from main app
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins.some((allowed) => origin.includes(allowed))) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    // Allow POST for PostHog relay endpoints, GET/OPTIONS for static assets
    if (isPostHogRelay) {
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
      );
    } else {
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    }

    response.headers.set("Access-Control-Allow-Credentials", "true");

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths, especially static assets
     */
    "/(.*)",
  ],
};
