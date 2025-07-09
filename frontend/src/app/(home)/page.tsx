import { EnterpriseSecuritySection } from '@/components/home/sections/enterprise-security-section';
import { CTASection } from '@/components/home/sections/cta-section';
import { EnterpriseSection } from '@/components/home/sections/enterprise-section';
import { FAQSection } from '@/components/home/sections/faq-section';
import { FeatureSection } from '@/components/home/sections/feature-section';
import { FooterSection } from '@/components/home/sections/footer-section';
import { HeroSection } from '@/components/home/sections/hero-section';
import { PricingSection } from '@/components/home/sections/pricing-section';
import { TestimonialSection } from '@/components/home/sections/testimonial-section';
import { UserTestimonialSection } from '@/components/home/sections/user-testimonial-section';
import { UseCasesSection } from '@/components/home/sections/use-cases-section';
import { ModalProviders } from '@/providers/modal-providers';

export default function Home() {
  return (
    <>
      <ModalProviders />
      <main className="flex flex-col items-center justify-center min-h-screen w-full">
        <div className="w-full">
          <HeroSection />
          <TestimonialSection />
          <UserTestimonialSection />
          <EnterpriseSecuritySection />
          <FeatureSection />
          <UseCasesSection />
          <EnterpriseSection />
          <PricingSection />
          <FAQSection />
          <CTASection />
          <FooterSection />
        </div>
      </main>
    </>
  );
}
