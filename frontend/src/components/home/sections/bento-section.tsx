'use client';

import { SectionHeader } from '@/components/home/section-header';
import { IconCloud } from '@/components/magicui/icon-cloud';
import { OmniProcessModal } from '@/components/sidebar/omni-enterprise-modal';
import { Shield, Lock, Brain, Database, Zap, Users2, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

export function BentoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { margin: '-20% 0px -20% 0px' });
  const [activeConnections, setActiveConnections] = useState<number[]>([]);

  // Scroll progress for the section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });

  const animationProgress = useTransform(scrollYProgress, [0.2, 0.8], [0, 1]);

  useEffect(() => {
    if (isInView) {
      // Stagger the connection animations
      const intervals = [0, 200, 400, 600, 800].map((delay, index) => 
        setTimeout(() => {
          setActiveConnections(prev => [...prev, index]);
        }, delay)
      );

      return () => intervals.forEach(clearTimeout);
    } else {
      setActiveConnections([]);
    }
  }, [isInView]);

  // Connection line component
  const ConnectionLine = ({ 
    fromPosition, 
    toPosition, 
    index, 
    delay = 0 
  }: { 
    fromPosition: { x: number; y: number }; 
    toPosition: { x: number; y: number }; 
    index: number;
    delay?: number;
  }) => {
    const angle = Math.atan2(toPosition.y - fromPosition.y, toPosition.x - fromPosition.x);
    const length = Math.sqrt(
      Math.pow(toPosition.x - fromPosition.x, 2) + Math.pow(toPosition.y - fromPosition.y, 2)
    );

    return (
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: fromPosition.x,
          top: fromPosition.y,
          transform: `rotate(${angle}rad)`,
          transformOrigin: '0 0',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: activeConnections.includes(index) ? 1 : 0 }}
        transition={{ duration: 0.8, delay: delay * 0.1 }}
      >
        {/* Main connection line */}
        <motion.div
          className="h-[2px] bg-gradient-to-r from-primary/60 via-secondary/80 to-primary/60 shadow-lg"
          style={{ width: length }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: activeConnections.includes(index) ? 1 : 0 }}
          transition={{ duration: 1.2, delay: delay * 0.1, ease: "easeInOut" }}
        />
        
        {/* Animated pulse effect */}
        <motion.div
          className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent"
          style={{ width: length }}
          initial={{ x: -length }}
          animate={{ 
            x: activeConnections.includes(index) ? length : -length 
          }}
          transition={{ 
            duration: 2, 
            delay: delay * 0.1 + 0.5,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut"
          }}
        />

        {/* Connection nodes */}
        <motion.div
          className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: activeConnections.includes(index) ? 1 : 0 }}
          transition={{ duration: 0.3, delay: delay * 0.1 }}
        />
        <motion.div
          className="absolute -top-1 w-2 h-2 bg-secondary rounded-full shadow-lg"
          style={{ left: length - 4 }}
          initial={{ scale: 0 }}
          animate={{ scale: activeConnections.includes(index) ? 1 : 0 }}
          transition={{ duration: 0.3, delay: delay * 0.1 + 0.8 }}
        />
      </motion.div>
    );
  };

  // Feature component with enhanced animations
  const FeatureCard = ({ 
    icon, 
    title, 
    description, 
    className, 
    index 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    description: string; 
    className: string;
    index: number;
  }) => (
    <motion.div 
      className={`${className} text-center p-4 max-w-[200px] relative group`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: activeConnections.includes(index) ? 0.6 : 0 }}
        transition={{ duration: 0.8 }}
      />
      
      {/* Icon container with enhanced effects */}
      <motion.div 
        className="relative inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-2xl border border-secondary/20 mb-4 group-hover:border-secondary/40 transition-all duration-300"
        whileHover={{ scale: 1.1 }}
                 animate={{ 
           boxShadow: activeConnections.includes(index) 
             ? "0 0 20px hsl(var(--secondary) / 0.3)" 
             : "0 0 0px hsl(var(--secondary) / 0)" 
         }}
      >
                 <motion.div
           animate={{ 
             color: activeConnections.includes(index) ? "hsl(var(--secondary))" : "currentColor" 
           }}
           transition={{ duration: 0.3 }}
         >
           {icon}
         </motion.div>
        
        {/* Pulse ring effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-secondary/50"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ 
            scale: activeConnections.includes(index) ? 1.5 : 1,
            opacity: activeConnections.includes(index) ? 0 : 0
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.div>
      
             <motion.h4 
         className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300"
         animate={{ 
           color: activeConnections.includes(index) ? "hsl(var(--primary))" : "currentColor" 
         }}
       >
         {title}
       </motion.h4>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </motion.div>
  );



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
    <section ref={sectionRef} className="relative z-20 py-20 lg:py-32 max-w-7xl mx-auto">
      <div className="px-6 lg:px-8">
        <SectionHeader>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-secondary" />
            <span className="text-sm font-medium text-secondary uppercase tracking-wider">
              Enterprise Integration
            </span>
          </div>
          <h2 className="text-3xl lg:text-5xl lg:leading-tight max-w-4xl mx-auto text-center tracking-tight font-medium text-black dark:text-white">
            Connect Securely to Enterprise Data and Tools
          </h2>
          <p className="text-base lg:text-lg max-w-2xl my-6 mx-auto text-muted-foreground text-center font-normal">
            Seamlessly integrate with your existing enterprise infrastructure while maintaining zero-trust security protocols.
          </p>
        </SectionHeader>

        <div className="py-16 lg:py-24">
          <div className="relative max-w-6xl mx-auto">
            {/* Mobile Layout - Stacked vertically */}
            <div className="block lg:hidden">
              {/* Icon Cloud for mobile */}
              <motion.div 
                className="flex items-center justify-center mx-auto w-[300px] h-[300px] mb-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                <div className="relative z-10 w-full h-full flex items-center justify-center scale-100">
                  <IconCloud images={enterpriseIntegrationImages} />
                </div>
              </motion.div>

              {/* Features in a 2x2 grid below cloud on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-4">
                <FeatureCard
                  icon={<Shield className="h-6 w-6 text-secondary" />}
                  title="Zero-Trust Authentication"
                  description="Secure API connections with enterprise-grade authentication and authorization protocols."
                  className=""
                  index={0}
                />
                <FeatureCard
                  icon={<Lock className="h-6 w-6 text-secondary" />}
                  title="End-to-End Encryption"
                  description="All data transfers are encrypted with AES-256 standards, ensuring complete privacy."
                  className=""
                  index={1}
                />
                <FeatureCard
                  icon={<Zap className="h-6 w-6 text-secondary" />}
                  title="Real-Time Sync"
                  description="Instant synchronization with your enterprise systems for up-to-date insights."
                  className=""
                  index={2}
                />
                <FeatureCard
                  icon={<Users2 className="h-6 w-6 text-secondary" />}
                  title="RBAC"
                  description="Role-based access control with granular permissions and enterprise-grade user management."
                  className=""
                  index={3}
                />
              </div>

              {/* Bottom center feature for mobile */}
              <div className="mt-6 flex justify-center">
                <FeatureCard
                  icon={<Settings className="h-6 w-6 text-secondary" />}
                  title="Custom Integration Development"
                  description="Tailored integration solutions for your unique enterprise systems and workflows."
                  className=""
                  index={4}
                />
              </div>
            </div>

            {/* Desktop Layout - Positioned around cloud with connections */}
            <div className="hidden lg:block relative" ref={containerRef}>
              {/* Connection lines container */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top Left to Center */}
                <ConnectionLine 
                  fromPosition={{ x: 150, y: 100 }} 
                  toPosition={{ x: 350, y: 250 }} 
                  index={0}
                  delay={0}
                />
                
                {/* Top Right to Center */}
                <ConnectionLine 
                  fromPosition={{ x: 550, y: 100 }} 
                  toPosition={{ x: 450, y: 250 }} 
                  index={1}
                  delay={1}
                />
                
                {/* Bottom Left to Center */}
                <ConnectionLine 
                  fromPosition={{ x: 150, y: 450 }} 
                  toPosition={{ x: 350, y: 350 }} 
                  index={2}
                  delay={2}
                />
                
                {/* Bottom Right to Center */}
                <ConnectionLine 
                  fromPosition={{ x: 550, y: 450 }} 
                  toPosition={{ x: 450, y: 350 }} 
                  index={3}
                  delay={3}
                />
                
                {/* Bottom Center to Center */}
                <ConnectionLine 
                  fromPosition={{ x: 400, y: 520 }} 
                  toPosition={{ x: 400, y: 400 }} 
                  index={4}
                  delay={4}
                />
              </div>

              {/* Expanded container for better spacing */}
              <div className="relative w-[800px] h-[600px] mx-auto mb-20">
                {/* Central Icon Cloud with enhanced glow */}
                <motion.div 
                  className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1 }}
                >
                  {/* Glow effect around icon cloud */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl"
                    animate={{ 
                      opacity: isInView ? 0.8 : 0,
                      scale: isInView ? 1.2 : 1
                    }}
                    transition={{ duration: 2 }}
                  />
                  
                  <div className="relative z-10 w-full h-full flex items-center justify-center scale-110">
                    <IconCloud images={enterpriseIntegrationImages} />
                  </div>
                </motion.div>

                {/* Features positioned with more spacing around the cloud */}
                <FeatureCard
                  icon={<Shield className="h-6 w-6 text-secondary" />}
                  title="Zero-Trust Authentication"
                  description="Secure API connections with enterprise-grade authentication and authorization protocols."
                  className="absolute top-0 left-0"
                  index={0}
                />

                <FeatureCard
                  icon={<Lock className="h-6 w-6 text-secondary" />}
                  title="End-to-End Encryption"
                  description="All data transfers are encrypted with AES-256 standards, ensuring complete privacy."
                  className="absolute top-0 right-0"
                  index={1}
                />

                <FeatureCard
                  icon={<Zap className="h-6 w-6 text-secondary" />}
                  title="Real-Time Sync"
                  description="Instant synchronization with your enterprise systems for up-to-date insights."
                  className="absolute bottom-0 left-0"
                  index={2}
                />

                <FeatureCard
                  icon={<Users2 className="h-6 w-6 text-secondary" />}
                  title="RBAC"
                  description="Role-based access control with granular permissions and enterprise-grade user management."
                  className="absolute bottom-0 right-0"
                  index={3}
                />

                <FeatureCard
                  icon={<Settings className="h-6 w-6 text-secondary" />}
                  title="Custom Integration Development"
                  description="Tailored integration solutions for your unique enterprise systems and workflows."
                  className="absolute -bottom-16 left-1/2 transform -translate-x-1/2"
                  index={4}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <motion.div 
          className="mt-20 lg:mt-32"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
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
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-primary rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
                <div className="relative group inline-flex h-14 items-center justify-center gap-3 text-base font-semibold tracking-wide rounded-xl text-primary-foreground dark:text-black px-12 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] bg-primary dark:bg-white hover:bg-primary/90 dark:hover:bg-white/90 transition-all duration-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:scale-105">
                  <OmniProcessModal />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
