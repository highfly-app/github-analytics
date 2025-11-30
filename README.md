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

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

Create a `.env` file with the following:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# GitHub App credentials
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY_PATH=/path/to/private-key.pem  # For development
# OR for production:
# GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

# Repository where your GitHub App is installed (required for rate limit optimization)
GITHUB_APP_REPO_OWNER=your-username
GITHUB_APP_REPO_NAME=your-repo-name
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

- `DATABASE_URL`: PostgreSQL database connection string (required for caching)
- `GITHUB_APP_ID`: GitHub App ID (required)
- `GITHUB_PRIVATE_KEY_PATH`: Path to GitHub App private key file (development)
- `GITHUB_PRIVATE_KEY`: GitHub App private key content (production)
- `GITHUB_APP_REPO_OWNER`: Owner of a repository where your GitHub App is installed (required)
- `GITHUB_APP_REPO_NAME`: Name of a repository where your GitHub App is installed (required)
- `NEXT_PUBLIC_APP_URL`: (Optional) Allowed origins for CORS, comma-separated (default: localhost:3000)

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- SWR for data fetching
- Recharts for visualizations
- Octokit for GitHub API
