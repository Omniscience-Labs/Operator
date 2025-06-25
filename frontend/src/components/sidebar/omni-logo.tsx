'use client';

import { ThreeSpinner } from '@/components/ui/three-spinner';
import { useEffect, useState } from 'react';

export function OmniLogo() {
  const [mounted, setMounted] = useState(false);

  // After mount, we can access the theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="h-6 w-6" />;
  }

  return (
    <div className="flex h-6 w-6 items-center justify-center flex-shrink-0">
      <ThreeSpinner 
        size={32} 
        color="currentColor"
        className="flex-shrink-0"
      />
    </div>
  );
}
