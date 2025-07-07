import { SectionHeader } from '@/components/home/section-header';
import { siteConfig } from '@/lib/home';

export function TestimonialSection() {
  const features = [
    {
      title: 'Real-time AI Collaboration',
      description: 'Experience real-time assistance. Ask your AI Agent to coordinate tasks, answer questions, and maintain team alignment.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      component: (
        <div className="relative w-full h-48 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl p-4 overflow-hidden">
          {/* Chat Interface */}
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="bg-secondary text-secondary-foreground px-3 py-2 rounded-lg rounded-tr-sm max-w-[80%] text-xs">
                Hey, I need help scheduling a team meeting that works well for everyone. Any suggestions for finding an optimal time slot?
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-secondary-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="bg-background px-3 py-2 rounded-lg rounded-tl-sm shadow-sm border border-border max-w-[80%]">
                <p className="text-xs text-primary">
                  Based on your calendar patterns and preferences, I recommend scheduling the team meeting for Tuesday at 2pm.
                </p>
              </div>
            </div>
          </div>
          
          {/* Floating decorative elements */}
          <div className="absolute top-2 right-2 w-6 h-6 bg-secondary/20 rounded-full animate-pulse"></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 bg-primary/20 rounded-full animate-bounce"></div>
        </div>
      )
    },
    {
      title: 'Seamless Integrations',
      description: 'Unite your favorite tools for effortless connectivity. Boost productivity through interconnected workflows.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      component: (
        <div className="relative w-full h-48 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl p-4 overflow-hidden flex items-center justify-center">
          {/* Central hub */}
          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center relative z-10">
            <svg className="w-6 h-6 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          
          {/* Floating integration icons */}
          <div className="absolute top-4 left-4 w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center animate-float">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          
          <div className="absolute top-4 right-4 w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center animate-float-delay-1">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </div>
          
          <div className="absolute bottom-4 left-4 w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center animate-float-delay-2">
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          
          <div className="absolute bottom-4 right-4 w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center animate-float-delay-3">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          
          {/* Connection lines */}
          <div className="absolute inset-0 opacity-30">
            <svg className="w-full h-full">
              <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="currentColor" strokeWidth="1" className="animate-pulse"/>
              <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="currentColor" strokeWidth="1" className="animate-pulse"/>
              <line x1="50%" y1="50%" x2="25%" y2="75%" stroke="currentColor" strokeWidth="1" className="animate-pulse"/>
              <line x1="50%" y1="50%" x2="75%" y2="75%" stroke="currentColor" strokeWidth="1" className="animate-pulse"/>
            </svg>
          </div>
        </div>
      )
    },
    {
      title: 'Instant Insight Reporting',
      description: 'Transform raw data into clear insights in seconds. Empower smarter decisions with real-time, always-learning intelligence.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      component: (
        <div className="relative w-full h-48 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl p-4 overflow-hidden">
          {/* Graph visualization */}
          <div className="relative h-full flex items-end justify-center">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120">
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/20"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Animated line chart */}
              <path
                d="M 10 80 Q 50 60 90 70 T 170 40"
                stroke="rgb(59 130 246)"
                strokeWidth="2"
                fill="none"
                className="animate-pulse"
              />
              
              {/* Data points */}
              <circle cx="50" cy="60" r="3" fill="rgb(59 130 246)" className="animate-pulse">
                <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="90" cy="70" r="3" fill="rgb(59 130 246)" className="animate-pulse">
                <animate attributeName="r" values="3;5;3" dur="2s" begin="0.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="130" cy="50" r="3" fill="rgb(59 130 246)" className="animate-pulse">
                <animate attributeName="r" values="3;5;3" dur="2s" begin="1s" repeatCount="indefinite"/>
              </circle>
              <circle cx="170" cy="40" r="3" fill="rgb(59 130 246)" className="animate-pulse">
                <animate attributeName="r" values="3;5;3" dur="2s" begin="1.5s" repeatCount="indefinite"/>
              </circle>
              
              {/* Gradient fill */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path
                d="M 10 80 Q 50 60 90 70 T 170 40 L 170 100 L 10 100 Z"
                fill="url(#gradient)"
                className="animate-pulse"
              />
            </svg>
            
            {/* Stats overlay */}
            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs">
              <span className="text-primary font-semibold">4,266</span>
              <span className="text-green-600 ml-1">↗</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Smart Automation',
      description: 'Set it, forget it. Your AI Agent tackles repetitive tasks so you can focus on strategy, innovation, and growth.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      component: (
        <div className="relative w-full h-48 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl p-4 overflow-hidden">
          {/* Calendar/Timeline widget */}
          <div className="space-y-3">
            {/* Calendar header */}
            <div className="flex justify-between items-center text-xs">
              <div className="flex gap-2">
                <span className="text-muted-foreground">Tue</span>
                <span className="text-muted-foreground">Wed</span>
                <span className="font-semibold text-primary">Thu</span>
                <span className="text-muted-foreground">Fri</span>
                <span className="text-muted-foreground">Sat</span>
              </div>
              <span className="text-muted-foreground">12:00 AM</span>
            </div>
            
            {/* Tasks/Events */}
            <div className="space-y-2">
              <div className="bg-secondary text-secondary-foreground px-3 py-1 rounded-lg text-xs font-medium animate-fade-in">
                Bento grid
              </div>
              <div className="bg-secondary/20 text-secondary px-3 py-1 rounded-lg text-xs font-medium animate-fade-in-delay-1">
                Landing Page
              </div>
              <div className="border-2 border-dashed border-secondary/30 text-secondary/70 px-3 py-1 rounded-lg text-xs text-center animate-fade-in-delay-2">
                Add Task
              </div>
            </div>
            
            {/* Progress indicators */}
            <div className="flex gap-1 mt-4">
              <div className="h-1 bg-secondary rounded-full flex-1"></div>
              <div className="h-1 bg-secondary/50 rounded-full flex-1"></div>
              <div className="h-1 bg-secondary/20 rounded-full flex-1"></div>
            </div>
          </div>
          
          {/* Floating automation icons */}
          <div className="absolute top-2 right-2 w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center animate-spin-slow">
            <svg className="w-3 h-3 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
      )
    }
  ];

  return (
    <section
      id="testimonials"
      className="flex flex-col items-center justify-center w-full py-20"
    >
      <SectionHeader>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance">
          Empower Your Workflow with AI
        </h2>
        <p className="text-muted-foreground text-center text-balance font-medium">
          Ask your AI Agent for real-time collaboration, seamless integrations,
          and actionable insights to streamline your operations.
        </p>
      </SectionHeader>
      
      <div className="w-full max-w-6xl mx-auto px-6 mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col text-center p-8 rounded-2xl bg-background border border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-center w-16 h-16 bg-secondary/10 text-secondary rounded-2xl mx-auto mb-6">
                {feature.icon}
              </div>
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-xl text-primary leading-tight">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
              {/* Animated component */}
              <div className="flex-1 flex items-center justify-center">
                {feature.component}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonial */}
      <div className="w-full max-w-4xl mx-auto px-6 mt-24">
        <blockquote className="text-center">
          <p className="text-xl md:text-2xl font-medium text-primary mb-8 leading-relaxed">
            "Operator has transformed our daily operations. Tasks that once consumed hours now complete in moments, freeing our team to focus on creativity and strategic growth."
          </p>
          <div className="flex items-center justify-center gap-4">
            <img
              src="https://randomuser.me/api/portraits/men/91.jpg"
              alt="Alex Johnson"
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="text-left">
              <div className="font-semibold text-primary">Alex Johnson</div>
              <div className="text-sm text-muted-foreground">CTO, Innovatech</div>
            </div>
          </div>
        </blockquote>
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-float-delay-1 {
          animation: float 3s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        
        .animate-float-delay-2 {
          animation: float 3s ease-in-out infinite;
          animation-delay: 1s;
        }
        
        .animate-float-delay-3 {
          animation: float 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        
        .animate-fade-in {
          animation: fadeIn 1s ease-in-out;
        }
        
        .animate-fade-in-delay-1 {
          animation: fadeIn 1s ease-in-out;
          animation-delay: 0.5s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        
        .animate-fade-in-delay-2 {
          animation: fadeIn 1s ease-in-out;
          animation-delay: 1s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        
        .animate-spin-slow {
          animation: spinSlow 8s linear infinite;
        }
      `}</style>
    </section>
  );
}
