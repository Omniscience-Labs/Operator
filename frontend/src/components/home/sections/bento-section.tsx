'use client';

import { SectionHeader } from '@/components/home/section-header';
import { ProfileCard } from '@/components/ProfileCard';
import { OrbitingCircles } from '@/components/home/ui/orbiting-circle';
import { OmniProcessModal } from '@/components/sidebar/omni-enterprise-modal';
import { Shield, Lock, Brain, Database, Zap, Users, CheckCircle, ArrowRight, Cloud, Globe, Settings, FileText, BarChart3, MessageSquare, Calendar, Mail, Search } from 'lucide-react';

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
      status: 'Security Certified',
      behindGradient: 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(140,60%,95%,var(--card-opacity)) 4%,hsla(140,40%,90%,calc(var(--card-opacity)*0.6)) 10%,hsla(140,20%,85%,calc(var(--card-opacity)*0.3)) 50%,hsla(140,0%,80%,0) 100%),radial-gradient(35% 52% at 55% 20%,rgba(16,185,129,0.15) 0%,rgba(16,185,129,0) 100%),radial-gradient(100% 100% at 50% 50%,rgba(16,185,129,0.08) 1%,rgba(16,185,129,0) 76%)',
      innerGradient: 'linear-gradient(145deg,rgba(6,95,70,0.05) 0%,rgba(4,120,87,0.03) 100%)',
      keyFeatures: ['End-to-end encryption', 'Zero-trust architecture', 'Audit trail monitoring']
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
      keyFeatures: ['Private cloud deployment', 'Full data ownership', 'Custom governance']
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
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full border border-secondary/20 group-hover:border-secondary/30 transition-colors duration-300">
                    <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-secondary">
                      {feature.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
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

          {/* Orbiting Circles Visualization */}
          <div className="relative flex items-center justify-center mx-auto max-w-4xl h-96 lg:h-[500px]">
            {/* Center AI Brain */}
            <div className="relative z-10 flex items-center justify-center w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full border-2 border-secondary/30 backdrop-blur-sm">
              <Brain className="h-12 w-12 lg:h-16 lg:w-16 text-secondary" />
            </div>

            {/* First Ring - Core Enterprise Tools */}
            <OrbitingCircles
              className="size-[300px] lg:size-[400px] border-secondary/10"
              duration={25}
              radius={150}
              iconSize={40}
              speed={1}
            >
              <div className="flex items-center justify-center size-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full border border-blue-500/30">
                <Database className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex items-center justify-center size-full bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full border border-green-500/30">
                <Cloud className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center justify-center size-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-full border border-purple-500/30">
                <Settings className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex items-center justify-center size-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-full border border-orange-500/30">
                <FileText className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex items-center justify-center size-full bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-full border border-pink-500/30">
                <BarChart3 className="h-5 w-5 text-pink-500" />
              </div>
              <div className="flex items-center justify-center size-full bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-full border border-indigo-500/30">
                <MessageSquare className="h-5 w-5 text-indigo-500" />
              </div>
            </OrbitingCircles>

            {/* Second Ring - Extended Integrations */}
            <OrbitingCircles
              className="size-[200px] lg:size-[250px] border-primary/10"
              duration={20}
              radius={100}
              iconSize={32}
              speed={-1}
              reverse
            >
              <div className="flex items-center justify-center size-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-full border border-cyan-500/30">
                <Calendar className="h-4 w-4 text-cyan-500" />
              </div>
              <div className="flex items-center justify-center size-full bg-gradient-to-br from-rose-500/20 to-rose-600/20 rounded-full border border-rose-500/30">
                <Mail className="h-4 w-4 text-rose-500" />
              </div>
              <div className="flex items-center justify-center size-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-full border border-emerald-500/30">
                <Search className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-center justify-center size-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-full border border-amber-500/30">
                <Globe className="h-4 w-4 text-amber-500" />
              </div>
            </OrbitingCircles>
          </div>

          {/* Integration Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                <Shield className="h-6 w-6 text-secondary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Zero-Trust Authentication</h4>
              <p className="text-muted-foreground text-sm">
                Secure API connections with enterprise-grade authentication and authorization protocols.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                <Lock className="h-6 w-6 text-secondary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">End-to-End Encryption</h4>
              <p className="text-muted-foreground text-sm">
                All data transfers are encrypted with AES-256 standards, ensuring complete privacy.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                <Zap className="h-6 w-6 text-secondary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Real-Time Sync</h4>
              <p className="text-muted-foreground text-sm">
                Instant synchronization with your enterprise systems for up-to-date insights.
              </p>
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
              
              <button className="group inline-flex items-center gap-3 px-10 py-5 bg-secondary text-secondary-foreground rounded-2xl font-semibold text-lg transition-all duration-300 hover:bg-secondary/90 hover:shadow-xl hover:shadow-secondary/25 hover:scale-105">
                <Shield className="h-6 w-6" />
                <span>Schedule Your Demo</span>
                <OmniProcessModal />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
