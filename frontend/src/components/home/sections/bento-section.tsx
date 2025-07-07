'use client';

import { SectionHeader } from '@/components/home/section-header';
import { siteConfig } from '@/lib/home';
import { Globe } from '@/components/home/ui/globe';

export function BentoSection() {
  const features = [
    {
      id: 1,
      title: 'Advanced Task Security',
      description: 'Safeguard your tasks with state-of-art encryption and secure access to your workflow data.',
      icon: (
        <div className="w-32 h-32 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-full flex items-center justify-center">
          <svg className="w-16 h-16 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      )
    },
    {
      id: 2,
      title: 'Scalable for Teams',
      description: 'Grow with your team. Track tasks across multiple workspaces and all team members.',
      icon: (
        <div className="w-48 h-48 rounded-full flex items-center justify-center relative overflow-hidden">
          <Globe className="scale-100" />
        </div>
      )
    }
  ];

  return (
    <section
      id="bento"
      className="flex flex-col items-center justify-center w-full relative py-20"
    >
      <div className="w-full max-w-6xl mx-auto px-6">
        <SectionHeader>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1">
            Built for Secure Growth
          </h2>
          <p className="text-muted-foreground text-center text-balance font-medium">
            Where advanced security meets seamless scalability—designed to protect your data and empower your growth.
          </p>
        </SectionHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="bg-[#F3F4F6] dark:bg-[#F9FAFB]/[0.02] rounded-2xl p-8 border border-border hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="flex items-center justify-center">
                  {feature.icon}
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
