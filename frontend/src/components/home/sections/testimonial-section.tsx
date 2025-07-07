import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/home/section-header';
import { Globe } from '@/components/magicui/globe';
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
  Building,
  PieChart,
  LineChart,
  Target,
  ShoppingCart,
  DollarSign,
  Clock,
  Activity
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
      agentName: "Marketing AI",
      user: "I need a comprehensive marketing strategy for our new product launch targeting millennials.",
      ai: "I'll create a multi-channel strategy: Instagram/TikTok campaigns, influencer partnerships, and data-driven content. Expected ROI: 340% with 2M+ reach in 90 days."
    },
    {
      id: 2,
      agentName: "Analytics AI",
      user: "Our customer churn rate is increasing. Can you analyze the data and provide actionable insights?",
      ai: "Analysis complete: 23% churn driven by pricing sensitivity and poor onboarding. Recommending tiered pricing model and enhanced 30-day experience journey."
    },
    {
      id: 3,
      agentName: "Tech AI",
      user: "We need to scale our platform to handle 10x more traffic. What's the best architecture approach?",
      ai: "Implementing microservices with Kubernetes, Redis caching, and CDN optimization. This architecture will handle 50M+ requests/day with 99.9% uptime."
    },
    {
      id: 4,
      agentName: "Operations AI",
      user: "Our supply chain is experiencing delays. Can you optimize our procurement process?",
      ai: "Identified 3 bottlenecks and 12 suppliers. Implementing automated procurement system will reduce lead times by 40% and costs by 15%."
    },
    {
      id: 5,
      agentName: "Finance AI",
      user: "I need a detailed financial projection for the next 5 years including risk analysis.",
      ai: "Generated comprehensive model: 28% revenue growth, 15% margin expansion. Key risks: market volatility (12%) and regulatory changes (8%). Mitigation strategies included."
    },
    {
      id: 6,
      agentName: "People AI",
      user: "We're scaling rapidly and need to optimize our hiring process while maintaining culture fit.",
      ai: "Designed AI-powered recruitment pipeline: 70% faster screening, 85% culture match accuracy. Automated scheduling reduces time-to-hire by 12 days."
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
      }, 500);
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
    <div className="relative h-[280px] overflow-hidden">
      <div className="w-full max-w-sm mx-auto h-full p-4 flex flex-col justify-center">
        <div className="space-y-3">
          {/* User Message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`user-${scenario.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex justify-end"
            >
              <div className="bg-black text-white px-3 py-2 rounded-xl max-w-[85%] text-sm">
                {scenario.user}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* AI Response */}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              {/* Agent Name */}
              <motion.div
                key={`name-${scenario.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-xs text-muted-foreground mb-1 ml-1"
              >
                {scenario.agentName}
              </motion.div>

              {/* Typing Indicator */}
              <AnimatePresence>
                {showTyping && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white border border-border px-3 py-2 rounded-xl"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((index) => (
                        <motion.div
                          key={index}
                          className="w-2 h-2 bg-gray-400 rounded-full"
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
                    transition={{ duration: 0.3 }}
                    className="bg-white border border-border px-3 py-2 rounded-xl"
                  >
                    <p className="text-sm text-black">
                      {scenario.ai}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GlobeSkeleton = () => {
  return (
    <div className="relative h-[280px] overflow-hidden">
      <div className="h-full flex flex-col items-center justify-center">
        <div className="relative w-4/5 h-4/5 flex items-center justify-center">
          <Globe className="w-full h-full" />
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium border border-border/50">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-muted-foreground">Global Scale</span>
      </div>
    </div>
  );
};

const AnalyticsSkeleton = () => {
  const [currentAnalytic, setCurrentAnalytic] = useState(0);
  const [showInsight, setShowInsight] = useState(false);

  const analytics = [
    {
      id: 1,
      title: "Revenue Growth",
      type: "Line Chart",
      icon: <LineChart className="w-4 h-4 text-emerald-500" />,
      color: "emerald",
      metric: "$2.4M",
      change: "+47%",
      changeType: "positive",
      insight: "AI detected seasonal pattern: Q4 revenue jumps 73% due to holiday promotions. Recommend increasing inventory by 45% in October.",
      chart: <RevenueLineChart />,
      badge: "Revenue AI"
    },
    {
      id: 2,
      title: "Customer Segments",
      type: "Pie Chart",
      icon: <PieChart className="w-4 h-4 text-blue-500" />,
      color: "blue",
      metric: "5 Segments",
      change: "+2 new",
      changeType: "positive",
      insight: "Enterprise clients (34%) show highest LTV. Mid-market segment growing 89% QoQ. Recommend targeting similar profiles.",
      chart: <CustomerPieChart />,
      badge: "Segment AI"
    },
    {
      id: 3,
      title: "Conversion Funnel",
      type: "Funnel Chart",
      icon: <Target className="w-4 h-4 text-purple-500" />,
      color: "purple",
      metric: "8.4%",
      change: "+2.1%",
      changeType: "positive",
      insight: "Checkout abandonment at 67%. A/B test shows single-page checkout increases conversion by 34%. Deploy immediately.",
      chart: <ConversionFunnelChart />,
      badge: "Conversion AI"
    },
    {
      id: 4,
      title: "Sales Performance",
      type: "Bar Chart",
      icon: <BarChart3 className="w-4 h-4 text-orange-500" />,
      color: "orange",
      metric: "$847K",
      change: "+23%",
      changeType: "positive",
      insight: "Top performer Sarah leads with $127K. Team velocity up 31%. Recommend promoting high-performers and scaling top strategies.",
      chart: <SalesBarChart />,
      badge: "Sales AI"
    },
    {
      id: 5,
      title: "User Activity",
      type: "Heat Map",
      icon: <Activity className="w-4 h-4 text-pink-500" />,
      color: "pink",
      metric: "89% Active",
      change: "+12%",
      changeType: "positive",
      insight: "Peak usage: Tuesdays 2-4 PM. Feature adoption varies by region. European users prefer analytics, US prefers automation.",
      chart: <ActivityHeatMap />,
      badge: "Behavior AI"
    },
    {
      id: 6,
      title: "Market Trends",
      type: "Trend Analysis",
      icon: <TrendingUp className="w-4 h-4 text-indigo-500" />,
      color: "indigo",
      metric: "↗ Bullish",
      change: "+156%",
      changeType: "positive",
      insight: "Market sentiment strongly positive. Competitor analysis shows 23% market share opportunity. Recommend aggressive expansion.",
      chart: <MarketTrendChart />,
      badge: "Market AI"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setShowInsight(false);
      
      setTimeout(() => {
        setCurrentAnalytic((prev) => (prev + 1) % analytics.length);
        setTimeout(() => {
          setShowInsight(true);
        }, 800);
      }, 400);
    }, 6000);

    // Initialize first analytic
    setTimeout(() => {
      setShowInsight(true);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const analytic = analytics[currentAnalytic];

  return (
    <div className="relative h-[280px] bg-gradient-to-br from-secondary/5 to-transparent rounded-xl p-4 overflow-hidden">
      {/* Live Analytics Indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-muted-foreground">Live</span>
      </div>

      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`icon-${analytic.id}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="p-1.5 bg-secondary/10 rounded-lg"
            >
              {analytic.icon}
            </motion.div>
          </AnimatePresence>
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.h4
                key={`title-${analytic.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-sm font-semibold text-primary"
              >
                {analytic.title}
              </motion.h4>
            </AnimatePresence>
            <div className="text-xs text-muted-foreground">{analytic.type}</div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center justify-between mb-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`metric-${analytic.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-bold text-primary"
            >
              {analytic.metric}
            </motion.div>
          </AnimatePresence>
          <div className={`text-xs font-medium px-2 py-1 rounded ${analytic.changeType === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {analytic.change}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 flex items-center justify-center min-h-[80px] mb-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`chart-${analytic.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              {analytic.chart}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* AI Insight */}
        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-3 h-3 text-secondary" />
            <AnimatePresence mode="wait">
              <motion.span
                key={`badge-${analytic.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="text-xs font-medium text-secondary"
              >
                {analytic.badge}
              </motion.span>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            {showInsight && (
              <motion.div
                key={`insight-${analytic.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="bg-muted/50 backdrop-blur-sm rounded-lg p-2 border border-border/50"
              >
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {analytic.insight}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Chart Components
const RevenueLineChart = () => (
  <svg className="w-full h-20" viewBox="0 0 240 60">
    <defs>
      <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.8"/>
        <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0"/>
      </linearGradient>
    </defs>
    <path
      d="M 10 50 Q 40 35 70 25 T 130 15 T 190 20 T 230 12"
      stroke="rgb(16 185 129)"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M 10 50 Q 40 35 70 25 T 130 15 T 190 20 T 230 12 L 230 55 L 10 55 Z"
      fill="url(#revenueGradient)"
    />
    <circle cx="230" cy="12" r="3" fill="rgb(16 185 129)">
      <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
    </circle>
  </svg>
);

const CustomerPieChart = () => (
  <svg className="w-20 h-20" viewBox="0 0 42 42">
    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgb(59 130 246)" strokeWidth="3" strokeDasharray="34 66" strokeDashoffset="25"/>
    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgb(16 185 129)" strokeWidth="3" strokeDasharray="21 79" strokeDashoffset="59"/>
    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgb(168 85 247)" strokeWidth="3" strokeDasharray="15 85" strokeDashoffset="38"/>
    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgb(251 146 60)" strokeWidth="3" strokeDasharray="10 90" strokeDashoffset="23"/>
    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgb(239 68 68)" strokeWidth="3" strokeDasharray="20 80" strokeDashoffset="13"/>
  </svg>
);

const ConversionFunnelChart = () => (
  <svg className="w-full h-20" viewBox="0 0 200 60">
    <polygon points="10,10 190,10 170,25 30,25" fill="rgb(168 85 247)" fillOpacity="0.8"/>
    <polygon points="30,25 170,25 150,40 50,40" fill="rgb(168 85 247)" fillOpacity="0.6"/>
    <polygon points="50,40 150,40 130,55 70,55" fill="rgb(168 85 247)" fillOpacity="0.4"/>
    <text x="100" y="20" textAnchor="middle" className="text-xs fill-white">Visitors: 10,000</text>
    <text x="100" y="35" textAnchor="middle" className="text-xs fill-white">Leads: 2,100</text>
    <text x="100" y="50" textAnchor="middle" className="text-xs fill-white">Sales: 840</text>
  </svg>
);

const SalesBarChart = () => (
  <svg className="w-full h-20" viewBox="0 0 240 60">
    <rect x="20" y="35" width="25" height="20" fill="rgb(251 146 60)" rx="2"/>
    <rect x="55" y="25" width="25" height="30" fill="rgb(251 146 60)" rx="2"/>
    <rect x="90" y="15" width="25" height="40" fill="rgb(251 146 60)" rx="2"/>
    <rect x="125" y="30" width="25" height="25" fill="rgb(251 146 60)" rx="2"/>
    <rect x="160" y="20" width="25" height="35" fill="rgb(251 146 60)" rx="2"/>
    <rect x="195" y="10" width="25" height="45" fill="rgb(251 146 60)" rx="2"/>
    <text x="32" y="50" textAnchor="middle" className="text-xs fill-current">Jan</text>
    <text x="67" y="50" textAnchor="middle" className="text-xs fill-current">Feb</text>
    <text x="102" y="50" textAnchor="middle" className="text-xs fill-current">Mar</text>
    <text x="137" y="50" textAnchor="middle" className="text-xs fill-current">Apr</text>
    <text x="172" y="50" textAnchor="middle" className="text-xs fill-current">May</text>
    <text x="207" y="50" textAnchor="middle" className="text-xs fill-current">Jun</text>
  </svg>
);

const ActivityHeatMap = () => (
  <svg className="w-full h-16" viewBox="0 0 168 32">
    {Array.from({ length: 7 }).map((_, week) =>
      Array.from({ length: 24 }).map((_, hour) => (
        <rect
          key={`${week}-${hour}`}
          x={hour * 7}
          y={week * 4}
          width="6"
          height="3"
          fill={`rgb(236 72 153)`}
          fillOpacity={Math.random() * 0.8 + 0.2}
          rx="1"
        />
      ))
    )}
  </svg>
);

const MarketTrendChart = () => (
  <svg className="w-full h-20" viewBox="0 0 240 60">
    <defs>
      <linearGradient id="marketGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.8"/>
        <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0"/>
      </linearGradient>
    </defs>
    <path
      d="M 10 45 Q 30 40 50 35 Q 70 30 90 28 Q 110 25 130 22 Q 150 18 170 15 Q 190 12 210 10 T 230 8"
      stroke="rgb(99 102 241)"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M 10 45 Q 30 40 50 35 Q 70 30 90 28 Q 110 25 130 22 Q 150 18 170 15 Q 190 12 210 10 T 230 8 L 230 55 L 10 55 Z"
      fill="url(#marketGradient)"
    />
    <circle cx="230" cy="8" r="3" fill="rgb(99 102 241)">
      <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
    </circle>
  </svg>
);

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
