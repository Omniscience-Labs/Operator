import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  Brain,
  TrendingUp,
  Code,
  Briefcase,
  Heart,
  Building
} from 'lucide-react';

export function TestimonialSection() {
  const features = [
    {
      title: "AI-Powered Collaboration",
      description: "Infinite capacity on demand. Get specialized AI agents for any business need, anytime.",
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
  const [currentScenario, setCurrentScenario] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  const scenarios = [
    {
      id: 1,
      specialist: "Marketing Strategist",
      icon: <TrendingUp className="w-4 h-4 text-white" />,
      color: "from-purple-500 to-pink-500",
      user: "I need a comprehensive marketing strategy for our new product launch targeting millennials.",
      ai: "I'll create a multi-channel strategy: Instagram/TikTok campaigns, influencer partnerships, and data-driven content. Expected ROI: 340% with 2M+ reach in 90 days.",
      badge: "Marketing AI"
    },
    {
      id: 2,
      specialist: "Data Scientist",
      icon: <BarChart3 className="w-4 h-4 text-white" />,
      color: "from-blue-500 to-cyan-500",
      user: "Our customer churn rate is increasing. Can you analyze the data and provide actionable insights?",
      ai: "Analysis complete: 23% churn driven by pricing sensitivity and poor onboarding. Recommending tiered pricing model and enhanced 30-day experience journey.",
      badge: "Analytics AI"
    },
    {
      id: 3,
      specialist: "Software Architect",
      icon: <Code className="w-4 h-4 text-white" />,
      color: "from-green-500 to-emerald-500",
      user: "We need to scale our platform to handle 10x more traffic. What's the best architecture approach?",
      ai: "Implementing microservices with Kubernetes, Redis caching, and CDN optimization. This architecture will handle 50M+ requests/day with 99.9% uptime.",
      badge: "Tech AI"
    },
    {
      id: 4,
      specialist: "Operations Manager",
      icon: <Building className="w-4 h-4 text-white" />,
      color: "from-orange-500 to-red-500",
      user: "Our supply chain is experiencing delays. Can you optimize our procurement process?",
      ai: "Identified 3 bottlenecks and 12 suppliers. Implementing automated procurement system will reduce lead times by 40% and costs by 15%.",
      badge: "Operations AI"
    },
    {
      id: 5,
      specialist: "Financial Analyst",
      icon: <Briefcase className="w-4 h-4 text-white" />,
      color: "from-indigo-500 to-purple-500",
      user: "I need a detailed financial projection for the next 5 years including risk analysis.",
      ai: "Generated comprehensive model: 28% revenue growth, 15% margin expansion. Key risks: market volatility (12%) and regulatory changes (8%). Mitigation strategies included.",
      badge: "Finance AI"
    },
    {
      id: 6,
      specialist: "HR Specialist",
      icon: <Heart className="w-4 h-4 text-white" />,
      color: "from-pink-500 to-rose-500",
      user: "We're scaling rapidly and need to optimize our hiring process while maintaining culture fit.",
      ai: "Designed AI-powered recruitment pipeline: 70% faster screening, 85% culture match accuracy. Automated scheduling reduces time-to-hire by 12 days.",
      badge: "People AI"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setShowResponse(false);
      setShowTyping(false);
      
      setTimeout(() => {
        setCurrentScenario((prev) => (prev + 1) % scenarios.length);
        setShowTyping(true);
        
        setTimeout(() => {
          setShowTyping(false);
          setShowResponse(true);
        }, 1500);
      }, 5000);
    }, 5000);

    // Initialize first scenario
    setShowTyping(true);
    setTimeout(() => {
      setShowTyping(false);
      setShowResponse(true);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const scenario = scenarios[currentScenario];

  return (
    <div className="relative flex flex-col gap-4 h-full min-h-[200px] lg:min-h-[320px] overflow-hidden">
      {/* Ambient Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5 rounded-xl"></div>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-muted-foreground font-medium">Live Chat</span>
      </div>
      <div className="absolute bottom-4 left-4 flex items-center gap-1">
        <div className="w-1 h-1 bg-secondary/50 rounded-full animate-bounce"></div>
        <div className="w-1 h-1 bg-secondary/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-1 h-1 bg-secondary/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>

      <div className="w-full max-w-md mx-auto bg-background/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 lg:p-6 shadow-lg relative z-10">
        <div className="space-y-4">
          {/* User Message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`user-${scenario.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="flex justify-end"
            >
              <div className="bg-secondary text-secondary-foreground px-3 py-2 rounded-2xl rounded-tr-md max-w-[90%] text-xs lg:text-sm leading-relaxed">
                {scenario.user}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* AI Response */}
          <div className="flex items-start gap-3">
            <motion.div
              className={`w-8 h-8 bg-gradient-to-br ${scenario.color} rounded-full flex items-center justify-center flex-shrink-0`}
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {scenario.icon}
            </motion.div>
            
            <div className="flex-1">
              {/* AI Badge */}
              <motion.div
                key={`badge-${scenario.id}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-2"
              >
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                  <Brain className="w-3 h-3 mr-1" />
                  {scenario.badge}
                </span>
              </motion.div>

              {/* Typing Indicator */}
              <AnimatePresence>
                {showTyping && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="bg-muted/50 backdrop-blur-sm px-3 py-2 rounded-2xl rounded-tl-md shadow-sm border border-border/50"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((index) => (
                        <motion.div
                          key={index}
                          className="w-2 h-2 bg-secondary/60 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: index * 0.1,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Response */}
              <AnimatePresence>
                {showResponse && (
                  <motion.div
                    key={`response-${scenario.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="bg-muted/50 backdrop-blur-sm px-3 py-2 rounded-2xl rounded-tl-md shadow-sm border border-border/50"
                  >
                    <p className="text-xs lg:text-sm text-primary leading-relaxed">
                      {scenario.ai}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Infinite Capacity Indicator */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-4">
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium border border-border/50">
          <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-muted-foreground">Infinite Capacity Available</span>
        </div>
      </div>
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
            Process monthly reports
          </motion.div>
          <motion.div 
            className="bg-muted/50 border border-border/50 px-4 py-2 rounded-lg text-sm font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Send client updates
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
