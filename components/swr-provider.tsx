'use client';

import { SWRConfig } from 'swr';
import * as React from 'react';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: async (url: string) => {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) {
            let message = `Request failed (${res.status})`;
            try {
              const body: unknown = await res.json();
              if (
                body &&
                typeof body === 'object' &&
                'error' in body &&
                typeof (body as { error?: string }).error === 'string'
              ) {
                message = (body as { error?: string }).error ?? message;
              }
            } catch {}
            throw new Error(message);
          }
          return res.json();
        },
        revalidateOnFocus: true,
        dedupingInterval: 2000,
        keepPreviousData: true,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}

