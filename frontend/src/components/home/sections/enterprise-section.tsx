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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-16">
          {/* Left Panel - Deployment Info */}
          <div className="space-y-8">
            <div className="rounded-2xl bg-gradient-to-br from-secondary/5 to-secondary/10 border border-border p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-secondary/10 rounded-xl">
                  <Building2 className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">
                    Enterprise Deployment
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Single Tenant Managed Infrastructure
                  </p>
                </div>
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Dedicated cloud infrastructure with enterprise-grade security, compliance readiness, and performance guarantees tailored to your organization's needs.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-8">
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium bg-secondary/10 border-secondary/20 text-secondary">
                  Dedicated Resources
                </span>
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium bg-secondary/10 border-secondary/20 text-secondary">
                  High Availability
                </span>
                <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium bg-secondary/10 border-secondary/20 text-secondary">
                  24/7 Monitoring
                </span>
              </div>
              
              <Link
                href="mailto:enterprise@omni.ai"
                className="group inline-flex h-11 items-center justify-center gap-2 text-sm font-medium tracking-wide rounded-xl text-primary-foreground dark:text-black px-6 shadow-[0_1px_3px_rgba(16,24,40,0.1),0_1px_2px_rgba(16,24,40,0.06)] bg-primary dark:bg-white hover:bg-primary/90 dark:hover:bg-white/90 transition-all duration-200 w-full"
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

          {/* Right Panel - Features Grid */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight mb-4">
                Enterprise Features
              </h3>
              <p className="text-muted-foreground mb-8">
                Advanced capabilities designed for large organizations with complex requirements and security needs.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl border border-border hover:bg-secondary/5 transition-colors duration-200">
                  <div className="rounded-lg bg-secondary/10 p-2.5 mt-1">
                    <div className="text-secondary">
                      {feature.icon}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-primary">{feature.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 