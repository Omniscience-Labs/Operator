'use client';

import { SectionHeader } from '@/components/home/section-header';
import { ProfileCard } from '@/components/ProfileCard';
import { AgentProfileCard } from '@/components/ProfileCard/AgentProfileCard';
import { InfoCard } from '@/components/InfoCard';
import { IconCloud } from '@/components/magicui/icon-cloud';
import { OmniProcessModal } from '@/components/sidebar/omni-enterprise-modal';
import { Shield, Lock, Brain, Database, Zap, Users2, Settings } from 'lucide-react';

export function BentoSection() {

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
              className="h-[420px]"
              enableTilt={true}
            />
          ))}
        </div>

        {/* Enterprise Connections Section */}
        <div className="mt-24 lg:mt-32">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-balance leading-[1.05] mb-6">
              Connect Securely to Enterprise Data and Tools
            </h3>
            <p className="text-lg md:text-xl text-muted-foreground font-normal leading-relaxed max-w-3xl mx-auto">
              Seamlessly integrate with your existing enterprise infrastructure while maintaining zero-trust security protocols.
            </p>
          </div>

          {/* Mobile-first layout with responsive positioning */}
          <div className="relative max-w-6xl mx-auto">
            {/* Mobile Layout - Stacked vertically */}
            <div className="block lg:hidden">
              {/* Icon Cloud for mobile */}
              <div className="flex items-center justify-center mx-auto w-[300px] h-[300px] mb-8">
                <div className="relative z-10 w-full h-full flex items-center justify-center scale-100">
                  <IconCloud images={enterpriseIntegrationImages} />
                </div>
              </div>

              {/* Features in a 2x2 grid below cloud on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4">
                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                    <Shield className="h-6 w-6 text-secondary" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Zero-Trust Authentication</h4>
                  <p className="text-muted-foreground text-sm">
                    Secure API connections with enterprise-grade authentication and authorization protocols.
                  </p>
                </div>

                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                    <Lock className="h-6 w-6 text-secondary" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">End-to-End Encryption</h4>
                  <p className="text-muted-foreground text-sm">
                    All data transfers are encrypted with AES-256 standards, ensuring complete privacy.
                  </p>
                </div>

                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                    <Zap className="h-6 w-6 text-secondary" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Real-Time Sync</h4>
                  <p className="text-muted-foreground text-sm">
                    Instant synchronization with your enterprise systems for up-to-date insights.
                  </p>
                </div>

                <div className="text-center p-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                    <Users2 className="h-6 w-6 text-secondary" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">RBAC</h4>
                  <p className="text-muted-foreground text-sm">
                    Role-based access control with granular permissions and enterprise-grade user management.
                  </p>
                </div>
              </div>

              {/* Bottom center feature for mobile */}
              <div className="text-center p-4 mt-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                  <Settings className="h-6 w-6 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Custom Integration Development</h4>
                <p className="text-muted-foreground text-sm">
                  Tailored integration solutions for your unique enterprise systems and workflows.
                </p>
              </div>
            </div>

            {/* Desktop Layout - Positioned around cloud */}
            <div className="hidden lg:block relative">
              {/* Central Icon Cloud */}
              <div className="relative flex items-center justify-center mx-auto w-[500px] h-[500px] mb-20">
                <div className="relative z-10 w-full h-full flex items-center justify-center scale-110">
                  <IconCloud images={enterpriseIntegrationImages} />
                </div>
              </div>

              {/* Features positioned tightly around the cloud */}
              {/* Top Left */}
              <div className="absolute top-8 left-8 text-center p-4 max-w-[180px]">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                  <Shield className="h-6 w-6 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Zero-Trust Authentication</h4>
                <p className="text-muted-foreground text-sm">
                  Secure API connections with enterprise-grade authentication and authorization protocols.
                </p>
              </div>

              {/* Top Right */}
              <div className="absolute top-8 right-8 text-center p-4 max-w-[180px]">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                  <Lock className="h-6 w-6 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">End-to-End Encryption</h4>
                <p className="text-muted-foreground text-sm">
                  All data transfers are encrypted with AES-256 standards, ensuring complete privacy.
                </p>
              </div>

              {/* Bottom Left */}
              <div className="absolute bottom-20 left-8 text-center p-4 max-w-[180px]">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                  <Zap className="h-6 w-6 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Real-Time Sync</h4>
                <p className="text-muted-foreground text-sm">
                  Instant synchronization with your enterprise systems for up-to-date insights.
                </p>
              </div>

              {/* Bottom Right */}
              <div className="absolute bottom-20 right-8 text-center p-4 max-w-[180px]">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                  <Users2 className="h-6 w-6 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">RBAC</h4>
                <p className="text-muted-foreground text-sm">
                  Role-based access control with granular permissions and enterprise-grade user management.
                </p>
              </div>

              {/* Bottom Center */}
              <div className="absolute bottom-[-40px] left-1/2 transform -translate-x-1/2 text-center p-4 max-w-[180px]">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                  <Settings className="h-6 w-6 text-secondary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Custom Integration Development</h4>
                <p className="text-muted-foreground text-sm">
                  Tailored integration solutions for your unique enterprise systems and workflows.
                </p>
              </div>
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
                Join industry leaders who trust Operator to deploy AI that amplifies their competitive edge while protecting their most valuable assets.
              </p>
              
              <div className="group inline-flex items-center gap-3 px-10 py-5 bg-secondary text-secondary-foreground rounded-2xl font-semibold text-lg transition-all duration-300 hover:bg-secondary/90 hover:shadow-xl hover:shadow-secondary/25 hover:scale-105">
                <Shield className="h-6 w-6" />
                <OmniProcessModal />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
