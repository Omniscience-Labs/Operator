import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  viewMode: 'grid' | 'list';
}

export const LoadingState = ({ viewMode }: LoadingStateProps) => {
  const skeletonCount = viewMode === 'grid' ? 8 : 8;
  
  return (
    <div className={viewMode === 'grid' ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 sm:gap-6" : "space-y-4"}>
      {Array.from({ length: skeletonCount }, (_, i) => (
        <div key={i} className="min-h-[400px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 space-y-4 h-full flex flex-col">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 rounded" />
              <Skeleton className="h-4 rounded w-3/4" />
              <Skeleton className="h-4 rounded w-1/2" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded" />
              <Skeleton className="h-10 w-12 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}