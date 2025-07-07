import { SectionHeader } from '@/components/home/section-header';
import { siteConfig } from '@/lib/home';
import { Building2, Shield, Users, Wrench, GraduationCap, Cloud } from 'lucide-react';
import Link from 'next/link';

export function EnterpriseSection() {
  const features = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Role-Based Access Control (RBAC)',
      description: 'Granular permissions and role management to ensure secure access across your organization.'
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Single Sign-On (SSO)',
      description: 'Seamless integration with your existing identity providers for streamlined authentication.'
    },
    {
      icon: <Building2 className="h-6 w-6" />,
      title: 'Custom Agents',
      description: 'Deploy specialized AI agents tailored to your specific business processes and workflows.'
    },
    {
      icon: <Wrench className="h-6 w-6" />,
      title: 'Custom Tools & Integrations',
      description: 'Build and deploy custom tools that integrate seamlessly with your existing tech stack.'
    },
    {
      icon: <GraduationCap className="h-6 w-6" />,
      title: 'Training & Support',
      description: 'Dedicated training programs and priority support to maximize your team\'s productivity.'
    },
    {
      icon: <Cloud className="h-6 w-6" />,
      title: 'Single Tenant Deployment',
      description: 'Isolated, secure cloud deployments with dedicated resources for maximum performance.'
    }
  ];

  return (
    <section
      id="enterprise"
      className="flex flex-col items-center justify-center w-full relative pb-18"
    >
      <div className="w-full max-w-6xl mx-auto px-6">
        <SectionHeader>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1">
            Enterprise-Grade AI Platform
          </h2>
          <p className="text-muted-foreground text-center text-balance font-medium">
            Deploy Operator at scale with advanced security, custom integrations, and dedicated support.
          </p>
        </SectionHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-12">
          <div className="rounded-xl bg-[#F3F4F6] dark:bg-[#F9FAFB]/[0.02] border border-border p-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Building2 className="h-5 w-5" />
                <span>Enterprise Deployment</span>
              </div>
              <div className="relative">
                <h3 className="text-2xl font-semibold tracking-tight">
                  Single Tenant Managed Infrastructure
                </h3>
                <p className="text-muted-foreground mt-2">
                  Dedicated cloud infrastructure with enterprise-grade security, compliance, and performance guarantees.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary/10 border-secondary/20 text-secondary">
                  SOC 2 Compliant
                </span>
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary/10 border-secondary/20 text-secondary">
                  GDPR Ready
                </span>
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary/10 border-secondary/20 text-secondary">
                  99.9% SLA
                </span>
              </div>
              <Link
                href="mailto:enterprise@omni.ai"
                className="group inline-flex h-10 items-center justify-center gap-2 text-sm font-medium tracking-wide rounded-full text-primary-foreground dark:text-black px-6 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] bg-primary dark:bg-white hover:bg-primary/90 dark:hover:bg-white/90 transition-all duration-200 w-fit"
              >
                <span>Contact Sales</span>
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-white/20 dark:bg-black/10 group-hover:bg-white/30 dark:group-hover:bg-black/20 transition-colors duration-200">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-primary-foreground dark:text-black"
                  >
                    <path
                      d="M7 17L17 7M17 7H8M17 7V16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </div>
          </div>

          <div className="rounded-xl bg-[#F3F4F6] dark:bg-[#F9FAFB]/[0.02] border border-border p-6">
            <div className="flex flex-col gap-6">
              <h3 className="text-xl md:text-2xl font-medium tracking-tight">
                Enterprise Features
              </h3>
              <p className="text-muted-foreground">
                Advanced capabilities designed for large organizations with complex requirements and security needs.
              </p>
              <div className="grid grid-cols-1 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="rounded-full bg-secondary/10 p-2 mt-0.5">
                      <div className="text-secondary">
                        {feature.icon}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium">{feature.title}</h4>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 