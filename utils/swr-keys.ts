export const swrKeys = {
  analytics: (owner: string, repo: string, timeRange?: string) =>
    `/api/analytics/github?owner=${owner}&repo=${repo}${timeRange ? `&timeRange=${timeRange}` : ''}`,
};

