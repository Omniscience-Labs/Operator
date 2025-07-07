import React from 'react';
import { useId } from 'react';
import { SectionHeader } from '@/components/home/section-header';
import { siteConfig } from '@/lib/home';
import Link from 'next/link';

export function EnterpriseSection() {
  const enterpriseFeatures = [
    {
      title: "HIPAA and SOC2 Compliant",
      description: "Our applications are HIPAA and SOC2 compliant, your data is safe with us, always.",
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
      title: "Training & Support",
      description: "Dedicated training programs and priority support to maximize your team's productivity.",
    },
    {
      title: "Single Tenant Deployment",
      description: "Isolated, secure cloud deployments with dedicated resources for maximum performance.",
    },
    {
      title: "Enterprise Analytics",
      description: "Advanced analytics and reporting tools to monitor usage, performance, and ROI across your organization.",
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
            Enterprise-Grade AI Platform
          </h2>
          <p className="text-muted-foreground text-center text-balance font-medium">
            Deploy Operator at scale with advanced security, custom integrations, and dedicated support.
          </p>
        </SectionHeader>

        <div className="py-20 lg:py-40">
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

        {/* Contact Sales CTA */}
        <div className="flex justify-center mt-12">
          <Link
            href="mailto:enterprise@omni.ai"
            className="group inline-flex h-11 items-center justify-center gap-2 text-sm font-medium tracking-wide rounded-xl text-primary-foreground dark:text-black px-8 shadow-[0_1px_3px_rgba(16,24,40,0.1),0_1px_2px_rgba(16,24,40,0.06)] bg-primary dark:bg-white hover:bg-primary/90 dark:hover:bg-white/90 transition-all duration-200"
          >
            <span>Contact Sales</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary-foreground dark:text-black group-hover:translate-x-1 transition-transform duration-200"
            >
              <path
                d="M7 17L17 7M17 7H8M17 7V16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
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