'use client';

import { SectionHeader } from '@/components/home/section-header';
import { ProfileCard } from '@/components/ProfileCard';
import { AgentProfileCard } from '@/components/ProfileCard/AgentProfileCard';
import { InfoCard } from '@/components/InfoCard';
import { IconCloud } from '@/components/magicui/icon-cloud';
import { AnimatedBeam } from '@/components/magicui/animated-beam';
import { OmniProcessModal } from '@/components/sidebar/omni-enterprise-modal';
import { Shield, Lock, Brain, Database, Zap, Users2, Settings } from 'lucide-react';
import { useRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Clean white pill component for features
const FeaturePill = forwardRef<
  HTMLDivElement,
  { 
    icon: React.ReactNode; 
    title: string; 
    description: string; 
    className?: string;
  }
>(({ icon, title, description, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-white dark:bg-gray-900 rounded-full px-6 py-4 shadow-lg border border-gray-200 dark:border-gray-700",
        "flex items-center gap-4 min-w-[280px] max-w-[320px]",
        "hover:shadow-xl transition-all duration-300 hover:scale-105",
        "backdrop-blur-sm bg-white/80 dark:bg-gray-900/80",
        className
      )}
    >
      <div className="flex-shrink-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center border border-secondary/20">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
          {title}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {description}
        </p>
      </div>
    </div>
  );
});

FeaturePill.displayName = "FeaturePill";

export function BentoSection() {
  // Refs for AnimatedBeam connections
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const feature1Ref = useRef<HTMLDivElement>(null);
  const feature2Ref = useRef<HTMLDivElement>(null);
  const feature3Ref = useRef<HTMLDivElement>(null);
  const feature4Ref = useRef<HTMLDivElement>(null);
  const feature5Ref = useRef<HTMLDivElement>(null);

  // Transform secure AI features to match InfoCard interface
  const secureAIAgents = [
    {
      agent_id: 'private-ai-training',
      name: 'Private AI Training',
      description: 'Train AI models exclusively on your proprietary data. Create specialized capabilities tailored to your industry while ensuring your competitive insights never leave your organization.',
      avatar: '🔒',
      avatar_color: '#3B82F6',
      tags: ['Zero Data Leakage', 'Proprietary Training', 'Competitive Edge'],
      keyPoints: [
        'Models trained exclusively on your data',
        'Intellectual property remains secure',
        'Domain-specific AI capabilities',
        'Your data becomes your competitive moat'
      ]
    },
    {
      agent_id: 'zero-trust-security',
      name: 'Zero-Trust Security',
      description: 'Military-grade security with zero-trust architecture. Every interaction is encrypted with AES-256 standards and continuous threat monitoring.',
      avatar: '🛡️',
      avatar_color: '#10B981',
      tags: ['AES-256 Encryption', 'Zero-Trust Architecture', 'Real-time Monitoring'],
      keyPoints: [
        'End-to-end encryption for all data transfers',
        'Network segmentation & identity verification',
        'Real-time threat detection & response',
        'Behavioral analysis & automated security'
      ]
    },
    {
      agent_id: 'competitive-moat',
      name: 'Competitive Moat',
      description: 'Protect your market position with isolated AI ecosystems. Your insights, customer intelligence, and strategic data stay exclusively yours.',
      avatar: '⚔️',
      avatar_color: '#8B5CF6',
      tags: ['Data Isolation', 'Competitor Protection', 'IP Safeguarding'],
      keyPoints: [
        'Proprietary insights never benefit competitors',
        'Advanced data lineage tracking',
        'Ironclad data sovereignty guarantees',
        'Strategic intelligence remains internal'
      ]
    },
    {
      agent_id: 'enterprise-sovereignty',
      name: 'Enterprise Sovereignty',
      description: 'Complete control over your AI infrastructure with full data sovereignty and private cloud deployment. No external dependencies.',
      avatar: '👑',
      avatar_color: '#F59E0B',
      tags: ['Private Cloud', 'Full Data Ownership', 'Custom Governance'],
      keyPoints: [
        'Dedicated private cloud infrastructure',
        'Complete administrative control',
        'Custom governance frameworks',
        'Zero external dependencies'
      ]
    }
  ];

  // Enterprise integration icon slugs for IconCloud
  const enterpriseIntegrationSlugs = [
    // ERP & Business Systems
    "sap", "oracle", "microsoft", "salesforce", "workday", "servicenow", "atlassian", "tableau",
    
    // Manufacturing & Industrial
    "siemens", "schneiderelectric", "abb", "honeywell", "emerson", "ge",
    
    // Supply Chain & Logistics
    "fedex", "ups", "dhl", "caterpillar", "johndeere", "cummins",
    
    // Financial & Accounting
    "stripe", "paypal", "visa", "mastercard", "americanexpress", "jpmorgan",
    
    // Cloud & Infrastructure
    "amazonaws", "microsoftazure", "googlecloud", "oracle", "ibm", "vmware", "redhat", "docker", "kubernetes",
    
    // Communication & Collaboration
    "microsoft", "slack", "zoom", "discord", "telegram", "whatsapp",
    
    // Document & Content Management
    "adobe", "dropbox", "box", "googledrive", "onedrive", "notion", "confluence",
    
    // Security & Compliance
    "okta", "auth0", "crowdstrike", "paloaltonetworks", "checkpoint", "fortinet", "zscaler",
    
    // Quality & Testing
    "jenkins", "gitlab", "github", "sonarqube", "cypress", "selenium",
    
    // IoT & Sensors
    "nvidia", "intel", "qualcomm", "arm", "broadcom",
    
    // Time & Scheduling
    "calendly", "outlook", "googlecalendar", "hubspot", "zendesk", "freshworks",
    
    // Workflow & Automation
    "zapier", "uipath", "workato"
  ];

  // Convert slugs to image URLs
  const enterpriseIntegrationImages = enterpriseIntegrationSlugs.map(
    (slug) => `https://cdn.simpleicons.org/${slug}/${slug}`
  );

  return (
    <section
      id="bento"
      className="flex flex-col items-center justify-center w-full relative py-24 lg:py-32"
    >
      <div className="w-full max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-secondary/10 rounded-2xl border border-secondary/20">
              <Shield className="h-6 w-6 text-secondary" />
            </div>
            <span className="text-sm font-semibold text-secondary uppercase tracking-wider">
              Enterprise AI Security
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05] mb-8">
            Built for Secure Growth
          </h2>
          
          <div className="max-w-4xl mx-auto space-y-6">
            <p className="text-xl md:text-2xl text-muted-foreground font-normal leading-relaxed">
              Your data and knowledge are your competitive edge.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground/70 font-normal leading-relaxed max-w-3xl mx-auto">
              Supercharge your business with AI that learns exclusively from your proprietary assets—without sharing your advantage with competitors or public models.
            </p>
          </div>
        </div>

        {/* Feature Cards - 2x2 Grid using InfoCard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {secureAIAgents.map((agent) => (
            <InfoCard
              key={agent.agent_id}
              title={agent.name}
              description={agent.description}
              avatar={agent.avatar}
              avatar_color={agent.avatar_color}
              tags={agent.tags}
              keyPoints={agent.keyPoints}
              className="min-h-[380px] lg:h-[420px] h-auto"
              enableTilt={true}
            />
          ))}
        </div>

        {/* Enterprise Connections Section with AnimatedBeam */}
        <div className="mt-24 lg:mt-32">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-balance leading-[1.05] mb-6">
              Connect Securely to Enterprise Data and Tools
            </h3>
            <p className="text-lg md:text-xl text-muted-foreground font-normal leading-relaxed max-w-3xl mx-auto">
              Seamlessly integrate with your existing enterprise infrastructure while maintaining zero-trust security protocols.
            </p>
          </div>

          {/* Mobile Layout - Stacked vertically */}
          <div className="block lg:hidden">
            <div className="space-y-6 px-4">
              <div className="flex justify-center">
                <FeaturePill
                  icon={<Shield className="h-5 w-5 text-secondary" />}
                  title="Zero-Trust Authentication"
                  description="Secure API connections with enterprise-grade authentication and authorization protocols."
                />
              </div>
              <div className="flex justify-center">
                <FeaturePill
                  icon={<Lock className="h-5 w-5 text-secondary" />}
                  title="End-to-End Encryption"
                  description="All data transfers are encrypted with AES-256 standards, ensuring complete privacy."
                />
              </div>
              <div className="flex justify-center">
                <FeaturePill
                  icon={<Zap className="h-5 w-5 text-secondary" />}
                  title="Real-Time Sync"
                  description="Instant synchronization with your enterprise systems for up-to-date insights."
                />
              </div>
              <div className="flex justify-center">
                <FeaturePill
                  icon={<Users2 className="h-5 w-5 text-secondary" />}
                  title="RBAC"
                  description="Role-based access control with granular permissions and enterprise-grade user management."
                />
              </div>
              <div className="flex justify-center">
                <FeaturePill
                  icon={<Settings className="h-5 w-5 text-secondary" />}
                  title="Custom Integration Development"
                  description="Tailored integration solutions for your unique enterprise systems and workflows."
                />
              </div>
            </div>
          </div>

          {/* Desktop Layout with AnimatedBeam */}
          <div className="hidden lg:block">
            <div 
              ref={containerRef}
              className="relative w-full max-w-5xl mx-auto h-[600px] overflow-hidden"
            >
              {/* Central Icon Cloud */}
              <div 
                ref={centerRef}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] z-10"
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <IconCloud images={enterpriseIntegrationImages} />
                </div>
              </div>

              {/* Feature Pills positioned around the center */}
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2">
                <FeaturePill
                  ref={feature1Ref}
                  icon={<Shield className="h-5 w-5 text-secondary" />}
                  title="Zero-Trust Authentication"
                  description="Secure API connections with enterprise-grade authentication and authorization protocols."
                />
              </div>

              <div className="absolute top-1/2 left-8 transform -translate-y-1/2">
                <FeaturePill
                  ref={feature2Ref}
                  icon={<Lock className="h-5 w-5 text-secondary" />}
                  title="End-to-End Encryption"
                  description="All data transfers are encrypted with AES-256 standards, ensuring complete privacy."
                />
              </div>

              <div className="absolute top-1/2 right-8 transform -translate-y-1/2">
                <FeaturePill
                  ref={feature3Ref}
                  icon={<Zap className="h-5 w-5 text-secondary" />}
                  title="Real-Time Sync"
                  description="Instant synchronization with your enterprise systems for up-to-date insights."
                />
              </div>

              <div className="absolute bottom-32 left-1/4 transform -translate-x-1/2">
                <FeaturePill
                  ref={feature4Ref}
                  icon={<Users2 className="h-5 w-5 text-secondary" />}
                  title="RBAC"
                  description="Role-based access control with granular permissions and enterprise-grade user management."
                />
              </div>

              <div className="absolute bottom-32 right-1/4 transform translate-x-1/2">
                <FeaturePill
                  ref={feature5Ref}
                  icon={<Settings className="h-5 w-5 text-secondary" />}
                  title="Custom Integration Development"
                  description="Tailored integration solutions for your unique enterprise systems and workflows."
                />
              </div>

              {/* AnimatedBeam connections */}
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={feature1Ref}
                toRef={centerRef}
                curvature={-50}
                duration={3}
                delay={0.5}
              />
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={feature2Ref}
                toRef={centerRef}
                curvature={0}
                duration={2.5}
                delay={1}
              />
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={feature3Ref}
                toRef={centerRef}
                curvature={0}
                duration={2.5}
                delay={1.5}
                reverse
              />
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={feature4Ref}
                toRef={centerRef}
                curvature={50}
                duration={3}
                delay={0.3}
              />
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={feature5Ref}
                toRef={centerRef}
                curvature={-50}
                duration={3}
                delay={0.8}
                reverse
              />
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 lg:mt-32">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary/5 to-primary/5 border border-border/50 p-12 lg:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:20px_20px] opacity-20"></div>
            
            <div className="relative z-10 text-center">
              <div className="flex items-center justify-center gap-4 mb-8">
                <Brain className="h-8 w-8 text-secondary" />
                <Database className="h-8 w-8 text-secondary" />
                <Lock className="h-8 w-8 text-secondary" />
              </div>
              
              <h3 className="text-3xl lg:text-4xl font-semibold text-foreground mb-6">
                Ready to Secure Your AI Advantage?
              </h3>
              
              <p className="text-lg lg:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                Join industry leaders who trust Omni to deploy AI that amplifies their competitive edge while protecting their most valuable assets.
              </p>
              
              {/* Enhanced Schedule Demo CTA */}
              <div className="relative group inline-block">
                <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-primary rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
                <div className="relative group inline-flex h-14 items-center justify-center gap-3 text-base font-semibold tracking-wide rounded-xl text-primary-foreground dark:text-black px-8 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] bg-primary dark:bg-white hover:bg-primary/90 dark:hover:bg-white/90 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:scale-105">
                  <OmniProcessModal />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
