import { FirstBentoAnimation } from '@/components/home/first-bento-animation';
import { FourthBentoAnimation } from '@/components/home/fourth-bento-animation';
import { SecondBentoAnimation } from '@/components/home/second-bento-animation';
import { ThirdBentoAnimation } from '@/components/home/third-bento-animation';
import { FlickeringGrid } from '@/components/home/ui/flickering-grid';
import { Globe } from '@/components/home/ui/globe';
import { GradientText } from '@/components/animate-ui/text/gradient';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import React from 'react';
import { config } from '@/lib/config';

export const Highlight = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <span
      className={cn(
        'p-1 py-0.5 font-medium dark:font-semibold text-secondary',
        className,
      )}
    >
      {children}
    </span>
  );
};

export const BLUR_FADE_DELAY = 0.15;

interface UpgradePlan {
  hours: string;
  price: string;
  stripePriceId: string;
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  buttonText: string;
  buttonColor: string;
  isPopular: boolean;
  hours: string;
  features: string[];
  stripePriceId: string;
  upgradePlans: UpgradePlan[];
}

export const siteConfig = {
  name: 'Omni',
  description: 'The Generalist AI Agent that works on your behalf.',
  cta: 'Start Free',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  keywords: ['AI Agent', 'Generalist AI', 'Open Source AI', 'Autonomous Agent'],
  links: {
    email: 'support@omni.ai',
    twitter: 'https://x.com/omni_ai',
    discord: 'https://discord.gg/omni-ai',
    github: 'https://github.com/omni-ai/operator',
    instagram: 'https://instagram.com/omni_ai',
  },
  nav: {
    links: [
      { id: 1, name: 'Home', href: '#hero' },
      { id: 2, name: 'Use Cases', href: '#use-cases' },
      { id: 3, name: 'Enterprise', href: '#enterprise-security' },
      { id: 4, name: 'Pricing', href: '#pricing' },
    ],
  },
  hero: {
    badgeIcon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-muted-foreground"
      >
        <path
          d="M7.62758 1.09876C7.74088 1.03404 7.8691 1 7.99958 1C8.13006 1 8.25828 1.03404 8.37158 1.09876L13.6216 4.09876C13.7363 4.16438 13.8316 4.25915 13.8979 4.37347C13.9642 4.48779 13.9992 4.6176 13.9992 4.74976C13.9992 4.88191 13.9642 5.01172 13.8979 5.12604C13.8316 5.24036 13.7363 5.33513 13.6216 5.40076L8.37158 8.40076C8.25828 8.46548 8.13006 8.49952 7.99958 8.49952C7.8691 8.49952 7.74088 8.46548 7.62758 8.40076L2.37758 5.40076C2.26287 5.33513 2.16753 5.24036 2.10123 5.12604C2.03492 5.01172 2 4.88191 2 4.74976C2 4.6176 2.03492 4.48779 2.10123 4.37347C2.16753 4.25915 2.26287 4.16438 2.37758 4.09876L7.62758 1.09876Z"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M2.56958 7.23928L2.37758 7.34928C2.26287 7.41491 2.16753 7.50968 2.10123 7.624C2.03492 7.73831 2 7.86813 2 8.00028C2 8.13244 2.03492 8.26225 2.10123 8.37657C2.16753 8.49089 2.26287 8.58566 2.37758 8.65128L7.62758 11.6513C7.74088 11.716 7.8691 11.75 7.99958 11.75C8.13006 11.75 8.25828 11.716 8.37158 11.6513L13.6216 8.65128C13.7365 8.58573 13.8321 8.49093 13.8986 8.3765C13.965 8.26208 14 8.13211 14 7.99978C14 7.86745 13.965 7.73748 13.8986 7.62306C13.8321 7.50864 13.7365 7.41384 13.6216 7.34828L13.4296 7.23828L9.11558 9.70328C8.77568 9.89744 8.39102 9.99956 7.99958 9.99956C7.60814 9.99956 7.22347 9.89744 6.88358 9.70328L2.56958 7.23928Z"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M2.37845 10.5993L2.57045 10.4893L6.88445 12.9533C7.22435 13.1474 7.60901 13.2496 8.00045 13.2496C8.39189 13.2496 8.77656 13.1474 9.11645 12.9533L13.4305 10.4883L13.6225 10.5983C13.7374 10.6638 13.833 10.7586 13.8994 10.8731C13.9659 10.9875 14.0009 11.1175 14.0009 11.2498C14.0009 11.3821 13.9659 11.5121 13.8994 11.6265C13.833 11.7409 13.7374 11.8357 13.6225 11.9013L8.37245 14.9013C8.25915 14.966 8.13093 15 8.00045 15C7.86997 15 7.74175 14.966 7.62845 14.9013L2.37845 11.9013C2.2635 11.8357 2.16795 11.7409 2.10148 11.6265C2.03501 11.5121 2 11.3821 2 11.2498C2 11.1175 2.03501 10.9875 2.10148 10.8731C2.16795 10.7586 2.2635 10.6638 2.37845 10.5983V10.5993Z"
          stroke="currentColor"
          strokeWidth="1.25"
        />
            </svg>
    ),
    badge: 'Secure Enterprise Agents',
    title: (
      <>
        Operator - Your{' '}
        <GradientText 
          text="Infinite AI" 
          gradient="linear-gradient(90deg, #3b82f6 0%, #a855f7 20%, #ec4899 50%, #a855f7 80%, #3b82f6 100%)"
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />{' '}
        Teammate
      </>
    ),
    description:
      'a generalist AI Agent that works on your behalf.',
    inputPlaceholder: 'Ask Operator to...',
  },
  enterpriseSecuritySection: {
    title: 'Built for Secure Growth',
    description: 'Enterprise-grade security and AI features designed for businesses that value data sovereignty',
    items: [
      {
        id: 1,
        content: (
          <div className="relative flex size-full max-w-lg items-center justify-center overflow-hidden [mask-image:linear-gradient(to_top,transparent,black_50%)] -translate-y-20">
            <FlickeringGrid />
          </div>
        ),
        title: 'Zero-Trust Security',
        description:
          'Military-grade security with zero-trust architecture and end-to-end encryption for all data transfers.',
      },
      {
        id: 2,
        content: (
          <div className="relative flex size-full max-w-lg items-center justify-center overflow-hidden [mask-image:linear-gradient(to_top,transparent,black_50%)] -translate-y-20">
            <Globe className="top-28" />
          </div>
        ),
        title: 'Enterprise Integrations',
        description:
          'Seamlessly connect with your existing enterprise infrastructure while maintaining complete data sovereignty.',
      },
    ],
  },
  featureSection: {
    title: 'Powerful Features',
    description: 'Discover what makes Operator the ultimate AI agent for your workflows',
    items: [
      {
        id: 1,
        title: 'Autonomous Task Execution',
        content: 'Operator can handle complex multi-step tasks independently, learning from context and adapting to your specific requirements.',
        image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80'
      },
      {
        id: 2,
        title: 'Tool Integration',
        content: 'Seamlessly integrate with your existing tools and workflows. Operator works with popular platforms and APIs.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80'
      },
      {
        id: 3,
        title: 'Real-time Learning',
        content: 'Operator learns from your interactions and feedback, continuously improving its performance for your specific use cases.',
        image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80'
      },
      {
        id: 4,
        title: 'Privacy & Security',
        content: 'Your data stays private with local processing options and enterprise-grade security features built from the ground up.',
        image: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80'
      }
    ],
  },
  growthSection: {
    title: 'Growing with the Community',
    description: 'Join thousands of developers and businesses already using Operator to transform their workflows',
    items: [
      {
        id: 1,
        content: (
          <div className="flex flex-col gap-4">
            <div className="text-6xl font-bold text-primary">10K+</div>
            <div className="text-2xl font-semibold">Active Users</div>
          </div>
        ),
        title: 'Trusted by Developers Worldwide',
        description: 'Over 10,000 developers and teams are already using Operator to automate their daily tasks and boost productivity.',
      },
      {
        id: 2,
        content: (
          <div className="flex flex-col gap-4">
            <div className="text-6xl font-bold text-primary">500+</div>
            <div className="text-2xl font-semibold">GitHub Stars</div>
          </div>
        ),
        title: 'Open Source Growth',
        description: 'Our growing GitHub community contributes to continuous improvements and new features that benefit everyone.',
      },
      {
        id: 3,
        content: (
          <div className="flex flex-col gap-4">
            <div className="text-6xl font-bold text-primary">24/7</div>
            <div className="text-2xl font-semibold">Automation</div>
          </div>
        ),
        title: 'Always Working for You',
        description: 'Operator works around the clock, handling tasks and workflows so you can focus on what matters most.',
      },
      {
        id: 4,
        content: (
          <div className="flex flex-col gap-4">
            <div className="text-6xl font-bold text-primary">100%</div>
            <div className="text-2xl font-semibold">Open Source</div>
          </div>
        ),
        title: 'Fully Transparent',
        description: 'Complete transparency with open source code that you can inspect, modify, and contribute to.',
      },
    ],
  },
  cloudPricingItems: [
    {
      name: 'Free',
      price: '$0',
      description: 'Get started with',
      buttonText: 'Try Free',
      buttonColor: 'bg-secondary text-white',
      isPopular: false,
      hours: '60 min',
      features: ['Public Projects', 'Basic Model (Limited capabilities)'],
      stripePriceId: config.SUBSCRIPTION_TIERS.FREE.priceId,
      upgradePlans: [],
    },
    {
      name: 'Pro',
      price: '$40',
      description: 'Everything in Free, plus:',
      buttonText: 'Try Free',
      buttonColor: 'bg-primary text-white dark:text-black',
      isPopular: true,
      hours: '2 hours',
      features: [
        '2 hours',
        'Private projects',
        'Access to intelligent Model (Full Operator)',
      ],
      stripePriceId: config.SUBSCRIPTION_TIERS.TIER_2_40.priceId,
      upgradePlans: [],
    },
    {
      name: 'Custom',
      price: '$100',
      description: 'Everything in Pro, plus:',
      buttonText: 'Try Free',
      buttonColor: 'bg-secondary text-white',
      isPopular: false,
      hours: '6 hours',
      features: ['Suited to your needs'],
      upgradePlans: [
        {
          hours: '6 hours',
          price: '$100',
          stripePriceId: config.SUBSCRIPTION_TIERS.TIER_6_100.priceId,
        },
        {
          hours: '12 hours',
          price: '$200',
          stripePriceId: config.SUBSCRIPTION_TIERS.TIER_12_200.priceId,
        },
        {
          hours: '25 hours',
          price: '$400',
          stripePriceId: config.SUBSCRIPTION_TIERS.TIER_25_400.priceId,
        },
        {
          hours: '50 hours',
          price: '$800',
          stripePriceId: config.SUBSCRIPTION_TIERS.TIER_50_800.priceId,
        },
        {
          hours: '125 hours',
          price: '$1600',
          stripePriceId: config.SUBSCRIPTION_TIERS.TIER_125_1600.priceId,
        },
        {
          hours: '200 hours',
          price: '$2000',
          stripePriceId: config.SUBSCRIPTION_TIERS.TIER_200_2000.priceId,
        },
      ],
      stripePriceId: config.SUBSCRIPTION_TIERS.TIER_6_100.priceId,
    },
  ],
  companyShowcase: {
    companyLogos: [
      {
        id: 1,
        name: 'MSSC',
        logo: (
          <img
            src="/company-logos/mssc.png"
            alt="MSSC"
            className="h-20 w-auto object-contain"
          />
        ),
      },
      {
        id: 2,
        name: 'Huston',
        logo: (
          <img
            src="/company-logos/huston.png"
            alt="Huston"
            className="h-16 w-auto object-contain"
          />
        ),
      },
      {
        id: 3,
        name: 'PSI',
        logo: (
          <img
            src="/company-logos/psi-cropped.png"
            alt="PSI"
            className="h-18 w-auto object-contain"
          />
        ),
      },
      {
        id: 4,
        name: 'PPS',
        logo: (
          <img
            src="/company-logos/pps.svg"
            alt="PPS"
            className="h-14 w-auto object-contain"
          />
        ),
      },
    ],
  },
  quoteSection: {
    quote:
      'Operator has transformed how we approach everyday tasks. The level of automation it provides, combined with its open source nature, makes it an invaluable tool for our entire organization.',
    author: {
      name: 'Michael Strope',
      role: 'President, MSSC',
      image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAJQAtQMBIgACEQEDEQH/xAAcAAABBQEBAQAAAAAAAAAAAAAGAAIDBAUHAQj/xAA+EAACAQMDAQYEAgkCBQUAAAABAgMABBEFEiExBhMiQVFhFDJxgQdCFSMzUpGhscHRJGI0U+Hw8RZDZHKS/8QAGQEAAgMBAAAAAAAAAAAAAAAAAAMBAgQF/8QAIhEAAgIDAQACAgMAAAAAAAAAAAECEQMhMRIEUUFhEyIy/9oADAMBAAIRAxEAPwChb2ckcxNwpBXorcc025k+IcxjmFT1/eNWLuWTulEkjPIRs3Mcn3NRKndxY4waTjjex+WbsiARdveZ2nrt8hRna9jLfUdLN7pV+0uVPdq6Y5HkaDdvHPOKNNH11tA0XQ5pCWtpppo519tww31FXm2uCQb0q1gudRFlqE72m47FbZnx5xg+lWtY0aK11iPSrG6N1dM+102bQp8qJe2Who9za67pwDRtJGZtnpkeMUM9obmWx7aXd3bsFmhuQysVyPlHGKqnfANA9mrGLVE0i61No7+RQVHdeHJ8s1i61pVzpN69ndjLYDI46MPaiSwS57Ra7p+r3N1Z4jAYW8DeMBfLb161hfiH2iS81pgkLobde6VHGGJznJHl5URk26AwxP8ACsZWYBfMetUtR1aORgIYehyGc1nTSzTNvnlx98AVFv2oWjIfHUg5pjgullN/glk1OYnCGME+SrzU1trGqQwSQRykRyHxB0B5qg11jh02+4p4Mci8Nn+n/SpqJDlN9NCy1aRGIuvEv70f+K24bsTYeKXcp4BBoQZUydrbWHn6fWn2tzNbOGiIU48aZ4NUlD6GQyPjDf4idCMSsOPI4pW2oX7SBIbiXJPTd1qv2fuLHVUEd1OYJV+UdQ30op0jRktA15EwuGAOyMgDJ8sUtpjvcaLFvdQ6bbw2+pys806ncSc7R6Vlator2id9b5lt2GQV/LWVqLzSzu9wCJCeR/b6Vb0fWriwOxmMtux2tE3THtUoXtbRHazyW7iS3Yoy87wfL+9EdpcW10i317DHDKDgSdA59cVFJpNtqCJcafKEic/rEx0+1YfaKd5b34VF2xWw2Iv96gtft0ifW7a5F0Zp2EiyfJKvQiqtndTWMhlicqTw2OhHoRTNN1ZrRTb3K97at1jPOPcVZutPygubFviLVzgHzQ+hFQTzTJxZ6TrDNOJxYyj9oh6E+opU74mw0RVguozNO43OAM7falQR6ZjyeOcbvyjP3NNlNKSRe/fayspAwVOahZiTzToKkZm7YhlmCAZJOBjzNFOt6JqC9jdMBgbNvLI8qryVVuhoSY0/4y527TczlcYx3h5okrANfw57Qgj9B37Aq+fh2bp7r/ioYIbC5/Ea9g1JVKM52K/QvgYBoLQhWVkJVlOQQcEfSnTO8jtLI7NIzZLE5OfXNU8btAa/aeSPs92muL7T7Z4ILZwVDKQC2PL2/wCtc+1PW2mup7mUb7iVi7u3qa1e12tX88NvaXF5NJACXKs2eR0oZaHvyFjHif8AlV0qJSsrXUsty++SVtp6belWNOtr3cWtu8ODn2Ye9FOidkg8cbTrk9aNLLQ4reICJFHvUNsbHHZzabTLyfDCNkYjkDpXkGhakzFo1OfTyrqqaWXcBlG2r8OnwxDgc1S2MWJHGZ9NvUyGjcOOvpULiSACO4Upn5WYdK7TLZQt8yKftWTq+iWl5C4eFTx/CrJlZYqOSrdy2kwdZCmD4WXqp9RR3pXam8vzGHdEkhUAGPgNnzx60F63pkmnzPA2WUHKP6rUOhd5HqkCIwbe4AUnFS1aFrUqOuC8s9Z/V3mILs/LN5H61m3WmXdrex2zKT3hwrLyGrOdCjkNlefMUW6FdS2WmG41BiYgw7hGHiB9RSk7Hzj5VoV3OOz9rHBZur3TcyFucClOll2jgMsO2C/UcrnANZ+vaZKHkvraX4mBzkkclaHxPJHIkkbFWB4wcEUOTQRxpxv8k95aSW07Q3ClZB6+dbujlNE0p7i6jxPO2EQt8y/Tyq1pN1HrkQGpxBntsbZsYH0NY/aWO6+PMlyvgYYix8uKL1oE7dMtzafYa0/xSXPw0h/aIz45r2hwSSAYY4x0pVWy3gt4AHTyxUT9K3DoyPYNf20k09osKudiDvAScbdvtg1m6lax28drLBOJkuIy3y7ShBwQRnrWj0rowlHGT1APXmmAZ9PtV/SdPk1KaWOM47qNpW4ycD0FR6nZmwue53hwyLIrAYyGGRkeRqbV0BUFen5cVb06xlvpXSLA2RmR2P5VHU1KulSTwW89jLHdrPL3SImQwbrgg9KPSQAh2jUCeIueNhwPvVzsppqXV8JG+Vcdab24tDZX8dsZopZIxiTuzwh8xWr2QcKQBzzzRZeIbwRKiAKBx7VOrADAqCM/mHIIxUmKq0aYFgSDA9q8E6nIzVZQ4ckk4pMWzgD70sckSyNkVXY9akAcjBxionBU+RFSiJIF+1GlR3tnJkAOvKtXPLexkgulfJ8Dj711jVMGCRcckGudXtx3e5QpzkgZq6ZlyLZ0qzFpqgt4p4gGCgqyeePI1H2pllF2kZ2LCExGoPQVS06Z4LCN4eXMW058j51Ys7+31CL4XVBx0SbzU+9KstGyhYajcWcwa3c7ehRvlYVoSaXb6v8A6nS9iTH9pAzcg+1VL7R57Ib1xLbtysiHIxWhp+NI0pr11AupuIg3kvrQW/aFqdwLK2OmWgUKMCZh+Y1UsdWCRtaXid/aN5HqnuKtCa11lNspW1vv3j8j1mXVlcWkxhuI9p6ZHII9jUErfSa50OR2Emmk3Ns/KsvUexryrOmaZdTxu1rP3CA48TYDfSlRYWSdnrt9NguXs7+G3vQ4RY5WHdyr59eKb2ovra/mtZI44UuzCfi+4OU356Ajg+v3qjHpN5cWRvIlj+HVsO7yBdp989K8XRdRe8azW2Y3Crv2bhkqfMc8inUrsxm92IltrWCe5ieL9IRyAd3K4XfCfm256nrUHbSO1QQPYzWssEjFxIjq0jsfynHkBQ+mn3Vys7RwiT4fPekODs9+tevpd7EkUj2zKk2BG3GH+9R5XqyTS7JPPDfzz2s0Mc8cJ2RzEBZskAoc+v8AXFE9vqunQ32mX+oWa6bdNOyyxZwuCv7QjyAOOfrQFeWU9k4ivrdonPIWRcVKulXwUN+jp9jDO4RHkevSplBNgZnb7Srm3vp5ZkbBuGO/yKsxIIq12MtSLSSZ+jN4actu1xE8GWEJRlZSeAR0P1rU0JDDpiIigNU8VDVGi+2pQ2yhZG8R6KOTVSftFGn/ALcv/wCcVn39jqDuTbqELnlzz/KqMui3LOC980g/MruVzz5AVRuxyVBJba0tyMocD3NWzfEJuPKnz9KDZNImglSW3lK7Rg85JNE5JbTAhUbtvWltMfF6K13r/wAO21XQnPQnmpLfWTOOYGAPnQ8dHDSP3h3bl8PPIPvUkOhuquy3IjbI27JCefpmhJi5N3QQPOlyDsbnzFAWoWkn6ZaAAkd6pAPn/wB8UaWNlPGP9QVY+q+dUb2xM2rRyISCyEnHqP8AyKYmLlC2PhmaBys0ZVeA4HUH1FWJbdXxJERhuQR0NVwgWNEbkhRkk0ozLAd1vJsz1GMg/UUOFq0K9OLo3dEkljnS2dl7p+Gjc8fb3p3aK2luSLm1ImhiG3an5B61lRybo1Z5U705JCcEU+C+fT73EB2+Adeh+tLei6e7RmyYbjbxW3otxJfFdPuYjcRjlXPzR++fSnvDZ6udwC2l57fI5/zXjxnRdPKZAvLngkH5Uor6GN2v2WtUtruNoo7OMtAi4Xac/XNKsSK8ntwUhndF9FfzpUWV8SN2wSNew+qd7A80ffqdiHDEcdDWxahx2q0qdpF7qbTSsMJGHjGBwfU8/wAqAPjLq3iaKG5uIk3fLHKVB+wNQm5naZZ3uJmmXkSs5Lr980zw+mZ6ZdtYilvrW9SpERUk5HiLgYNbOvLjsx2UyDkE+XTkUOXV/d3f/E3UsnOfE3nUz6vqEiRRveSNHCcxKQp2H24qzg6RFm327tZbztWILdN8jW6cAeW0k0/Wnni7PdlHtncTByU2sc5yMD3rH/T+rlzIdRkMhXYZDHHuxjpnbTf0/qwigi+NykHEQ7mPwfQ7cio8SoLRtdvEgh1q9W2VVLqjSbR0Yjn78Cs7SHBtYgPKqtnO8huGnldycuzPyST6modHm2wMH6g1dRofF3EJu53xAtjpVX4JFbPI+lV475iB4uBwBUF3qT8JGfGfKlza4jXCOrLksURGAwyOoqw8ai3C9eKHotSjsnPxILMzA7/StJdWi7ktlcHoalNUFbJIYFcbWK5qxFY7cEE8VjPfQ3EIFrJ+tU5yKtadq8nKSEFlOCKW2rLRWjXcFV8QxxWFqMhhmhkBwQ3H3/8AFaM99lSMj1rKupw95aKcFTICavp8FTVMkul/1AbGAVBxUQGDwP41d1MAXOQeCOKqHAAPrTFww5NyZ7D+16DODzXtzp91cXTzW6l1VQMKeenpShx33UdKXxMttqMkkUhRuOR9KRk1Ibi2i3otubm4/wBSrd1HkyE8bcVpXWoWGofqrnKhSRFKvUD3FeyPeXujuY7ZTJKcyGMbS3vihwhlJD5BU42niouhi3suXOkXMbgwjv425V0NKo7XUri0UpCRtJzzn+1e0Wif7DBYI6Ludlbz8NI6YoP7fn/6Vag7FyZUS6/dEKTnYMFv4k1t2PZ+ys8EvcXDjzmlJ/l0roR+LlfTnyzQBqPSjMdschc+gjNN/RRJKiTxA4I2GjyPbGAI1CgdAKz7pvhrgkDCycijLgeON2TCSm6QNRdnLmUZVgB7gip4uy0zNtknjVfPGSa2zej97Aqu+pJGzDdWb2kO/jYy702FdPa1tsxkDIfHJPvQXG7IXjIGQSM9M0WajqPd2hYN1GBQV3xVyzoy7iSNwxmobsZBUi4ZnNrJJEeVHFZ6XCxJ3tzPsLDJYnrVrTZ1V8Z4J6EVctre3mSSKYI4ZvlI6Up9NMeGQ224IZZVZfIhq9jgfdw3gHU7uK24dK+HkBtp9iL0RlDKKvwwypt/4RiFK5MXr96mmyyTMCENbtkSxhepY1FcSEr8RDKjsvnH0NEEli8/guZt0e0AqqgA1RvreCOa3ghjVIweVX0FUaYbR60x7hG/Njmq5Z5byIxAFgeBXt3IhlIVvCOnFM08y99JJBGJpFXKIWxk+lSnQubNWSO6kOXjOcUw29wSP1TYFZ8+sanBFJNNpCoqkDxSkZJqAdrLlUz+ilPqBMf8Uz+QzODezeggJdQqP3hGCKZPbo2pSKLiPwbe9VjgqNozj1ofl7RPqMEtsLL4V5MZdZjuGPTgf1q7pey1tS0694JSVALHOB1OaW1bsZFUqLz6rKZzJbyMgxhQG6AVK2pRXsqfHKe96d9Fwx+o86rHTlmTvNPkDccwucMP81QZXhkHfRujA85HSjg3+tBCNMdxmCSOZTzuVgp+4PnSqfQLJ7yKSbYCpIC5+9Kp2KcgjZwhztIJFIzgjg8edAPZXtc+pz3MUyFQvMWOfD71q3Ovwx2+8yLGA2OQQT9M13H8mLVnOWFxdMJmuVXqR9c1k65fRixaTvAGj5Az19qE7/tNALcyi8tlO7HdtJl/rtFD9z2jtpH3PctIfRVNZM2f2vJoxwp3YUpPqd8mbW3KoejysFH+aki0S+uUla7uTE239WI8HJ98+VAz9pkHEUUpx5lsVH/6qvVJ7olM/wC41jUG/wAD5ZF9hxFaa1b4WOFpAP3wP61napJd3N2trKge8Cl+7Qcog6k0Jy9otWmXb8ZKg/2sQaL/AMILT4jVNQvZy0jLGI8uSSc9eadDC5OhMs3lGIJijZz08hWpp9wzsWGKtdr+zz6beNLChNvIcqR0+n1rFtbg25ORwf5UmcPLofjyelYXoDLEDE3NKOG4LgFwAayrK5BwS+ce9aSX+Y+WGM9CaUzSqZclRoIwGOTjrnrQ7d3DC47w+XAqzeagVJJY0PXFy88xKZJPQVJWUqLDXDPnGT1J48qvaf3e5ZYm3oV+ZD1FX+x2lPLfSF0yPh3LbuduRgA/UmgbRb2XR9XeyuGZIVl7uRW/KM9as8LcbMzy7oPNc+Lk06zSZHdFG4vjPPlmsLYpIznitm/1aZb5ntZyI+No6qw+lM/SFndcXtnsb/mQ8H+FVpLQ+NozEgW4mjURhm3eHI861NY8NwIY0KRwrsAx1HrVnS7e2hvDeRTd5BCm/BHiz6U19aklB71EkQn5XFQ2qBJydxRQhmKjIyuK0LC9lllWAnvVkO0I4zVac2UuHiDwN5qRuXNa/Y7THk1N7hyrxxqCpX1NEX9BkpK2GumWi2lmkSIFA8h5Uqv24wDSrQomFy2fOGn6umj6TMLfDXt1kZ/5a+R+tYkk1xOAJp5JMdN7k12Tt92Zi1vT0ubWNUu4kLIVXG8Yzg1xvB9Me1NhtFsumM7sU7YAOlOFemrihmOOtSJHgD3rwpn6U5ARwWz6VKAdjArp34MtiPUvd0/pXMjXSfweGBff7mUU3HqRSf8Ak6df2MV7bPBMgZGGD5fwrmXaTszLp5bq8JPEgHy+zV1mDxriqPaG90/SNMa51JlWInYob8x8gKrnxp7LYJtNI4ifiLRiGXKeorw3znhVOaOG03SNQkSS1u0hMgyI1+Ue1NbstMG8EkAQ/nlbYR9jXO8s6IGrFc3pG4FU9aJOzXZua9k2wRnapw8r9B7URaDoGkz6gbW5vlnuVXf3EY2jGf50d21pHbRiOGNURBhVUYAHtTcWL09mfLk88MaDS7fSdP7iBeXbMjnqxrmX4laRaKbm+RFS5jYHgfMDgV1y+8TKPQ1yn8VZ1+Hdd2C8gX+HP9q3yilCjEm3MB7DVZbfbHIN8fp5j6Gtm3v7e54jcbv3TwaFOcYJzSB5Ht0rJLDGRrhnlE6ZpNvvsZgZliEhAjDdDjnmvLjRrqNN4XevXMR3UFWOt3EKrDKzSQqMAH8v0rcsdXk3brW6kz+7np9qy5MXnq0acWVy4ydx3bbS6q37pOD9xRp+Ht3ETdWOB3ieMN+960KXWq/HQFb63ic7fDIowwNQaFqR0rV7a9ydqttkA80PBpUEoyF/JyydRZ2tF4pV5DKsiBo2BUgEH1zXlbktGQwJHiNuAG2hegrlX4maRZWJtLyyt0hadmWQIMAnqDj1o1mnYnbkigf8R75ZUs7TPjUmU+wxgUrFJt0asqVWBVen5TTRTvKtZkHL0FOFMT5RT6APa6b+EwMcLsOkrt/Fcf5rmNdN/DfMGlRTf/Ib+HGatF00D4dWiJQbm4Uda5B2/wBYudT10SH/AIKDwwKwBHu3Pmf8V07WLhlt/h4W8cg/gtCOtaBbXdsSn6tyM4q2SbchnxWoO2D9siS2qsqozY54FV5GZGIII+jYqDTNlhdzQTlyytj5SR7VYnLSzhEUlnOAB1b2rRGMatnfcoyjZTt7yTRtSgvtOXN1G4Zc87h5rn0IrvllfQ6hpsF9b8RzJux6HzH26Vy/T+zEiQGW4VBMw5LH5faifshI9vDc2G/ci/rF9vIisvpOejjfMlGW4mvdyBUkkPQCuOfihchr20tU6qDK/wBTwP6Gun9obx7dFghRXY+JiT09K4V2hvZNQ1i4nkYMd20Y9BxV8kvwY4KjPzXhfnaBXtKlljwcVLG5QgqSD6ioj6edeg0BdG1aauGiMdwPET84HX/v1p1xeKQVjOcjrWKDgV6Jif2YxWWeON6GbluQQrr2pRxpELuUIgwoB6ClWPH3rL8jH7V5RSJo6xJ8z5AOPWuO6ndTXt9PcXD7pGc59sHFKlRgL5SqKd5UqVaRA6P5RTqVKgD0da63+H0SHstCSOS7n+dKlUx6QwpiJkEsrnLDCgn0A4qhrUjRadNMnDqhIPvSpU5LZfH1APpiK90C3J5P1PrW72Yf43tO8dwiMLeF3jOOQcj/ADSpVfNqJ2susLDTaNhGOozVTRVEeoTsvXuzSpVkj040uGV2mnkSxu5wf1gjZgfeuJAluTyTya8pUyfRa4e0qVKqgMB6n3r0cnFKlUAP6k58qL+xmlWl0gmnj3PSpVmkaIB3Hpdkq4ECfwpUqVVG0f/Z',
    },
  },
  pricing: {
    title: 'Open Source & Free Forever',
    description:
      'Operator is 100% open source and free to use. No hidden fees, no premium features locked behind paywalls.',
    pricingItems: [
      {
        name: 'Community',
        href: '#',
        price: 'Free',
        period: 'forever',
        yearlyPrice: 'Free',
        features: [
          'Full agent capabilities',
          'Unlimited usage',
          'Full source code access',
          'Community support',
        ],
        description: 'Perfect for individual users and developers',
        buttonText: 'Hire Operator',
        buttonColor: 'bg-accent text-primary',
        isPopular: false,
      },
      {
        name: 'Enterprise',
        href: '#enterprise-security',
        price: 'Free',
        period: 'forever',
        yearlyPrice: 'Free',
        features: [
          'Full agent capabilities',
          'Unlimited usage',
          'Full source code access',
          'Custom deployment',
          'Local data storage',
          'Integration with your tools',
          'Full customization',
          'Community support',
        ],
        description: 'Ideal for organizations with specific requirements',
        buttonText: 'View Docs',
        buttonColor: 'bg-secondary text-white',
        isPopular: true,
      },
          {
      name: 'Enterprise',
      href: '#enterprise-security',
      price: 'Custom',
      period: '',
      yearlyPrice: 'Custom',
      features: [
        'Everything in Enterprise',
        'RBAC & SSO Integration',
        'Custom agents & tools',
        'Dedicated training & support',
        'SLA guarantees',
        'Single tenant deployment',
      ],
      description: 'For large organizations needing enterprise features',
      buttonText: 'Schedule Demo',
      buttonColor: 'bg-primary text-primary-foreground',
      isPopular: false,
    },
    ],
  },
  testimonials: [
    {
      id: '1',
      name: 'Alex Rivera',
      role: 'CTO at InnovateTech',
      img: 'https://randomuser.me/api/portraits/men/91.jpg',
      description: (
        <p>
          The AI-driven analytics from #QuantumInsights have revolutionized our
          product development cycle.
          <Highlight>
            Insights are now more accurate and faster than ever.
          </Highlight>{' '}
          A game-changer for tech companies.
        </p>
      ),
    },
    {
      id: '2',
      name: 'Samantha Lee',
      role: 'Marketing Director at NextGen Solutions',
      img: 'https://randomuser.me/api/portraits/women/12.jpg',
      description: (
        <p>
          Implementing #AIStream&apos;s customer prediction model has
          drastically improved our targeting strategy.
          <Highlight>Seeing a 50% increase in conversion rates!</Highlight>{' '}
          Highly recommend their solutions.
        </p>
      ),
    },
    {
      id: '3',
      name: 'Raj Patel',
      role: 'Founder & CEO at StartUp Grid',
      img: 'https://randomuser.me/api/portraits/men/45.jpg',
      description: (
        <p>
          As a startup, we need to move fast and stay ahead. #CodeAI&apos;s
          automated coding assistant helps us do just that.
          <Highlight>Our development speed has doubled.</Highlight> Essential
          tool for any startup.
        </p>
      ),
    },
    {
      id: '4',
      name: 'Emily Chen',
      role: 'Product Manager at Digital Wave',
      img: 'https://randomuser.me/api/portraits/women/83.jpg',
      description: (
        <p>
          #VoiceGen&apos;s AI-driven voice synthesis has made creating global
          products a breeze.
          <Highlight>Localization is now seamless and efficient.</Highlight> A
          must-have for global product teams.
        </p>
      ),
    },
    {
      id: '5',
      name: 'Michael Brown',
      role: 'Data Scientist at FinTech Innovations',
      img: 'https://randomuser.me/api/portraits/men/1.jpg',
      description: (
        <p>
          Leveraging #DataCrunch&apos;s AI for our financial models has given us
          an edge in predictive accuracy.
          <Highlight>
            Our investment strategies are now powered by real-time data
            analytics.
          </Highlight>{' '}
          Transformative for the finance industry.
        </p>
      ),
    },
    {
      id: '6',
      name: 'Linda Wu',
      role: 'VP of Operations at LogiChain Solutions',
      img: 'https://randomuser.me/api/portraits/women/5.jpg',
      description: (
        <p>
          #LogiTech&apos;s supply chain optimization tools have drastically
          reduced our operational costs.
          <Highlight>
            Efficiency and accuracy in logistics have never been better.
          </Highlight>{' '}
        </p>
      ),
    },
    {
      id: '7',
      name: 'Carlos Gomez',
      role: 'Head of R&D at EcoInnovate',
      img: 'https://randomuser.me/api/portraits/men/14.jpg',
      description: (
        <p>
          By integrating #GreenTech&apos;s sustainable energy solutions,
          we&apos;ve seen a significant reduction in carbon footprint.
          <Highlight>
            Leading the way in eco-friendly business practices.
          </Highlight>{' '}
          Pioneering change in the industry.
        </p>
      ),
    },
    {
      id: '8',
      name: 'Aisha Khan',
      role: 'Chief Marketing Officer at Fashion Forward',
      img: 'https://randomuser.me/api/portraits/women/56.jpg',
      description: (
        <p>
          #TrendSetter&apos;s market analysis AI has transformed how we approach
          fashion trends.
          <Highlight>
            Our campaigns are now data-driven with higher customer engagement.
          </Highlight>{' '}
          Revolutionizing fashion marketing.
        </p>
      ),
    },
    {
      id: '9',
      name: 'Tom Chen',
      role: 'Director of IT at HealthTech Solutions',
      img: 'https://randomuser.me/api/portraits/men/18.jpg',
      description: (
        <p>
          Implementing #MediCareAI in our patient care systems has improved
          patient outcomes significantly.
          <Highlight>
            Technology and healthcare working hand in hand for better health.
          </Highlight>{' '}
          A milestone in medical technology.
        </p>
      ),
    },
    {
      id: '10',
      name: 'Sofia Patel',
      role: 'CEO at EduTech Innovations',
      img: 'https://randomuser.me/api/portraits/women/73.jpg',
      description: (
        <p>
          #LearnSmart&apos;s AI-driven personalized learning plans have doubled
          student performance metrics.
          <Highlight>
            Education tailored to every learner&apos;s needs.
          </Highlight>{' '}
          Transforming the educational landscape.
        </p>
      ),
    },
    {
      id: '11',
      name: 'Jake Morrison',
      role: 'CTO at SecureNet Tech',
      img: 'https://randomuser.me/api/portraits/men/25.jpg',
      description: (
        <p>
          With #CyberShield&apos;s AI-powered security systems, our data
          protection levels are unmatched.
          <Highlight>
            Ensuring safety and trust in digital spaces.
          </Highlight>{' '}
          Redefining cybersecurity standards.
        </p>
      ),
    },
    {
      id: '12',
      name: 'Nadia Ali',
      role: 'Product Manager at Creative Solutions',
      img: 'https://randomuser.me/api/portraits/women/78.jpg',
      description: (
        <p>
          #DesignPro&apos;s AI has streamlined our creative process, enhancing
          productivity and innovation.
          <Highlight>Bringing creativity and technology together.</Highlight> A
          game-changer for creative industries.
        </p>
      ),
    },
    {
      id: '13',
      name: 'Omar Farooq',
      role: 'Founder at Startup Hub',
      img: 'https://randomuser.me/api/portraits/men/54.jpg',
      description: (
        <p>
          #VentureAI&apos;s insights into startup ecosystems have been
          invaluable for our growth and funding strategies.
          <Highlight>
            Empowering startups with data-driven decisions.
          </Highlight>{' '}
          A catalyst for startup success.
        </p>
      ),
    },
  ],
  faqSection: {
    title: 'Frequently Asked Questions',
    description:
      "Answers to common questions about Operator and its capabilities. If you have any other questions, please don't hesitate to contact us.",
    faQitems: [
      {
        id: 1,
        question: 'What is an AI Agent?',
        answer:
          'An AI Agent is an intelligent software program that can perform tasks autonomously, learn from interactions, and make decisions to help achieve specific goals. It combines artificial intelligence and machine learning to provide personalized assistance and automation.',
      },
      {
        id: 2,
        question: 'How does Operator work?',
        answer:
          'Operator works by analyzing your requirements, leveraging advanced AI algorithms to understand context, and executing tasks based on your instructions. It can integrate with your workflow, learn from feedback, and continuously improve its performance.',
      },
      {
        id: 3,
        question: 'Is Operator really free?',
        answer:
          'Operator offers a free tier with 60 minutes of usage per month, giving you access to basic AI capabilities and public projects. For more advanced features like private projects, longer usage hours, and access to our full intelligent model, we offer Pro ($40/month) and Custom plans starting at $100/month. For enterprises, we provide custom deployment options with local data storage, SSO integration, RBAC, and tailored pricing based on your specific needs.',
      },
      {
        id: 4,
        question: 'Can I integrate Operator with my existing tools?',
        answer:
          'Yes, Operator is designed to be highly compatible with popular tools and platforms. We offer APIs and pre-built integrations for seamless connection with your existing workflow tools and systems.',
      },
      {
        id: 5,
        question: 'What types of tasks can Operator handle?',
        answer:
          'Operator can handle a wide variety of tasks including competitor analysis, lead generation, travel planning, Excel spreadsheet creation, LinkedIn research, SEO analysis, scientific paper research, and much more. For industrial use cases, it can automate supply chain analysis, regulatory compliance research, market intelligence gathering, technical documentation creation, and vendor evaluation processes. It can browse the web, analyze data, create documents, and interact with various platforms on your behalf.',
      },
      {
        id: 6,
        question: 'How does Operator save me time?',
        answer:
          'Operator automates repetitive tasks, streamlines workflows, and provides quick solutions to common challenges. This automation and efficiency can save hours of manual work, allowing you to focus on more strategic activities.',
      },
    ],
  },
  ctaSection: {
    id: 'cta',
    title: 'Start Using Operator Today!',
    backgroundImage: '/holo.png',
    button: {
      text: 'Get Started for free',
      href: '/auth',
    },
    subtext: 'The generalist AI Agent that works on your behalf',
  },
  footerLinks: [
    {
      title: 'Operator',
      links: [
        { id: 1, title: 'About', url: 'https://operator.omni.ai' },
        { id: 3, title: 'Contact', url: 'mailto:hey@operator.omni.ai' },
        { id: 4, title: 'Careers', url: 'https://operator.omni.ai/careers' },
      ],
    },
    {
      title: 'Resources',
      links: [
        {
          id: 5,
          title: 'Documentation',
          url: 'https://operator.omni.ai/docs',
        },
      ],
    },
    {
      title: 'Legal',
      links: [
        {
          id: 9,
          title: 'Privacy Policy',
          url: 'https://operator.omni.ai/legal?tab=privacy',
        },
        {
          id: 10,
          title: 'Terms of Service',
          url: 'https://operator.omni.ai/legal?tab=terms',
        },
      ],
    },
  ],
  useCases: [
    {
      id: 'competitor-analysis',
      title: 'Competitor Analysis',
      description:
        'Analyze the market for my next company in the healthcare industry, located in the UK. Give me the major players, their market size, strengths, and weaknesses, and add their website URLs. Once done, generate a PDF report.',
      category: 'research',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.75 19.25H16.25C17.3546 19.25 18.25 18.3546 18.25 17.25V8.75L13.75 4.25H7.75C6.64543 4.25 5.75 5.14543 5.75 6.25V17.25C5.75 18.3546 6.64543 19.25 7.75 19.25Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 9L14 9C13.4477 9 13 8.55228 13 8L13 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 14.5L11 13L12.5 14.5L14.5 12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/2fbf0552-87d6-4d12-be25-d54f435bc493',
    },
    {
      id: 'vc-list',
      title: 'VC List',
      description:
        'Give me the list of the most important VC Funds in the United States based on Assets Under Management. Give me website URLs, and if possible an email to reach them out.',
      category: 'finance',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4.75L19.25 9L12 13.25L4.75 9L12 4.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.25 11.5L4.75 14L12 18.25L19.25 14L14.6722 11.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/a172382b-aa77-42a2-a3e1-46f32a0f9c37',
    },
    {
      id: 'candidate-search',
      title: 'Looking for Candidates',
      description:
        "Go on LinkedIn, and find 10 profiles available - they are not working right now - for a junior software engineer position, who are located in Munich, Germany. They should have at least one bachelor's degree in Computer Science or anything related to it, and 1-year of experience in any field/role.",
      category: 'recruitment',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.25 10C17.25 12.8995 14.8995 15.25 12 15.25C9.10051 15.25 6.75 12.8995 6.75 10C6.75 7.10051 9.10051 4.75 12 4.75C14.8995 4.75 17.25 7.10051 17.25 10Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.25 14.75L5.25 19.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.75 14.75L18.75 19.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/d9e39c94-4f6f-4b5a-b1a0-b681bfe0dee8',
    },
    {
      id: 'company-trip',
      title: 'Planning Company Trip',
      description:
        "Generate a route plan for my company. We should go to California. We'll be 8 people. Compose the trip from the departure (Paris, France) to the activities we can do considering that the trip will be 7 days long - departure on the 21st of Jun 2025.",
      category: 'travel',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.75 8.75C4.75 7.64543 5.64543 6.75 6.75 6.75H17.25C18.3546 6.75 19.25 7.64543 19.25 8.75V17.25C19.25 18.3546 18.3546 19.25 17.25 19.25H6.75C5.64543 19.25 4.75 18.3546 4.75 17.25V8.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 4.75V8.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 4.75V8.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.75 10.75H16.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/23f7d904-eb66-4a9c-9247-b9704ddfd233',
    },
    {
      id: 'excel-spreadsheet',
      title: 'Working on Excel',
      description:
        'My company asked to set up an Excel spreadsheet with all the information about Italian lottery games (Lotto, 10eLotto, and Million Day). Based on that, generate and send me a spreadsheet with all the basic information (public ones).',
      category: 'data',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.75 6.75C4.75 5.64543 5.64543 4.75 6.75 4.75H17.25C18.3546 4.75 19.25 5.64543 19.25 6.75V17.25C19.25 18.3546 18.3546 19.25 17.25 19.25H6.75C5.64543 19.25 4.75 18.3546 4.75 17.25V6.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.75 8.75V19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 8.25H19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/bf6a819b-6af5-4ef7-b861-16e5261ceeb0',
    },
    {
      id: 'speaker-prospecting',
      title: 'Automate Event Speaker Prospecting',
      description:
        "Find 20 AI ethics speakers from Europe who've spoken at conferences in the past year. Scrapes conference sites, cross-references LinkedIn and YouTube, and outputs contact info + talk summaries.",
      category: 'research',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5.75 19.2502H18.25C18.8023 19.2502 19.25 18.8025 19.25 18.2502V5.75C19.25 5.19772 18.8023 4.75 18.25 4.75H5.75C5.19772 4.75 4.75 5.19772 4.75 5.75V18.2502C4.75 18.8025 5.19772 19.2502 5.75 19.2502Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.75 8.75C9.75 9.44036 9.19036 10 8.5 10C7.80964 10 7.25 9.44036 7.25 8.75C7.25 8.05964 7.80964 7.5 8.5 7.5C9.19036 7.5 9.75 8.05964 9.75 8.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19.25 13.75L14.75 9.25L7.25 16.75"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/6830cc6d-3fbd-492a-93f8-510a5f48ce50',
    },
    {
      id: 'scientific-papers',
      title: 'Summarize and Cross-Reference Scientific Papers',
      description:
        'Research and compare scientific papers talking about Alcohol effects on our bodies during the last 5 years. Generate a report about the most important scientific papers talking about the topic I wrote before.',
      category: 'research',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.75 6.75C4.75 5.64543 5.64543 4.75 6.75 4.75H17.25C18.3546 4.75 19.25 5.64543 19.25 6.75V17.25C19.25 18.3546 18.3546 19.25 17.25 19.25H6.75C5.64543 19.25 4.75 18.3546 4.75 17.25V6.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.75 8.75V19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 8.25H19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/a106ef9f-ed97-46ee-8e51-7bfaf2ac3c29',
    },
    {
      id: 'lead-generation',
      title: 'Research + First Contact Draft',
      description:
        'Research my potential customers (B2B) on LinkedIn. They should be in the clean tech industry. Find their websites and their email addresses. After that, based on the company profile, generate a personalized first contact email.',
      category: 'sales',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.75 11.75L10.25 6.25L14.75 10.75L19.25 6.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.75 19.25H18.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 11.25V19.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1552581234-26160f608093?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/a01744fc-6b33-434c-9d4e-67d7e820297c',
    },
    {
      id: 'seo-analysis',
      title: 'SEO Analysis',
      description:
        "Based on my website operator.omni.ai, generate an SEO report analysis, find top-ranking pages by keyword clusters, and identify topics I'm missing.",
      category: 'marketing',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        > 
          <path
            d="M4.75 11.75L10.25 6.25L14.75 10.75L19.25 6.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19.25 6.25V19.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4.75 6.25V19.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4.75 19.25H19.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/59be8603-3225-4c15-a948-ab976e5912f6',
    },
    {
      id: 'personal-trip',
      title: 'Generate a Personal Trip',
      description:
        'Generate a personal trip to London, with departure from Bangkok on the 1st of May. The trip will last 10 days. Find an accommodation in the center of London, with a rating on Google reviews of at least 4.5.',
      category: 'travel',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.75 8.75C4.75 7.64543 5.64543 6.75 6.75 6.75H17.25C18.3546 6.75 19.25 7.64543 19.25 8.75V17.25C19.25 18.3546 18.3546 19.25 17.25 19.25H6.75C5.64543 19.25 4.75 18.3546 4.75 17.25V8.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 4.75V8.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 4.75V8.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.75 10.75H16.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/8442cc76-ac8b-438c-b539-4b93909a2218',
    },
    {
      id: 'funded-startups',
      title: 'Recently Funded Startups',
      description:
        'Go on Crunchbase, Dealroom, and TechCrunch, filter by Series A funding rounds in the SaaS Finance Space, and build a report with company data, founders, and contact info for outbound sales.',
      category: 'finance',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4.75L19.25 9L12 13.25L4.75 9L12 4.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.25 11.5L4.75 14L12 18.25L19.25 14L14.6722 11.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/f04c871c-6bf5-4464-8e9c-5351c9cf5a60',
    },
    {
      id: 'scrape-forums',
      title: 'Scrape Forum Discussions',
      description:
        'I need to find the best beauty centers in Rome, but I want to find them by using open forums that speak about this topic. Go on Google, and scrape the forums by looking for beauty center discussions located in Rome.',
      category: 'research',
      featured: true,
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5.75 19.2502H18.25C18.8023 19.2502 19.25 18.8025 19.25 18.2502V5.75C19.25 5.19772 18.8023 4.75 18.25 4.75H5.75C5.19772 4.75 4.75 5.19772 4.75 5.75V18.2502C4.75 18.8025 5.19772 19.2502 5.75 19.2502Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.75 8.75C9.75 9.44036 9.19036 10 8.5 10C7.80964 10 7.25 9.44036 7.25 8.75C7.25 8.05964 7.80964 7.5 8.5 7.5C9.19036 7.5 9.75 8.05964 9.75 8.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19.25 13.75L14.75 9.25L7.25 16.75"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      image:
        'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2400&q=80',
      url: 'https://operator.omni.ai/share/53bcd4c7-40d6-4293-9f69-e2638ddcfad8',
    },
  ],
};

export type SiteConfig = typeof siteConfig;
