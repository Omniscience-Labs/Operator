'use client';

import { SectionHeader } from '@/components/home/section-header';
import { ProfileCard } from '@/components/ProfileCard';
import { AgentProfileCard } from '@/components/ProfileCard/AgentProfileCard';
import { IconCloud } from '@/components/magicui/icon-cloud';
import { OmniProcessModal } from '@/components/sidebar/omni-enterprise-modal';
import { Shield, Lock, Brain, Database, Zap, Users, CheckCircle, ArrowRight, Cloud, Globe, Settings, FileText, BarChart3, MessageSquare, Calendar, Mail, Search, Server, Cpu, Factory, Wrench, TrendingUp, ShoppingCart, DollarSign, Truck, Package, ClipboardCheck, AlertTriangle, Microscope, HardDrive, Wifi, MonitorSpeaker, Building, Briefcase, Calculator, PieChart, LineChart, Users2, Key, Layers, Boxes, Target, CreditCard, Workflow, GitBranch, Gauge, Activity, Smartphone, Tablet, Laptop, Network, Headphones, Phone, Video, Printer, Timer, MapPin, Globe2, Radio, Antenna, Archive, Edit, Receipt, XCircle, Clock, Folder, FolderOpen } from 'lucide-react';

export function BentoSection() {
  // Transform secure AI features to match Agent interface
  const secureAIAgents = [
    {
      agent_id: 'private-ai-training',
      name: 'Private AI Training',
      description: 'Train AI models exclusively on your proprietary data. Keep intellectual property secure while building competitive advantages that stay within your organization.',
      avatar: '🔒',
      avatar_color: '#3B82F6',
      tags: ['Zero data leakage', 'Proprietary training', 'Competitive advantage'],
      is_managed: true,
      is_public: false,
      created_at: new Date().toISOString(),
      agentpress_tools: {
        'private_training': { enabled: true },
        'data_isolation': { enabled: true },
        'ip_protection': { enabled: true }
      }
    },
    {
      agent_id: 'zero-trust-security',
      name: 'Zero-Trust Security',
      description: 'Enterprise-grade encryption and zero-trust architecture ensure your sensitive data and AI models remain completely isolated from external threats and competitors.',
      avatar: '🛡️',
      avatar_color: '#10B981',
      tags: ['End-to-end encryption', 'Zero-trust architecture', 'Audit monitoring'],
      is_managed: true,
      is_public: false,
      created_at: new Date().toISOString(),
      agentpress_tools: {
        'encryption': { enabled: true },
        'zero_trust': { enabled: true },
        'audit_trail': { enabled: true }
      }
    },
    {
      agent_id: 'competitive-moat',
      name: 'Competitive Moat',
      description: 'Maintain your competitive edge by ensuring proprietary insights, customer data, and business intelligence never benefit competitors or public AI models.',
      avatar: '⚔️',
      avatar_color: '#8B5CF6',
      tags: ['Data isolation', 'Competitor protection', 'IP safeguarding'],
      is_managed: true,
      is_public: false,
      created_at: new Date().toISOString(),
      agentpress_tools: {
        'data_isolation': { enabled: true },
        'competitor_protection': { enabled: true },
        'ip_safeguarding': { enabled: true }
      }
    },
    {
      agent_id: 'enterprise-sovereignty',
      name: 'Enterprise Sovereignty',
      description: 'Deploy AI infrastructure with full data sovereignty. Private cloud solutions that learn and improve exclusively from your operations while maintaining complete ownership.',
      avatar: '👑',
      avatar_color: '#F59E0B',
      tags: ['Private cloud deployment', 'Full data ownership', 'Custom governance'],
      is_managed: true,
      is_public: false,
      created_at: new Date().toISOString(),
      agentpress_tools: {
        'private_cloud': { enabled: true },
        'data_ownership': { enabled: true },
        'custom_governance': { enabled: true }
      }
    }
  ];

  // Enterprise integration icons - comprehensive set for industrial companies
  const enterpriseIntegrationIcons = [
    // ERP & Business Systems
    <Building className="h-8 w-8 text-blue-500" />,
    <Briefcase className="h-8 w-8 text-indigo-500" />,
    <Calculator className="h-8 w-8 text-green-500" />,
    <PieChart className="h-8 w-8 text-purple-500" />,
    <BarChart3 className="h-8 w-8 text-orange-500" />,
    <LineChart className="h-8 w-8 text-red-500" />,
    <TrendingUp className="h-8 w-8 text-emerald-500" />,
    
    // Manufacturing & Industrial
    <Factory className="h-8 w-8 text-gray-600" />,
    <Cpu className="h-8 w-8 text-cyan-500" />,
    <Wrench className="h-8 w-8 text-amber-500" />,
    <Settings className="h-8 w-8 text-slate-500" />,
    <Gauge className="h-8 w-8 text-blue-600" />,
    <Activity className="h-8 w-8 text-pink-500" />,
    <Zap className="h-8 w-8 text-yellow-500" />,
    
    // Supply Chain & Logistics
    <Truck className="h-8 w-8 text-brown-500" />,
    <Package className="h-8 w-8 text-teal-500" />,
    <ShoppingCart className="h-8 w-8 text-violet-500" />,
    <Boxes className="h-8 w-8 text-orange-600" />,
    <MapPin className="h-8 w-8 text-red-600" />,
    <Globe2 className="h-8 w-8 text-blue-700" />,
    
    // Financial & Accounting
    <DollarSign className="h-8 w-8 text-green-600" />,
    <CreditCard className="h-8 w-8 text-indigo-600" />,
    <Receipt className="h-8 w-8 text-gray-500" />,
    <Calculator className="h-8 w-8 text-slate-600" />,
    
    // Cloud & Infrastructure
    <Cloud className="h-8 w-8 text-sky-500" />,
    <Server className="h-8 w-8 text-gray-700" />,
    <Database className="h-8 w-8 text-blue-800" />,
    <HardDrive className="h-8 w-8 text-gray-800" />,
    <Network className="h-8 w-8 text-purple-600" />,
    <Wifi className="h-8 w-8 text-blue-400" />,
    
    // Communication & Collaboration
    <MessageSquare className="h-8 w-8 text-green-500" />,
    <Mail className="h-8 w-8 text-blue-500" />,
    <Phone className="h-8 w-8 text-indigo-500" />,
    <Video className="h-8 w-8 text-red-500" />,
    <Users2 className="h-8 w-8 text-purple-500" />,
    <Headphones className="h-8 w-8 text-orange-500" />,
    
    // Document & Content Management
    <FileText className="h-8 w-8 text-gray-600" />,
    <Folder className="h-8 w-8 text-yellow-600" />,
    <Archive className="h-8 w-8 text-brown-600" />,
    <Search className="h-8 w-8 text-teal-600" />,
    <Edit className="h-8 w-8 text-violet-600" />,
    <Printer className="h-8 w-8 text-gray-700" />,
    
    // Security & Compliance
    <Shield className="h-8 w-8 text-red-500" />,
    <Lock className="h-8 w-8 text-orange-500" />,
    <Key className="h-8 w-8 text-yellow-500" />,
    <AlertTriangle className="h-8 w-8 text-amber-500" />,
    <ClipboardCheck className="h-8 w-8 text-green-500" />,
    
    // Quality & Testing
    <Microscope className="h-8 w-8 text-cyan-600" />,
    <Target className="h-8 w-8 text-red-600" />,
    <CheckCircle className="h-8 w-8 text-emerald-600" />,
    <XCircle className="h-8 w-8 text-red-600" />,
    
    // IoT & Sensors
    <Smartphone className="h-8 w-8 text-gray-600" />,
    <Tablet className="h-8 w-8 text-blue-600" />,
    <Laptop className="h-8 w-8 text-indigo-600" />,
    <MonitorSpeaker className="h-8 w-8 text-purple-600" />,
    <Radio className="h-8 w-8 text-green-600" />,
    <Antenna className="h-8 w-8 text-orange-600" />,
    
    // Time & Scheduling
    <Calendar className="h-8 w-8 text-blue-500" />,
    <Gauge className="h-8 w-8 text-indigo-500" />,
    <Timer className="h-8 w-8 text-purple-500" />,
    <Clock className="h-8 w-8 text-red-500" />,
    
    // Workflow & Automation
    <Workflow className="h-8 w-8 text-teal-500" />,
    <GitBranch className="h-8 w-8 text-orange-500" />,
    <Layers className="h-8 w-8 text-violet-500" />,
    <Globe className="h-8 w-8 text-blue-500" />
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
              agent={agent}
              mode="library"
              className="h-[420px]"
              enableTilt={true}
              onChat={() => {}}
              onCustomize={() => {}}
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

          {/* Icon Cloud Visualization */}
          <div className="relative flex items-center justify-center mx-auto max-w-4xl h-96 lg:h-[500px]">
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <IconCloud icons={enterpriseIntegrationIcons} />
            </div>
          </div>

          {/* Integration Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 max-w-7xl mx-auto">
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
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4">
                <Users2 className="h-6 w-6 text-secondary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">RBAC</h4>
              <p className="text-muted-foreground text-sm">
                Role-based access control with granular permissions and enterprise-grade user management.
              </p>
            </div>
            <div className="text-center p-6">
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
              
              <button className="group inline-flex items-center gap-3 px-10 py-5 bg-secondary text-secondary-foreground rounded-2xl font-semibold text-lg transition-all duration-300 hover:bg-secondary/90 hover:shadow-xl hover:shadow-secondary/25 hover:scale-105">
                <Shield className="h-6 w-6" />
                <span>Schedule Your Demo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
