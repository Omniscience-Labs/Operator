import React from 'react';
import { useId } from 'react';
import { SectionHeader } from '@/components/home/section-header';
import { siteConfig } from '@/lib/home';
import { OmniProcessModal } from '@/components/sidebar/omni-enterprise-modal';

export function EnterpriseSection() {
  const enterpriseFeatures = [
    {
      title: "256-Bit Encryption",
      description: "Bank-grade AES-256 encryption protects your data at rest and in transit with FIPS 140-2 compliant security standards.",
    },
    {
      title: "Role-Based Access Control (RBAC)",
      description: "Granular permissions and role management to ensure secure access across your organization.",
    },
    {
      title: "Single Sign-On (SSO)",
      description: "Seamless integration with your existing identity providers for streamlined authentication.",
    },
    {
      title: "Custom AI Agents",
      description: "Deploy specialized AI agents tailored to your specific business processes and workflows.",
    },
    {
      title: "Custom Tools & Integrations",
      description: "Build and deploy custom tools that integrate seamlessly with your existing tech stack.",
    },
    {
      title: "Enterprise Training Programs",
      description: "Comprehensive training programs and workshops to maximize your team's productivity and AI adoption across your organization.",
    },
    {
      title: "Single Tenant Deployment",
      description: "Isolated, secure cloud deployments with dedicated resources for maximum performance.",
    },
    {
      title: "Enterprise Analytics",
      description: "Advanced analytics and reporting tools to monitor usage, performance, and ROI across your organization.",
    },
    {
      title: "Enterprise Credit Plans",
      description: "Flexible credit-based pricing plans designed for enterprise usage patterns with volume discounts and custom billing.",
    },
    {
      title: "Data Residency & Compliance",
      description: "Ensure data sovereignty with region-specific deployments and compliance with GDPR, HIPAA, SOC 2, and other regulatory standards.",
    },
    {
      title: "Virtual Private Cloud, Hybrid Cloud, and On-Premise",
      description: "Deploy Omni in your own cloud, on-premise, or a hybrid of the two. We support all major cloud providers and on-premise hardware.",
    },
    {
      title: "24/7 Enterprise Support",
      description: "Round-the-clock dedicated support with guaranteed response times and direct access to senior engineers.",
    },
  ];

  return (
    <section
      id="enterprise"
      className="flex flex-col items-center justify-center w-full relative py-20"
    >
      <div className="w-full max-w-7xl mx-auto px-6">
        <SectionHeader>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1">
            Managed Enterprise Deployments
          </h2>
          <p className="text-muted-foreground text-center text-balance font-medium">
            Omni offers fully managed Enterprise deployments with advanced security, custom enterprise tooling, and flexible enterprise credit plans.
          </p>
        </SectionHeader>

        <div className="py-12 lg:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 md:gap-2 max-w-7xl mx-auto">
            {enterpriseFeatures.map((feature) => (
              <div
                key={feature.title}
                className="relative bg-gradient-to-b dark:from-neutral-900 from-neutral-100 dark:to-neutral-950 to-white p-6 rounded-3xl overflow-hidden"
              >
                <Grid size={20} />
                <p className="text-base font-bold text-neutral-800 dark:text-white relative z-20">
                  {feature.title}
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 mt-4 text-base font-normal relative z-20">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational CTA Section */}
        <div className="flex flex-col items-center mt-16 space-y-8">
          <div className="text-center max-w-2xl">
            <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-primary mb-4">
              Supercharge your competitive advantage without giving it away
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Deploy AI agents that work exclusively for you. Keep your data, processes, and insights secure while scaling your capabilities beyond what any competitor can achieve.
            </p>
          </div>
          
          {/* Enhanced Schedule Demo CTA */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-primary rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
            <div className="relative group inline-flex h-14 items-center justify-center gap-3 text-base font-semibold tracking-wide rounded-xl text-primary-foreground dark:text-black px-12 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] bg-primary dark:bg-white hover:bg-primary/90 dark:hover:bg-white/90 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:scale-105">
              <OmniProcessModal />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const Grid = ({
  pattern,
  size,
}: {
  pattern?: number[][];
  size?: number;
}) => {
  const p = pattern ?? [
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
  ];
  return (
    <div className="pointer-events-none absolute left-1/2 top-0  -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]">
      <div className="absolute inset-0 bg-gradient-to-r  [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] dark:from-zinc-900/30 from-zinc-100/30 to-zinc-300/30 dark:to-zinc-900/30 opacity-100">
        <GridPattern
          width={size ?? 20}
          height={size ?? 20}
          x="-12"
          y="4"
          squares={p}
          className="absolute inset-0 h-full w-full  mix-blend-overlay dark:fill-white/10 dark:stroke-white/10 stroke-black/10 fill-black/10"
        />
      </div>
    </div>
  );
};

export function GridPattern({ width, height, x, y, squares, ...props }: any) {
  const patternId = useId();

  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        strokeWidth={0}
        fill={`url(#${patternId})`}
      />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([x, y]: any) => (
            <rect
              strokeWidth="0"
              key={`${x}-${y}`}
              width={width + 1}
              height={height + 1}
              x={x * width}
              y={y * height}
            />
          ))}
        </svg>
      )}
    </svg>
  );
} 