"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiGithub } from "react-icons/si";

/**
 * Parse GitHub URL or owner/repo string
 * Supports:
 * - https://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 */
function parseGitHubRepo(
  input: string
): { owner: string; repo: string } | null {
  const trimmed = input.trim();

  // Remove trailing slash
  const cleaned = trimmed.replace(/\/$/, "");

  // Match full URL
  const urlMatch = cleaned.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/i
  );
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ""), // Remove .git suffix if present
    };
  }

  // Match owner/repo format
  const simpleMatch = cleaned.match(/^([^\/]+)\/([^\/]+)$/);
  if (simpleMatch) {
    return {
      owner: simpleMatch[1],
      repo: simpleMatch[2],
    };
  }

  return null;
}

export default function AnalyticsInputPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!input.trim()) {
      setError("Please enter a GitHub repository URL or owner/repo");
      return;
    }

    const parsed = parseGitHubRepo(input);
    if (!parsed) {
      setError(
        "Invalid GitHub repository format. Use: owner/repo or https://github.com/owner/repo"
      );
      return;
    }

    setIsLoading(true);

    // Redirect to analytics page
    router.push(`/analytics/${parsed.owner}/${parsed.repo}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <SiGithub className="size-12 text-foreground" />
            <h1 className="text-4xl font-bold text-foreground">
              GitHub Analytics
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Analyze any public Open Source GitHub repository&apos;s issues, PRs,
            and more.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="https://github.com/owner/repo or owner/repo"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              disabled={isLoading}
              className="text-lg h-12"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-full h-12 text-lg"
          >
            {isLoading ? "Loading..." : "Analyze Repository"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <p>Examples:</p>
          <div className="mt-2 space-y-1">
            <p>vercel/next.js</p>
          </div>
        </div>
      </div>
    </div>
  );
}
