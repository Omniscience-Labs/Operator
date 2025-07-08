/* eslint-disable @next/next/no-img-element */
import { siteConfig } from '@/lib/home';

export function QuoteSection() {
  return (
    <section
      id="quote"
      className="flex flex-col items-center justify-center gap-8 w-full p-14 bg-accent z-20"
    >
      <blockquote className="max-w-3xl text-left px-4">
        <p className="text-xl md:text-2xl text-primary leading-relaxed tracking-tighter font-medium mb-6">
          "Operator has transformed our daily operations. Tasks that once consumed hours now complete in moments, freeing our team to focus on creativity and strategic growth."
        </p>

        <div className="flex gap-4">
          <div className="size-10 rounded-full bg-primary border border-border">
            <img
              src="https://randomuser.me/api/portraits/men/91.jpg"
              alt="Alex Johnson"
              className="size-full rounded-full object-contain"
            />
          </div>
          <div className="text-left">
            <cite className="text-lg font-medium text-primary not-italic">
              Alex Johnson
            </cite>
            <p className="text-sm text-primary">CTO, Innovatech</p>
          </div>
        </div>
      </blockquote>
    </section>
  );
}
