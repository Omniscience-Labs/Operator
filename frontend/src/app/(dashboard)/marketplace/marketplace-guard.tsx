'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureFlag } from '@/lib/feature-flags';
import { Skeleton } from '@/components/ui/skeleton';

interface MarketplaceGuardProps {
  children: React.ReactNode;
}

export function MarketplaceGuard({ children }: MarketplaceGuardProps) {
  const router = useRouter();
  const { enabled: marketplaceEnabled, loading } = useFeatureFlag('agent_marketplace');

  useEffect(() => {
    if (!loading && !marketplaceEnabled) {
      router.replace('/dashboard');
    }
  }, [loading, marketplaceEnabled, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!marketplaceEnabled) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}