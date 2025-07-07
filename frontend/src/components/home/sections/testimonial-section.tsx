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
      )
    },
    {
      title: 'Seamless Integrations',
      description: 'Unite your favorite tools for effortless connectivity. Boost productivity through interconnected workflows.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    {
      title: 'Instant Insight Reporting',
      description: 'Transform raw data into clear insights in seconds. Empower smarter decisions with real-time, always-learning intelligence.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Smart Automation',
      description: 'Set it, forget it. Your AI Agent tackles repetitive tasks so you can focus on strategy, innovation, and growth.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      
      <div className="w-full max-w-6xl mx-auto px-6 mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col text-center p-8 rounded-2xl bg-background border border-border hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-center w-16 h-16 bg-secondary/10 text-secondary rounded-2xl mx-auto mb-6">
                {feature.icon}
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-xl text-primary leading-tight">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
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
    </section>
  );
}
