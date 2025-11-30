import { App } from "octokit";
import fs from "fs";

// Singleton pattern to ensure app is created only once
let app: App | null = null;

export function getApp(): App {
  if (!app) {
    const appId = process.env.GITHUB_APP_ID;

    // Validate environment variables first
    if (!appId) {
      throw new Error("Environment variable GITHUB_APP_ID is not set.");
    }

    let privateKey: string;
    if (process.env.NODE_ENV === "production") {
      privateKey = process.env.GITHUB_PRIVATE_KEY as string;
    } else {
      const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH;
      if (!privateKeyPath) {
        throw new Error(
          "Environment variable GITHUB_PRIVATE_KEY_PATH is not set."
        );
      }
      // Now safely read the private key file
      try {
        privateKey = fs.readFileSync(privateKeyPath, "utf8");
      } catch (error) {
        throw new Error(
          `Failed to read GitHub private key from path: ${privateKeyPath}. Error: ${error}`
        );
      }
    }
    if (!privateKey) {
      throw new Error("GitHub private key is not set.");
    }

    app = new App({
      appId,
      privateKey,
    });
  }
  return app;
}
