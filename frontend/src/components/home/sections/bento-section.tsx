'use client';

import { SectionHeader } from '@/components/home/section-header';
import { ProfileCard } from '@/components/ProfileCard';
import { Shield, Lock, Eye, Zap, Database, Brain, Users, Globe } from 'lucide-react';

export function BentoSection() {
  const secureAIFeatures = [
    {
      id: 1,
      title: 'Private AI Training',
      subtitle: 'Your Data, Your Edge',
      description: 'Train AI models exclusively on your proprietary data without exposing intellectual property to competitors or public models.',
      avatar: '/api/placeholder/400/400?text=🔒',
      miniAvatar: '/api/placeholder/100/100?text=🔒',
      handle: 'privateai',
      status: 'Enterprise Ready',
      behindGradient: 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(220,100%,90%,var(--card-opacity)) 4%,hsla(220,50%,80%,calc(var(--card-opacity)*0.75)) 10%,hsla(220,25%,70%,calc(var(--card-opacity)*0.5)) 50%,hsla(220,0%,60%,0) 100%),radial-gradient(35% 52% at 55% 20%,#0066ff 0%,#073aff00 100%),radial-gradient(100% 100% at 50% 50%,#4169E1 1%,#073aff00 76%),conic-gradient(from 124deg at 50% 50%,#1E90FF 0%,#4169E1 40%,#4169E1 60%,#1E90FF 100%)',
      innerGradient: 'linear-gradient(145deg,#1E40AF 0%,#3730A3 100%)'
    },
    {
      id: 2,
      title: 'Zero-Trust Architecture',
      subtitle: 'Bulletproof Security',
      description: 'Military-grade encryption and zero-trust protocols ensure your competitive intelligence stays yours.',
      avatar: '/api/placeholder/400/400?text=🛡️',
      miniAvatar: '/api/placeholder/100/100?text=🛡️',
      handle: 'zerotrust',
      status: 'SOC 2 Certified',
      behindGradient: 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(140,100%,90%,var(--card-opacity)) 4%,hsla(140,50%,80%,calc(var(--card-opacity)*0.75)) 10%,hsla(140,25%,70%,calc(var(--card-opacity)*0.5)) 50%,hsla(140,0%,60%,0) 100%),radial-gradient(35% 52% at 55% 20%,#00ff66 0%,#073aff00 100%),radial-gradient(100% 100% at 50% 50%,#10B981 1%,#073aff00 76%),conic-gradient(from 124deg at 50% 50%,#059669 0%,#10B981 40%,#10B981 60%,#059669 100%)',
      innerGradient: 'linear-gradient(145deg,#065F46 0%,#047857 100%)'
    },
    {
      id: 3,
      title: 'Competitive Moat',
      subtitle: 'Protect Your Advantage',
      description: 'Keep your proprietary knowledge and data insights exclusively within your organization and away from competitors.',
      avatar: '/api/placeholder/400/400?text=⚔️',
      miniAvatar: '/api/placeholder/100/100?text=⚔️',
      handle: 'competitive',
      status: 'Market Leader',
      behindGradient: 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(340,100%,90%,var(--card-opacity)) 4%,hsla(340,50%,80%,calc(var(--card-opacity)*0.75)) 10%,hsla(340,25%,70%,calc(var(--card-opacity)*0.5)) 50%,hsla(340,0%,60%,0) 100%),radial-gradient(35% 52% at 55% 20%,#ff0066 0%,#073aff00 100%),radial-gradient(100% 100% at 50% 50%,#E11D48 1%,#073aff00 76%),conic-gradient(from 124deg at 50% 50%,#BE185D 0%,#E11D48 40%,#E11D48 60%,#BE185D 100%)',
      innerGradient: 'linear-gradient(145deg,#9F1239 0%,#BE185D 100%)'
    },
    {
      id: 4,
      title: 'Enterprise Sovereignty',
      subtitle: 'Complete Control',
      description: 'Deploy AI that learns and improves exclusively from your operations while maintaining full data sovereignty.',
      avatar: '/api/placeholder/400/400?text=👑',
      miniAvatar: '/api/placeholder/100/100?text=👑',
      handle: 'sovereign',
      status: 'Self-Hosted',
      behindGradient: 'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(45,100%,90%,var(--card-opacity)) 4%,hsla(45,50%,80%,calc(var(--card-opacity)*0.75)) 10%,hsla(45,25%,70%,calc(var(--card-opacity)*0.5)) 50%,hsla(45,0%,60%,0) 100%),radial-gradient(35% 52% at 55% 20%,#ffaa00 0%,#073aff00 100%),radial-gradient(100% 100% at 50% 50%,#F59E0B 1%,#073aff00 76%),conic-gradient(from 124deg at 50% 50%,#D97706 0%,#F59E0B 40%,#F59E0B 60%,#D97706 100%)',
      innerGradient: 'linear-gradient(145deg,#92400E 0%,#B45309 100%)'
    }
  ];

  return (
    <section
      id="bento"
      className="flex flex-col items-center justify-center w-full relative py-32 bg-gradient-to-b from-background via-background to-muted/10"
    >
      <div className="w-full max-w-7xl mx-auto px-6">
        <SectionHeader>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-secondary/10 rounded-full">
              <Shield className="h-6 w-6 text-secondary" />
            </div>
            <span className="text-sm font-semibold text-secondary uppercase tracking-wider">
              Enterprise AI Security
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-center text-balance leading-[1.1] mb-6">
            Built for Secure Growth
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-xl md:text-2xl text-center text-muted-foreground font-normal text-balance leading-relaxed">
              Your data and knowledge are your competitive edge. 
            </p>
            <p className="text-lg md:text-xl text-center text-muted-foreground/80 font-normal text-balance leading-relaxed">
              Supercharge your business with AI that learns exclusively from your proprietary assets—without sharing your advantage with competitors or public models.
            </p>
          </div>
        </SectionHeader>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 mt-20">
          {secureAIFeatures.map((feature) => (
            <div key={feature.id} className="relative group">
              <ProfileCard
                avatarUrl={feature.avatar}
                miniAvatarUrl={feature.miniAvatar}
                name={feature.title}
                title={feature.subtitle}
                handle={feature.handle}
                status={feature.status}
                contactText="Learn More"
                behindGradient={feature.behindGradient}
                innerGradient={feature.innerGradient}
                enableTilt={true}
                showUserInfo={true}
                onContactClick={() => {
                  // Add contact handler logic here
                  console.log(`Learn more about ${feature.title}`);
                }}
                className="h-[400px] transition-all duration-300 hover:scale-[1.02]"
              />
              
              {/* Feature description overlay on hover */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/80 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-b-[30px] pointer-events-none">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-24 text-center max-w-4xl mx-auto">
          <div className="relative p-8 lg:p-12 rounded-3xl bg-gradient-to-br from-secondary/5 to-secondary/10 border border-secondary/20 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent rounded-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Brain className="h-8 w-8 text-secondary" />
                <Database className="h-8 w-8 text-secondary" />
                <Lock className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-2xl lg:text-3xl font-semibold text-foreground mb-4">
                Ready to Secure Your AI Advantage?
              </h3>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Join industry leaders who trust Operator to deploy AI that amplifies their competitive edge while protecting their most valuable assets.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button className="group inline-flex items-center gap-2 px-8 py-4 bg-secondary text-secondary-foreground rounded-full font-semibold transition-all duration-300 hover:bg-secondary/90 hover:shadow-xl hover:shadow-secondary/25 hover:scale-105">
                  <Shield className="h-5 w-5" />
                  <span>Schedule Security Demo</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
                <button className="inline-flex items-center gap-2 px-8 py-4 border border-border bg-background/50 backdrop-blur-sm text-foreground rounded-full font-semibold transition-all duration-300 hover:bg-background hover:border-secondary/30 hover:shadow-lg">
                  <Eye className="h-5 w-5" />
                  <span>View Security Whitepaper</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
