import { SectionHeader } from '@/components/home/section-header';
import { siteConfig } from '@/lib/home';

export function TestimonialSection() {
  const features = [
    {
      title: 'Real-time AI Collaboration',
      description: 'Experience real-time assistance. Ask your AI Agent to coordinate tasks, answer questions, and maintain team alignment.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      title: 'Seamless Integrations',
      description: 'Unite your favorite tools for effortless connectivity. Boost productivity through interconnected workflows.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    {
      title: 'Instant Insight Reporting',
      description: 'Transform raw data into clear insights in seconds. Empower smarter decisions with real-time, always-learning intelligence.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Smart Automation',
      description: 'Set it, forget it. Your AI Agent tackles repetitive tasks so you can focus on strategy, innovation, and growth.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
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
      
      <div className="w-full max-w-7xl mx-auto px-6 mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Features */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Chat Interface Mockup */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 relative overflow-hidden">
              {/* Chat Interface */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-xs">
                    <p className="text-sm">
                      Hey, I need help scheduling a team meeting that works well for everyone. Any suggestions for finding an optimal time slot?
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm max-w-xs">
                    <p className="text-sm text-gray-700">
                      Based on your calendar patterns and preferences, I recommend scheduling the team meeting for Tuesday at 2pm. This time slot has historically had the highest attendance rates for your team.
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              
              <div className="absolute bottom-4 left-4 w-10 h-10 bg-purple-100 rounded-full"></div>
              <div className="absolute top-1/2 right-8 w-6 h-6 bg-blue-100 rounded-full"></div>
            </div>

            {/* Calendar Widget */}
            <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-4 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">Schedule</span>
                <div className="text-xs text-gray-400">Tue-Sat</div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>12:00 AM</span>
                  <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs">Bento grid</div>
                </div>
                <div className="bg-blue-50 px-2 py-1 rounded text-xs text-blue-600">Landing Page</div>
                <div className="border-2 border-dashed border-blue-200 px-2 py-1 rounded text-xs text-blue-400">Add Task</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial */}
      <div className="w-full max-w-4xl mx-auto px-6 mt-20">
        <blockquote className="text-center">
          <p className="text-xl md:text-2xl font-medium text-gray-900 mb-8">
            "Operator has transformed our daily operations. Tasks that once consumed hours now complete in moments, freeing our team to focus on creativity and strategic growth."
          </p>
          <div className="flex items-center justify-center gap-4">
            <img
              src="https://randomuser.me/api/portraits/men/91.jpg"
              alt="Alex Johnson"
              className="w-12 h-12 rounded-full"
            />
            <div className="text-left">
              <div className="font-semibold text-gray-900">Alex Johnson</div>
              <div className="text-sm text-gray-600">CTO, Innovatech</div>
            </div>
          </div>
        </blockquote>
      </div>
    </section>
  );
}
