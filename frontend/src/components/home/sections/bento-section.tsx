'use client';

import { SectionHeader } from '@/components/home/section-header';
import { ProfileCard } from '@/components/ProfileCard';
import { Shield, Lock, Brain, Database, Zap, Users, CheckCircle, ArrowRight } from 'lucide-react';

export function BentoSection() {
  const secureAIFeatures = [
    {
      id: 1,
      title: 'Private AI Training',
      subtitle: 'Your Data, Your Edge',
      description: 'Train AI models exclusively on your proprietary data. Keep intellectual property secure while building competitive advantages that stay within your organization.',
      avatar: '/api/placeholder/400/400?text=🔒',
      miniAvatar: '/api/placeholder/100/100?text=🔒',
      handle: 'privateai',
      status: 'Enterprise Ready',
      behindGradient: 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(220,60%,95%,var(--card-opacity)) 4%,hsla(220,40%,90%,calc(var(--card-opacity)*0.6)) 10%,hsla(220,20%,85%,calc(var(--card-opacity)*0.3)) 50%,hsla(220,0%,80%,0) 100%),radial-gradient(35% 52% at 55% 20%,rgba(59,130,246,0.15) 0%,rgba(59,130,246,0) 100%),radial-gradient(100% 100% at 50% 50%,rgba(59,130,246,0.08) 1%,rgba(59,130,246,0) 76%)',
      innerGradient: 'linear-gradient(145deg,rgba(30,64,175,0.05) 0%,rgba(55,48,163,0.03) 100%)',
      keyFeatures: ['Zero data leakage', 'Proprietary model training', 'Competitive advantage protection']
    },
    {
      id: 2,
      title: 'Zero-Trust Security',
      subtitle: 'Military-Grade Protection',
      description: 'Enterprise-grade encryption and zero-trust architecture ensure your sensitive data and AI models remain completely isolated from external threats and competitors.',
      avatar: '/api/placeholder/400/400?text=🛡️',
      miniAvatar: '/api/placeholder/100/100?text=🛡️',
      handle: 'zerotrust',
      status: 'SOC 2 Certified',
      behindGradient: 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(140,60%,95%,var(--card-opacity)) 4%,hsla(140,40%,90%,calc(var(--card-opacity)*0.6)) 10%,hsla(140,20%,85%,calc(var(--card-opacity)*0.3)) 50%,hsla(140,0%,80%,0) 100%),radial-gradient(35% 52% at 55% 20%,rgba(16,185,129,0.15) 0%,rgba(16,185,129,0) 100%),radial-gradient(100% 100% at 50% 50%,rgba(16,185,129,0.08) 1%,rgba(16,185,129,0) 76%)',
      innerGradient: 'linear-gradient(145deg,rgba(6,95,70,0.05) 0%,rgba(4,120,87,0.03) 100%)',
      keyFeatures: ['End-to-end encryption', 'SOC 2 + HIPAA compliance', 'Audit trail monitoring']
    },
    {
      id: 3,
      title: 'Competitive Moat',
      subtitle: 'Protect Your Advantage',
      description: 'Maintain your competitive edge by ensuring proprietary insights, customer data, and business intelligence never benefit competitors or public AI models.',
      avatar: '/api/placeholder/400/400?text=⚔️',
      miniAvatar: '/api/placeholder/100/100?text=⚔️',
      handle: 'competitive',
      status: 'Market Protection',
      behindGradient: 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(260,60%,95%,var(--card-opacity)) 4%,hsla(260,40%,90%,calc(var(--card-opacity)*0.6)) 10%,hsla(260,20%,85%,calc(var(--card-opacity)*0.3)) 50%,hsla(260,0%,80%,0) 100%),radial-gradient(35% 52% at 55% 20%,rgba(139,92,246,0.15) 0%,rgba(139,92,246,0) 100%),radial-gradient(100% 100% at 50% 50%,rgba(139,92,246,0.08) 1%,rgba(139,92,246,0) 76%)',
      innerGradient: 'linear-gradient(145deg,rgba(91,33,182,0.05) 0%,rgba(109,40,217,0.03) 100%)',
      keyFeatures: ['Data isolation', 'Competitor protection', 'IP safeguarding']
    },
    {
      id: 4,
      title: 'Enterprise Sovereignty',
      subtitle: 'Complete Control',
      description: 'Deploy AI infrastructure with full data sovereignty. Self-hosted solutions that learn and improve exclusively from your operations while maintaining complete ownership.',
      avatar: '/api/placeholder/400/400?text=👑',
      miniAvatar: '/api/placeholder/100/100?text=👑',
      handle: 'sovereign',
      status: 'Self-Hosted',
      behindGradient: 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(35,60%,95%,var(--card-opacity)) 4%,hsla(35,40%,90%,calc(var(--card-opacity)*0.6)) 10%,hsla(35,20%,85%,calc(var(--card-opacity)*0.3)) 50%,hsla(35,0%,80%,0) 100%),radial-gradient(35% 52% at 55% 20%,rgba(245,158,11,0.15) 0%,rgba(245,158,11,0) 100%),radial-gradient(100% 100% at 50% 50%,rgba(245,158,11,0.08) 1%,rgba(245,158,11,0) 76%)',
      innerGradient: 'linear-gradient(145deg,rgba(146,64,14,0.05) 0%,rgba(180,83,9,0.03) 100%)',
      keyFeatures: ['On-premise deployment', 'Full data ownership', 'Custom governance']
    }
  ];

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

        {/* Feature Cards - 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {secureAIFeatures.map((feature) => (
            <div key={feature.id} className="group relative">
              <div className="relative overflow-hidden rounded-3xl bg-background/50 backdrop-blur-sm border border-border/50 p-8 lg:p-10 transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 hover:border-border/70 hover:-translate-y-1">
                {/* Subtle background gradient */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                  style={{
                    background: feature.behindGradient
                  }}
                />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-secondary/10 rounded-2xl border border-secondary/20 group-hover:border-secondary/30 transition-colors duration-300">
                      <div className="text-2xl">{feature.avatar.includes('🔒') ? '🔒' : feature.avatar.includes('🛡️') ? '🛡️' : feature.avatar.includes('⚔️') ? '⚔️' : '👑'}</div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl lg:text-3xl font-semibold text-foreground mb-2 group-hover:text-foreground transition-colors duration-300">
                        {feature.title}
                      </h3>
                      <p className="text-base lg:text-lg text-secondary font-medium">
                        {feature.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed mb-6 text-base lg:text-lg">
                    {feature.description}
                  </p>

                  {/* Key Features */}
                  <div className="space-y-3 mb-8">
                    {feature.keyFeatures.map((keyFeature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0" />
                        <span className="text-sm lg:text-base text-muted-foreground">
                          {keyFeature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Status Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    {feature.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-24 lg:mt-32">
          <div className="relative max-w-4xl mx-auto">
            <div className="relative p-8 lg:p-12 rounded-3xl bg-gradient-to-br from-secondary/5 to-secondary/8 border border-secondary/20 backdrop-blur-sm overflow-hidden">
              {/* Subtle background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 25% 25%, rgba(var(--secondary), 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(var(--secondary), 0.1) 0%, transparent 50%)`
                }} />
              </div>
              
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
                
                <button className="group inline-flex items-center gap-3 px-10 py-5 bg-secondary text-secondary-foreground rounded-2xl font-semibold text-lg transition-all duration-300 hover:bg-secondary/90 hover:shadow-xl hover:shadow-secondary/25 hover:scale-105">
                  <Shield className="h-6 w-6" />
                  <span>Schedule Security Demo</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
