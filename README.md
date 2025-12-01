# GitHub Analytics

Analyze any public GitHub repository's issues, PRs, and more.

## Try it Online

🌐 Use the hosted version at **[HighFly](https://highfly.app/analytics)**

No setup required - just enter a GitHub repository URL and start analyzing!

## Features

- **Issue Lifecycle Metrics**: Track response times, triage times, and resolution times
- **Reviewer Insights**: Understand PR review patterns and reviewer performance
- **Contributor Friction**: Measure first-time vs returning contributor experience
- **Backlog Health**: Monitor open issues and PRs with age-based metrics

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- A GitHub App (create one at https://github.com/settings/apps/new)
- **PostHog is optional** - Analytics tracking can be enabled but is not required

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

Create a `.env` file with the following:

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# GitHub App credentials (Required)
GITHUB_APP_ID=your_app_id
GITHUB_APP_REPO_OWNER=your-username
GITHUB_APP_REPO_NAME=your-repo-name

# GitHub Private Key (Required - choose one based on environment)
# For development:
GITHUB_PRIVATE_KEY_PATH=/path/to/private-key.pem
# OR for production:
# GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

# Database SSL (Optional)
# Set to "disable" to disable SSL, or "require" to require SSL
# PGSSLMODE=disable

# CORS Configuration (Optional)
# Comma-separated list of allowed origins (default: localhost:3000)
# NEXT_PUBLIC_APP_URL=localhost:3000,highfly.app

# Asset Prefix (Optional)
# Used when proxying assets through another domain
# NEXT_PUBLIC_ASSET_PREFIX=/analytics

# PostHog Analytics (Optional)
# Only required if you want to enable analytics tracking
# POSTHOG_API_KEY=your_posthog_api_key
# POSTHOG_ENV_ID=your_posthog_env_id
# NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
# NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
# NEXT_PUBLIC_VERCEL_ENV=production
```

3. Run the database migration:

```bash
# Run the migration to create the githubAnalyticsCache table
# Using psql or your preferred PostgreSQL client:
psql $DATABASE_URL -f migrations/001_add_github_analytics_cache.sql
```

4. Run the development server:

```bash
pnpm dev
```

The service will run on **http://localhost:3000**.

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## GitHub App Setup

1. Create a GitHub App at https://github.com/settings/apps/new
2. Set the following permissions:
   - Repository permissions:
     - Issues: Read-only
     - Pull requests: Read-only
     - Metadata: Read-only
3. Install the app on at least one repository (specified in `GITHUB_APP_REPO_OWNER` and `GITHUB_APP_REPO_NAME`)
4. Copy the App ID and generate a private key

## Environment Variables

### Required

- `DATABASE_URL`: PostgreSQL database connection string (required for caching)
- `GITHUB_APP_ID`: GitHub App ID
- `GITHUB_APP_REPO_OWNER`: Owner of a repository where your GitHub App is installed (required for rate limit optimization)
- `GITHUB_APP_REPO_NAME`: Name of a repository where your GitHub App is installed (required for rate limit optimization)
- `GITHUB_PRIVATE_KEY_PATH` or `GITHUB_PRIVATE_KEY`:
  - **Development**: `GITHUB_PRIVATE_KEY_PATH` - Path to GitHub App private key file (e.g., `/path/to/private-key.pem`)
  - **Production**: `GITHUB_PRIVATE_KEY` - GitHub App private key content as a string (with `\n` for newlines)

### Optional

- `PGSSLMODE`: PostgreSQL SSL mode (`disable` or `require`, defaults to SSL enabled in production)
- `NEXT_PUBLIC_APP_URL`: Comma-separated list of allowed origins for CORS (default: `localhost:3000`)
- `NEXT_PUBLIC_ASSET_PREFIX`: Asset prefix when proxying through another domain (e.g., `/analytics`)
- `NEXT_PUBLIC_VERCEL_ENV`: Vercel environment (set to `production` in production deployments)

### PostHog Analytics (Optional)

PostHog is **completely optional** and only needed if you want to track analytics. The app works fine without it.

- `POSTHOG_API_KEY`: PostHog server-side API key (for Next.js config)
- `POSTHOG_ENV_ID`: PostHog environment ID (for Next.js config)
- `NEXT_PUBLIC_POSTHOG_KEY`: PostHog project API key (for client-side tracking)
- `NEXT_PUBLIC_POSTHOG_HOST`: PostHog host URL (default: `https://us.i.posthog.com`)

**Note**: PostHog tracking is automatically disabled in non-production environments to save on usage costs. To test PostHog locally, you can modify the condition in `lib/posthog.ts` and `components/PostHogProvider.tsx`.

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- SWR for data fetching
- Recharts for visualizations
- Octokit for GitHub API
