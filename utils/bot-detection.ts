/**
 * Check if a GitHub user is a bot
 */
export function isBot(user: { type?: string; login?: string } | null | undefined): boolean {
  if (!user) {
    return false;
  }

  // Check if type is Bot
  if (user.type === 'Bot') {
    return true;
  }

  // Check if username ends with [bot]
  if (user.login && user.login.endsWith('[bot]')) {
    return true;
  }

  // Common bot patterns
  if (user.login) {
    const botPatterns = [
      /^dependabot/i,
      /^renovate/i,
      /^greenkeeper/i,
      /^snyk-bot/i,
      /^codecov/i,
      /^allcontributors/i,
    ];

    return botPatterns.some((pattern) => pattern.test(user.login!));
  }

  return false;
}

/**
 * Filter out bot users from an array
 */
export function filterBots<T extends { user?: { type?: string; login?: string } }>(
  items: T[]
): T[] {
  return items.filter((item) => !isBot(item.user));
}

