'use client';

import { SectionHeader } from '@/components/home/section-header';
import { ProfileCard } from '@/components/ProfileCard';
import { AgentProfileCard } from '@/components/ProfileCard/AgentProfileCard';
import { IconCloud } from '@/components/magicui/icon-cloud';
import { OmniProcessModal } from '@/components/sidebar/omni-enterprise-modal';
import { GoogleGeminiEffect } from '@/components/ui/google-gemini-effect';
import { Shield, Lock, Brain, Database, Zap, Users, CheckCircle, ArrowRight, Cloud, Globe, Settings, FileText, BarChart3, MessageSquare, Calendar, Mail, Search, Server, Cpu, Factory, Wrench, TrendingUp, ShoppingCart, DollarSign, Truck, Package, ClipboardCheck, AlertTriangle, Microscope, HardDrive, Wifi, MonitorSpeaker, Building, Briefcase, Calculator, PieChart, LineChart, Users2, Key, Layers, Boxes, Target, CreditCard, Workflow, GitBranch, Gauge, Activity, Smartphone, Tablet, Laptop, Network, Headphones, Phone, Video, Printer, Timer, MapPin, Globe2, Radio, Antenna, Archive, Edit, Receipt, XCircle, Clock, Folder, FolderOpen } from 'lucide-react';
import { useScroll, useTransform } from 'framer-motion';

export function BentoSection() {
  // Scroll-based animations for GoogleGeminiEffect
  const { scrollYProgress } = useScroll();
  const pathLengths = [
    useTransform(scrollYProgress, [0, 0.2], [0, 1]),
    useTransform(scrollYProgress, [0.1, 0.3], [0, 1]),
    useTransform(scrollYProgress, [0.2, 0.4], [0, 1]),
    useTransform(scrollYProgress, [0.3, 0.5], [0, 1]),
    useTransform(scrollYProgress, [0.4, 0.6], [0, 1]),
  ];

  // Transform secure AI features to match Agent interface
  const secureAIAgents = [
    {
      agent_id: 'private-ai-training',
      name: 'Private AI Training',
      description: 'Build your competitive advantage with AI models trained exclusively on your proprietary data. Our advanced training infrastructure ensures your intellectual property remains secure while creating powerful, domain-specific AI capabilities. Unlike public models that learn from everyone\'s data, your private AI training environment guarantees that your valuable insights, customer data, and business processes stay within your organization. This approach not only protects your competitive edge but also enables you to develop highly specialized AI capabilities that are uniquely tailored to your industry, workflows, and business objectives. Your data becomes your moat, not your liability.',
      avatar: '🔒',
      avatar_color: '#3B82F6',
      tags: ['Zero data leakage', 'Proprietary training', 'Competitive advantage'],
      is_managed: false,
      is_public: false,
      agentpress_tools: {}
    },
    {
      agent_id: 'zero-trust-security',
      name: 'Zero-Trust Security',
      description: 'Implement military-grade security with our comprehensive zero-trust architecture that treats every interaction as potentially compromised. Our enterprise-grade encryption protocols use AES-256 standards combined with advanced key management systems to ensure your sensitive data and AI models remain completely isolated from external threats, competitors, and unauthorized access. Every data transfer, API call, and model inference is encrypted end-to-end, while our continuous monitoring systems provide real-time threat detection and automated response capabilities. This multi-layered security approach includes network segmentation, identity verification, and behavioral analysis to create an impenetrable fortress around your AI infrastructure.',
      avatar: '🛡️',
      avatar_color: '#10B981',
      tags: ['End-to-end encryption', 'Zero-trust architecture', 'Audit monitoring'],
      is_managed: false,
      is_public: false,
      agentpress_tools: {}
    },
    {
      agent_id: 'competitive-moat',
      name: 'Competitive Moat',
      description: 'Safeguard your market position by ensuring your proprietary insights, customer intelligence, and strategic business data never benefit competitors or contribute to public AI models. Our competitive moat protection creates an isolated AI ecosystem where your valuable information assets remain exclusively yours. This includes advanced data lineage tracking, strict access controls, and ironclad data sovereignty guarantees. Your customer behavior patterns, market insights, operational efficiencies, and strategic intelligence stay within your organization, preventing competitors from gaining any advantage from your AI initiatives. This approach transforms your data from a potential liability into a protected strategic asset that continuously strengthens your market position.',
      avatar: '⚔️',
      avatar_color: '#8B5CF6',
      tags: ['Data isolation', 'Competitor protection', 'IP safeguarding'],
      is_managed: false,
      is_public: false,
      agentpress_tools: {}
    },
    {
      agent_id: 'enterprise-sovereignty',
      name: 'Enterprise Sovereignty',
      description: 'Achieve complete control over your AI infrastructure with full data sovereignty and private cloud deployment options. Our enterprise sovereignty solution ensures that your AI systems learn and improve exclusively from your operations while maintaining absolute ownership and control over every aspect of your AI ecosystem. This includes dedicated private cloud infrastructure, custom governance frameworks, and complete administrative control over data policies, access permissions, and operational procedures. Your AI deployment remains entirely under your jurisdiction, with no external dependencies or shared resources that could compromise your autonomy. This approach guarantees that your AI capabilities evolve according to your specific requirements and remain permanently aligned with your organizational goals and compliance requirements.',
      avatar: '👑',
      avatar_color: '#F59E0B',
      tags: ['Private cloud deployment', 'Full data ownership', 'Custom governance'],
      is_managed: false,
      is_public: false,
      agentpress_tools: {}
    }
  ];

  // Enterprise integration icons - comprehensive set for industrial companies
  const enterpriseIntegrationIcons = [
    // ERP & Business Systems
    <Building key="building" className="h-20 w-20 text-blue-500 dark:text-blue-400" />,
    <Briefcase key="briefcase" className="h-20 w-20 text-indigo-500 dark:text-indigo-400" />,
    <Calculator key="calculator-1" className="h-20 w-20 text-green-500 dark:text-green-400" />,
    <PieChart key="piechart" className="h-20 w-20 text-purple-500 dark:text-purple-400" />,
    <BarChart3 key="barchart3" className="h-20 w-20 text-orange-500 dark:text-orange-400" />,
    <LineChart key="linechart" className="h-20 w-20 text-red-500 dark:text-red-400" />,
    <TrendingUp key="trendingup" className="h-20 w-20 text-emerald-500 dark:text-emerald-400" />,
    
    // Manufacturing & Industrial
    <Factory key="factory" className="h-20 w-20 text-gray-600 dark:text-gray-400" />,
    <Cpu key="cpu" className="h-20 w-20 text-cyan-500 dark:text-cyan-400" />,
    <Wrench key="wrench" className="h-20 w-20 text-amber-500 dark:text-amber-400" />,
    <Settings key="settings" className="h-20 w-20 text-slate-500 dark:text-slate-400" />,
    <Gauge key="gauge-1" className="h-20 w-20 text-blue-600 dark:text-blue-400" />,
    <Activity key="activity" className="h-20 w-20 text-pink-500 dark:text-pink-400" />,
    <Zap key="zap" className="h-20 w-20 text-yellow-500 dark:text-yellow-400" />,
    
    // Supply Chain & Logistics
    <Truck key="truck" className="h-20 w-20 text-amber-600 dark:text-amber-400" />,
    <Package key="package" className="h-20 w-20 text-teal-500 dark:text-teal-400" />,
    <ShoppingCart key="shoppingcart" className="h-20 w-20 text-violet-500 dark:text-violet-400" />,
    <Boxes key="boxes" className="h-20 w-20 text-orange-600 dark:text-orange-400" />,
    <MapPin key="mappin" className="h-20 w-20 text-red-600 dark:text-red-400" />,
    <Globe2 key="globe2" className="h-20 w-20 text-blue-700 dark:text-blue-400" />,
    
    // Financial & Accounting
    <DollarSign key="dollarsign" className="h-20 w-20 text-green-600 dark:text-green-400" />,
    <CreditCard key="creditcard" className="h-20 w-20 text-indigo-600 dark:text-indigo-400" />,
    <Receipt key="receipt" className="h-20 w-20 text-gray-500 dark:text-gray-400" />,
    <Calculator key="calculator-2" className="h-20 w-20 text-slate-600 dark:text-slate-400" />,
    
    // Cloud & Infrastructure
    <Cloud key="cloud" className="h-20 w-20 text-sky-500 dark:text-sky-400" />,
    <Server key="server" className="h-20 w-20 text-gray-700 dark:text-gray-400" />,
    <Database key="database" className="h-20 w-20 text-blue-800 dark:text-blue-400" />,
    <HardDrive key="harddrive" className="h-20 w-20 text-gray-800 dark:text-gray-400" />,
    <Network key="network" className="h-20 w-20 text-purple-600 dark:text-purple-400" />,
    <Wifi key="wifi" className="h-20 w-20 text-blue-400 dark:text-blue-300" />,
    
    // Communication & Collaboration
    <MessageSquare key="messagesquare" className="h-20 w-20 text-green-500 dark:text-green-400" />,
    <Mail key="mail" className="h-20 w-20 text-blue-500 dark:text-blue-400" />,
    <Phone key="phone" className="h-20 w-20 text-indigo-500 dark:text-indigo-400" />,
    <Video key="video" className="h-20 w-20 text-red-500 dark:text-red-400" />,
    <Users2 key="users2" className="h-20 w-20 text-purple-500 dark:text-purple-400" />,
    <Headphones key="headphones" className="h-20 w-20 text-orange-500 dark:text-orange-400" />,
    
    // Document & Content Management
    <FileText key="filetext" className="h-20 w-20 text-gray-600 dark:text-gray-400" />,
    <Folder key="folder" className="h-20 w-20 text-yellow-600 dark:text-yellow-400" />,
    <Archive key="archive" className="h-20 w-20 text-amber-600 dark:text-amber-400" />,
    <Search key="search" className="h-20 w-20 text-teal-600 dark:text-teal-400" />,
    <Edit key="edit" className="h-20 w-20 text-violet-600 dark:text-violet-400" />,
    <Printer key="printer" className="h-20 w-20 text-gray-700 dark:text-gray-400" />,
    
    // Security & Compliance
    <Shield key="shield" className="h-20 w-20 text-red-500 dark:text-red-400" />,
    <Lock key="lock" className="h-20 w-20 text-orange-500 dark:text-orange-400" />,
    <Key key="key" className="h-20 w-20 text-yellow-500 dark:text-yellow-400" />,
    <AlertTriangle key="alerttriangle" className="h-20 w-20 text-amber-500 dark:text-amber-400" />,
    <ClipboardCheck key="clipboardcheck" className="h-20 w-20 text-green-500 dark:text-green-400" />,
    
    // Quality & Testing
    <Microscope key="microscope" className="h-20 w-20 text-cyan-600 dark:text-cyan-400" />,
    <Target key="target" className="h-20 w-20 text-red-600 dark:text-red-400" />,
    <CheckCircle key="checkcircle" className="h-20 w-20 text-emerald-600 dark:text-emerald-400" />,
    <XCircle key="xcircle" className="h-20 w-20 text-red-600 dark:text-red-400" />,
    
    // IoT & Sensors
    <Smartphone key="smartphone" className="h-20 w-20 text-gray-600 dark:text-gray-400" />,
    <Tablet key="tablet" className="h-20 w-20 text-blue-600 dark:text-blue-400" />,
    <Laptop key="laptop" className="h-20 w-20 text-indigo-600 dark:text-indigo-400" />,
    <MonitorSpeaker key="monitorspeaker" className="h-20 w-20 text-purple-600 dark:text-purple-400" />,
    <Radio key="radio" className="h-20 w-20 text-green-600 dark:text-green-400" />,
    <Antenna key="antenna" className="h-20 w-20 text-orange-600 dark:text-orange-400" />,
    
    // Time & Scheduling
    <Calendar key="calendar" className="h-20 w-20 text-blue-500 dark:text-blue-400" />,
    <Gauge key="gauge-2" className="h-20 w-20 text-indigo-500 dark:text-indigo-400" />,
    <Timer key="timer" className="h-20 w-20 text-purple-500 dark:text-purple-400" />,
    <Clock key="clock" className="h-20 w-20 text-red-500 dark:text-red-400" />,
    
    // Workflow & Automation
    <Workflow key="workflow" className="h-20 w-20 text-teal-500 dark:text-teal-400" />,
    <GitBranch key="gitbranch" className="h-20 w-20 text-orange-500 dark:text-orange-400" />,
    <Layers key="layers" className="h-20 w-20 text-violet-500 dark:text-violet-400" />,
    <Globe key="globe" className="h-20 w-20 text-blue-500 dark:text-blue-400" />
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

        {/* Feature Cards - 2x2 Grid using AgentProfileCard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {secureAIAgents.map((agent) => (
            <AgentProfileCard
              key={agent.agent_id}
              agent={{
                ...agent,
                is_owned: false, // This will hide the action buttons
                download_count: undefined // Hide download count for marketplace mode
              }}
              mode="marketplace"
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

          {/* Integration Features Layout with Central Icon Cloud */}
          <div className="relative max-w-7xl mx-auto mb-48">
            {/* Central Icon Cloud */}
            <div className="relative flex items-center justify-center mx-auto w-[600px] h-[500px] lg:w-[700px] lg:h-[600px] mt-8">
              <div className="relative z-10 w-full h-full flex items-center justify-center scale-110 lg:scale-125">
                <IconCloud icons={enterpriseIntegrationIcons} />
              </div>
              
              {/* Google Gemini Effect running through the icon cloud */}
              <div className="absolute inset-0 z-0">
                <GoogleGeminiEffect 
                  pathLengths={pathLengths}
                  title=""
                  description=""
                  className="static opacity-60"
                />
              </div>
          </div>

            {/* Integration Features Positioned Around the Cloud */}
            {/* Top Left */}
            <div className="absolute top-0 left-0 text-center p-6 max-w-[200px]">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                <Shield className="h-6 w-6 text-secondary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Zero-Trust Authentication</h4>
              <p className="text-muted-foreground text-sm">
                Secure API connections with enterprise-grade authentication and authorization protocols.
              </p>
            </div>

            {/* Top Right */}
            <div className="absolute top-0 right-0 text-center p-6 max-w-[200px]">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                <Lock className="h-6 w-6 text-secondary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">End-to-End Encryption</h4>
              <p className="text-muted-foreground text-sm">
                All data transfers are encrypted with AES-256 standards, ensuring complete privacy.
              </p>
            </div>

            {/* Bottom Left */}
            <div className="absolute bottom-0 left-0 text-center p-6 max-w-[200px]">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                <Zap className="h-6 w-6 text-secondary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Real-Time Sync</h4>
              <p className="text-muted-foreground text-sm">
                Instant synchronization with your enterprise systems for up-to-date insights.
              </p>
            </div>

            {/* Bottom Right */}
            <div className="absolute bottom-0 right-0 text-center p-6 max-w-[200px]">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                <Users2 className="h-6 w-6 text-secondary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">RBAC</h4>
              <p className="text-muted-foreground text-sm">
                Role-based access control with granular permissions and enterprise-grade user management.
              </p>
            </div>

            {/* Bottom Center */}
            <div className="absolute bottom-[-80px] left-1/2 transform -translate-x-1/2 text-center p-6 max-w-[200px]">
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
