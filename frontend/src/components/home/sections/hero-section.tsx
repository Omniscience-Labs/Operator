'use client';
import { HeroVideoSection } from '@/components/home/sections/hero-video-section';
import { siteConfig } from '@/lib/home';
import { ArrowRight, Github, X, AlertCircle, Sparkles } from 'lucide-react';
import { GradientText } from '@/components/animate-ui/text/gradient';
import { FlickeringGrid } from '@/components/home/ui/flickering-grid';
import { LampContainer } from '@/components/ui/lamp';
import { FlipWords } from '@/components/ui/flip-words';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useScroll, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  BillingError,
} from '@/lib/api';
import { useInitiateAgentMutation } from '@/hooks/react-query/dashboard/use-initiate-agent';
import { useThreadQuery } from '@/hooks/react-query/threads/use-threads';
import { generateThreadName } from '@/lib/actions/threads';
import GoogleSignIn from '@/components/GoogleSignIn';
import MicrosoftSignIn from '@/components/MicrosoftSignIn';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from '@/components/ui/dialog';
import { BillingErrorAlert } from '@/components/billing/usage-limit-alert';
import { useBillingError } from '@/hooks/useBillingError';
import { useAccounts } from '@/hooks/use-accounts';
import { isLocalMode, config } from '@/lib/config';
import { toast } from 'sonner';
import { useModal } from '@/hooks/use-modal-store';

// Custom dialog overlay with blur effect
const BlurredDialogOverlay = () => (
  <DialogOverlay className="bg-background/40 backdrop-blur-md" />
);

// Constant for localStorage key to ensure consistency
const PENDING_PROMPT_KEY = 'pendingAgentPrompt';

export function HeroSection() {
  const { hero } = siteConfig;
  const tablet = useMediaQuery('(max-width: 1024px)');
  const [mounted, setMounted] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const { scrollY } = useScroll();
  const [inputValue, setInputValue] = useState('');
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { billingError, handleBillingError, clearBillingError } =
    useBillingError();
  const { data: accounts } = useAccounts();
  const personalAccount = accounts?.find((account) => account.personal_account);
  const { onOpen } = useModal();
  const initiateAgentMutation = useInitiateAgentMutation();
  const [initiatedThreadId, setInitiatedThreadId] = useState<string | null>(null);
  const threadQuery = useThreadQuery(initiatedThreadId || '');

  // Auth dialog state
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // FlipWords arrays for value proposition
  const moreWords = ["research", "analysis", "automation", "productivity", "insights", "results", "growth", "efficiency"];
  const lessWords = ["effort", "time", "work", "stress", "cost", "manual work", "overhead", "resources"];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect when scrolling is active to reduce animation complexity
  useEffect(() => {
    const unsubscribe = scrollY.on('change', () => {
      setIsScrolling(true);

      // Clear any existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Set a new timeout
      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, 300); // Wait 300ms after scroll stops
    });

    return () => {
      unsubscribe();
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [scrollY]);

  useEffect(() => {
    if (authDialogOpen && inputValue.trim()) {
      localStorage.setItem(PENDING_PROMPT_KEY, inputValue.trim());
    }
  }, [authDialogOpen, inputValue]);

  useEffect(() => {
    if (authDialogOpen && user && !isLoading) {
      setAuthDialogOpen(false);
      router.push('/dashboard');
    }
  }, [user, isLoading, authDialogOpen, router]);

  useEffect(() => {
    if (threadQuery.data && initiatedThreadId) {
      const thread = threadQuery.data;
      if (thread.project_id) {
        router.push(`/projects/${thread.project_id}/thread/${initiatedThreadId}`);
      } else {
        router.push(`/thread/${initiatedThreadId}`);
      }
      setInitiatedThreadId(null);
    }
  }, [threadQuery.data, initiatedThreadId, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsSubmitting(true);
    setAuthError(null);

    try {
      // If not authenticated, show auth dialog
      if (!user) {
        localStorage.setItem(PENDING_PROMPT_KEY, inputValue.trim());
        setAuthDialogOpen(true);
        return;
      }

      // If authenticated, proceed with agent creation
      const formData = new FormData();
      formData.append('prompt', inputValue.trim());
      formData.append('stream', 'true');
      
      const result = await initiateAgentMutation.mutateAsync(formData);

      if (result.thread_id) {
        setInitiatedThreadId(result.thread_id);
        setInputValue('');
        router.push(`/agents/${result.thread_id}`);
      } else {
        throw new Error('Failed to create agent');
      }
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      
      if (error?.name === 'BillingError') {
        handleBillingError(error as BillingError);
      } else {
        const errorMessage = error?.message || 'An unexpected error occurred';
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleSignIn = async (formData: FormData) => {
    setAuthError(null);
    
    try {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      
      if (!email || !password) {
        setAuthError('Please fill in all fields');
        return;
      }

      // Here you would implement the actual sign in logic
      // For now, we'll just show an error that this is not implemented
      setAuthError('Email/password sign in not implemented yet. Please use Google or Microsoft.');
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      setAuthError(error.message || 'Failed to sign in');
    }
  };

  // Check for pending prompt after auth
  useEffect(() => {
    if (user && !isLoading) {
      const pendingPrompt = localStorage.getItem(PENDING_PROMPT_KEY);
      if (pendingPrompt) {
        setInputValue(pendingPrompt);
        localStorage.removeItem(PENDING_PROMPT_KEY);
        setAuthDialogOpen(false);
      }
    }
  }, [user, isLoading]);

  return (
    <section id="hero" className="w-full relative overflow-hidden min-h-[100svh] flex items-center justify-center">
      <style jsx global>{`
        /* Clean input styling with proper theme support */
        #hero .hero-input-container input {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          -webkit-tap-highlight-color: transparent !important;
          color: hsl(var(--foreground)) !important;
        }
        
        #hero .hero-input-container input::placeholder {
          color: hsl(var(--muted-foreground)) !important;
          opacity: 0.7;
        }
        
        #hero .hero-input-container input:focus::placeholder {
          opacity: 0.4;
        }
      `}</style>
      {/* Lamp Container as Background */}
      <LampContainer className="absolute inset-0 -z-10">
        <div /> {/* Empty div to satisfy children requirement */}
      </LampContainer>

      <div className="relative flex flex-col items-center w-full px-6 z-20">
        {/* Center content */}
        <motion.div 
          className="relative z-30 max-w-4xl mx-auto h-full w-full flex flex-col gap-8 lg:gap-12 items-center justify-center py-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Badge with enhanced styling */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative z-40 -mt-8"
          >
            <Link
              href="#enterprise"
              className="group relative inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/20 backdrop-blur-sm px-4 py-2 text-sm transition-all duration-300 hover:border-border/70 hover:bg-background/30 hover:shadow-lg hover:shadow-primary/20"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <GradientText 
                  text={hero.badge}
                  gradient="linear-gradient(90deg, #3b82f6 0%, #a855f7 20%, #ec4899 50%, #a855f7 80%, #3b82f6 100%)"
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="font-medium text-xs tracking-wider uppercase group-hover:opacity-90 transition-opacity duration-300"
                />
              </div>
              <div className="inline-flex items-center justify-center size-4 rounded-full bg-primary/20 group-hover:bg-primary/30 transition-colors duration-300">
                <ArrowRight className="h-2.5 w-2.5 text-primary group-hover:translate-x-0.5 transition-transform duration-300" />
              </div>
            </Link>
          </motion.div>

          {/* Hero text with improved typography */}
          <motion.div 
            className="flex flex-col items-center justify-center gap-6 text-center relative z-40"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight text-balance leading-[1.1] bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent drop-shadow-lg">
              {hero.title}
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-center text-muted-foreground font-normal text-balance leading-relaxed max-w-2xl tracking-tight drop-shadow-md">
              Operator by OMNI – is a generalist{' '}
              <GradientText 
                text="AI Agent" 
                gradient="linear-gradient(90deg, #3b82f6 0%, #a855f7 20%, #ec4899 50%, #a855f7 80%, #3b82f6 100%)"
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />{' '}
              that works on your behalf.
            </p>
          </motion.div>

          {/* Enhanced input with modern styling */}
          <motion.div 
            className="flex items-center w-full max-w-2xl relative z-40"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <form 
              className="w-full relative group" 
              onSubmit={handleSubmit}
            >
              <div className="relative">
                {/* Enhanced glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-cyan-400/10 to-cyan-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-500 pointer-events-none"></div>
                
                {/* Input container with beautiful theme-aware design */}
                <div 
                  className="hero-input-container relative flex items-center rounded-full px-6 transition-all duration-300" 
                  style={{ 
                    background: 'hsl(var(--background) / 0.1)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(34, 211, 238, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34, 211, 238, 0.5)';
                    (e.currentTarget as HTMLElement).style.background = 'hsl(var(--background) / 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.querySelector('input:focus')) {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34, 211, 238, 0.3)';
                      (e.currentTarget as HTMLElement).style.background = 'hsl(var(--background) / 0.1)';
                    }
                  }}
                  onFocusCapture={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34, 211, 238, 0.7)';
                    (e.currentTarget as HTMLElement).style.background = 'hsl(var(--background) / 0.2)';
                  }}
                  onBlurCapture={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(34, 211, 238, 0.3)';
                    (e.currentTarget as HTMLElement).style.background = 'hsl(var(--background) / 0.1)';
                  }}
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hero.inputPlaceholder}
                    className="flex-1 h-16 lg:h-18 rounded-full px-2 bg-transparent text-base lg:text-lg text-foreground py-2 font-medium transition-all duration-200"
                    disabled={isSubmitting}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <motion.button
                    type="submit"
                    className={`rounded-full p-3 lg:p-4 transition-all duration-300 ${
                      inputValue.trim()
                        ? 'bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg hover:shadow-cyan-500/40 scale-100'
                        : 'bg-muted/40 text-muted-foreground scale-95'
                    }`}
                    disabled={!inputValue.trim() || isSubmitting}
                    aria-label="Submit"
                    whileHover={inputValue.trim() ? { scale: 1.05 } : {}}
                    whileTap={inputValue.trim() ? { scale: 0.95 } : {}}
                  >
                    {isSubmitting ? (
                      <div className="h-5 lg:h-6 w-5 lg:w-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="size-5 lg:size-6" />
                    )}
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Dynamic value proposition with FlipWords */}
          <motion.div 
            className="text-lg md:text-xl lg:text-2xl xl:text-3xl text-muted-foreground font-medium text-center max-w-4xl relative z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            {/* Mobile: Stacked layout */}
            <div className="flex flex-col gap-3 sm:hidden">
              <div className="flex items-center justify-center gap-2">
                <span className="drop-shadow-md">80% more</span>
                <FlipWords 
                  words={moreWords} 
                  duration={3000}
                  className="text-primary font-bold text-lg drop-shadow-lg"
                />
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="drop-shadow-md">with 20% the</span>
                <FlipWords 
                  words={lessWords} 
                  duration={4500}
                  className="text-primary font-bold text-lg drop-shadow-lg"
                />
              </div>
            </div>

            {/* Desktop: Inline layout */}
            <div className="hidden sm:flex items-center justify-center flex-wrap gap-2">
              <span className="drop-shadow-md">80% more</span>
              <FlipWords 
                words={moreWords} 
                duration={3000}
                className="text-primary font-bold drop-shadow-lg"
              />
              <span className="drop-shadow-md">with 20% the</span>
              <FlipWords 
                words={lessWords} 
                duration={4500}
                className="text-primary font-bold drop-shadow-lg"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Video section with better spacing */}
      <motion.div 
        className="w-full max-w-6xl mx-auto px-6 pb-10 relative z-30"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <HeroVideoSection />
      </motion.div>

      {/* Auth Dialog with enhanced styling */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <BlurredDialogOverlay />
        <DialogContent className="sm:max-w-md rounded-2xl bg-background/95 dark:bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl">
          <DialogHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                Sign in to continue
              </DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-base">
              Sign in or create an account to start using Operator
            </DialogDescription>
          </DialogHeader>

          {/* Auth error message */}
          {authError && (
            <div className="mb-4 p-4 rounded-xl flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{authError}</span>
            </div>
          )}

          {/* Social Sign In Options */}
          <div className="w-full space-y-3">
            <GoogleSignIn returnUrl="/dashboard" />
            <MicrosoftSignIn returnUrl="/dashboard" />
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground font-medium">
                or continue with email
              </span>
            </div>
          </div>

          {/* Sign in form with enhanced styling */}
          <form className="space-y-4">
            <div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-secondary/50 transition-colors"
                required
              />
            </div>

            <div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-secondary/50 transition-colors"
                required
              />
            </div>

            <div className="space-y-4 pt-4">
              <SubmitButton
                formAction={handleSignIn}
                className="w-full h-12 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all shadow-lg hover:shadow-secondary/25"
                pendingText="Signing in..."
              >
                Sign in
              </SubmitButton>

              <Link
                href={`/auth?mode=signup&returnUrl=${encodeURIComponent('/dashboard')}`}
                className="flex h-12 items-center justify-center w-full text-center rounded-xl border border-border/50 bg-background/50 hover:bg-secondary/5 hover:border-secondary/30 transition-all"
                onClick={() => setAuthDialogOpen(false)}
              >
                Create new account
              </Link>
            </div>

            <div className="text-center pt-4">
              <Link
                href={`/auth?returnUrl=${encodeURIComponent('/dashboard')}`}
                className="text-sm text-secondary hover:text-secondary/80 font-medium transition-colors"
                onClick={() => setAuthDialogOpen(false)}
              >
                More sign in options
              </Link>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground/80">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-secondary hover:text-secondary/80 font-medium">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-secondary hover:text-secondary/80 font-medium">
              Privacy Policy
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Billing Error Alert here */}
      <BillingErrorAlert
        message={billingError?.message}
        currentUsage={billingError?.currentUsage}
        limit={billingError?.limit}
        accountId={personalAccount?.account_id}
        onDismiss={clearBillingError}
        isOpen={!!billingError}
      />
    </section>
  );
}
