import React from 'react';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/home/section-header';
import { Globe } from '@/components/home/ui/globe';
import { 
  MessageSquare, 
  Zap, 
  BarChart3, 
  RefreshCw, 
  Shield, 
  Users,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export function TestimonialSection() {
  const features = [
    {
      title: "AI-Powered Collaboration",
      description: "Experience real-time assistance with intelligent task coordination and seamless team alignment.",
      skeleton: <CollaborationSkeleton />,
      className: "col-span-1 lg:col-span-4 border-b lg:border-r dark:border-neutral-800/50",
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      title: "Global Team Scale",
      description: "Deploy worldwide with enterprise-grade infrastructure and dedicated support.",
      skeleton: <GlobeSkeleton />,
      className: "border-b col-span-1 lg:col-span-2 dark:border-neutral-800/50",
      icon: <Users className="h-5 w-5" />
    },
    {
      title: "Advanced Analytics",
      description: "Transform raw data into actionable insights with real-time intelligence and reporting.",
      skeleton: <AnalyticsSkeleton />,
      className: "col-span-1 lg:col-span-3 lg:border-r dark:border-neutral-800/50",
      icon: <BarChart3 className="h-5 w-5" />
    },
    {
      title: "Smart Automation",
      description: "Automate repetitive tasks and workflows so you can focus on strategic initiatives.",
      skeleton: <AutomationSkeleton />,
      className: "col-span-1 lg:col-span-3 border-b lg:border-none dark:border-neutral-800/50",
      icon: <RefreshCw className="h-5 w-5" />
    },
  ];

  return (
    <section
      id="testimonials"
      className="relative z-20 py-20 lg:py-32 max-w-7xl mx-auto"
    >
      <div className="px-6 lg:px-8">
        <SectionHeader>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-secondary" />
            <span className="text-sm font-medium text-secondary uppercase tracking-wider">
              Platform Overview
            </span>
          </div>
          <h2 className="text-3xl lg:text-5xl lg:leading-tight max-w-4xl mx-auto text-center tracking-tight font-medium text-black dark:text-white">
            Empower Your Workflow with AI
          </h2>
          <p className="text-base lg:text-lg max-w-2xl my-6 mx-auto text-muted-foreground text-center font-normal">
            Ask your AI Agent for real-time collaboration, seamless integrations, and actionable insights to streamline your operations.
          </p>
        </SectionHeader>

        <div className="relative mt-16 lg:mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-6 xl:border rounded-2xl dark:border-neutral-800/50 bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} className={feature.className}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <div className="text-secondary">
                      {feature.icon}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto opacity-60" />
                </div>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
                <div className="h-full w-full flex-1 mt-6">{feature.skeleton}</div>
              </FeatureCard>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonial */}
      <div className="w-full max-w-4xl mx-auto px-6 lg:px-8 mt-24">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent rounded-2xl"></div>
          <blockquote className="relative text-center p-12 lg:p-16">
            <div className="mb-8">
              <svg className="w-12 h-12 mx-auto text-secondary/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
              </svg>
            </div>
            <p className="text-xl lg:text-2xl font-medium text-primary mb-8 leading-relaxed">
              "Operator has transformed our daily operations. Tasks that once consumed hours now complete in moments, freeing our team to focus on creativity and strategic growth."
            </p>
            <div className="flex items-center justify-center gap-4">
              <img
                src="https://randomuser.me/api/portraits/men/91.jpg"
                alt="Alex Johnson"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-secondary/20"
              />
              <div className="text-left">
                <div className="font-semibold text-primary">Alex Johnson</div>
                <div className="text-sm text-muted-foreground">CTO, Innovatech</div>
              </div>
            </div>
          </blockquote>
        </div>
      </div>
    </section>
  );
}

const FeatureCard = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn(`p-6 lg:p-8 xl:p-10 relative overflow-hidden group hover:bg-muted/5 transition-all duration-300`, className)}>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
  return (
    <h3 className="text-xl lg:text-2xl font-semibold tracking-tight text-black dark:text-white mb-2">
      {children}
    </h3>
  );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p className="text-sm lg:text-base text-muted-foreground leading-relaxed max-w-sm">
      {children}
    </p>
  );
};

const CollaborationSkeleton = () => {
  return (
    <div className="relative flex flex-col gap-4 h-full min-h-[200px] lg:min-h-[300px]">
      <div className="w-full max-w-md mx-auto bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-2xl rounded-tr-md max-w-[85%] text-sm">
              Hey, I need help scheduling a team meeting that works well for everyone. Any suggestions?
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted/50 backdrop-blur-sm px-4 py-2 rounded-2xl rounded-tl-md shadow-sm border border-border/50 max-w-[85%]">
              <p className="text-sm text-primary">
                Based on calendar patterns, I recommend Tuesday at 2pm for optimal attendance.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      <div className="absolute top-4 left-4 w-2 h-2 bg-secondary/50 rounded-full animate-bounce"></div>
    </div>
  );
};

const GlobeSkeleton = () => {
  return (
    <div className="h-full min-h-[200px] lg:min-h-[300px] flex flex-col items-center justify-center relative bg-transparent">
      <div className="relative">
        <Globe className="scale-75 lg:scale-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none"></div>
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium border border-border/50">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-muted-foreground">Global Scale</span>
      </div>
    </div>
  );
};

const AnalyticsSkeleton = () => {
  return (
    <div className="relative h-full min-h-[200px] lg:min-h-[300px] bg-gradient-to-br from-secondary/5 to-transparent rounded-xl p-6 overflow-hidden">
      <div className="h-full flex flex-col justify-center">
        <svg className="w-full h-32 lg:h-40" viewBox="0 0 300 120">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          
          <path
            d="M 20 80 Q 80 60 120 70 T 200 40 T 280 45"
            stroke="rgb(59 130 246)"
            strokeWidth="2"
            fill="none"
            className="animate-pulse"
          />
          
          <path
            d="M 20 80 Q 80 60 120 70 T 200 40 T 280 45 L 280 100 L 20 100 Z"
            fill="url(#gradient)"
            className="animate-pulse"
          />
          
          <circle cx="120" cy="70" r="3" fill="rgb(59 130 246)" className="animate-pulse">
            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="200" cy="40" r="3" fill="rgb(59 130 246)" className="animate-pulse">
            <animate attributeName="r" values="3;5;3" dur="2s" begin="0.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="280" cy="45" r="3" fill="rgb(59 130 246)" className="animate-pulse">
            <animate attributeName="r" values="3;5;3" dur="2s" begin="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-xs text-muted-foreground">Performance</div>
          <div className="flex items-center gap-1 text-xs">
            <span className="font-semibold text-secondary">4,266</span>
            <span className="text-green-600">↗ 12%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AutomationSkeleton = () => {
  return (
    <div className="relative h-full min-h-[200px] lg:min-h-[300px] bg-gradient-to-br from-muted/20 to-transparent rounded-xl p-6 overflow-hidden">
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs">
          <div className="flex gap-3">
            <span className="text-muted-foreground">Mon</span>
            <span className="text-muted-foreground">Tue</span>
            <span className="font-semibold text-primary">Wed</span>
            <span className="text-muted-foreground">Thu</span>
            <span className="text-muted-foreground">Fri</span>
          </div>
          <span className="text-muted-foreground">12:00 PM</span>
        </div>
        
        <div className="space-y-3">
          <motion.div 
            className="bg-secondary/10 border border-secondary/20 px-4 py-2 rounded-lg text-sm font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Deploy to production
          </motion.div>
          <motion.div 
            className="bg-muted/50 border border-border/50 px-4 py-2 rounded-lg text-sm font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Run CI/CD pipeline
          </motion.div>
          <motion.div 
            className="border-2 border-dashed border-muted-foreground/20 text-muted-foreground px-4 py-2 rounded-lg text-sm text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            + Add automation
          </motion.div>
        </div>
        
        <div className="flex gap-1 mt-6">
          <div className="h-1 bg-secondary rounded-full flex-1"></div>
          <div className="h-1 bg-secondary/50 rounded-full flex-1"></div>
          <div className="h-1 bg-muted rounded-full flex-1"></div>
        </div>
      </div>
      
      <div className="absolute top-4 right-4 w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center">
        <RefreshCw className="w-3 h-3 text-secondary animate-spin" style={{ animationDuration: '3s' }} />
      </div>
    </div>
  );
};
