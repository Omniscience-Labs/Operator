'use client';
import { HeroVideoSection } from '@/components/home/sections/hero-video-section';
import { siteConfig } from '@/lib/home';
import { ArrowRight, Github, X, AlertCircle, Sparkles } from 'lucide-react';
import { FlickeringGrid } from '@/components/home/ui/flickering-grid';
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

  const createAgentWithPrompt = async () => {
    if (!inputValue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('prompt', inputValue.trim());
      formData.append('model_name', 'Omni 4'); 
      formData.append('enable_thinking', 'false');
      formData.append('reasoning_effort', 'low');
      formData.append('stream', 'true');
      formData.append('enable_context_manager', 'false');

      const result = await initiateAgentMutation.mutateAsync(formData);

      setInitiatedThreadId(result.thread_id);
      setInputValue('');
    } catch (error: any) {
      if (error instanceof BillingError) {
        console.log('Billing error:');
      } else {
        const isConnectionError =
          error instanceof TypeError &&
          error.message.includes('Failed to fetch');
        if (!isLocalMode() || isConnectionError) {
          toast.error(
            error.message || 'Failed to create agent. Please try again.',
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Stop event propagation to prevent dialog closing
    }

    if (!inputValue.trim() || isSubmitting) return;

    // If user is not logged in, save prompt and show auth dialog
    if (!user && !isLoading) {
      // Save prompt to localStorage BEFORE showing the dialog
      localStorage.setItem(PENDING_PROMPT_KEY, inputValue.trim());
      setAuthDialogOpen(true);
      return;
    }

    // User is logged in, create the agent
    createAgentWithPrompt();
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default form submission
      e.stopPropagation(); // Stop event propagation
      handleSubmit();
    }
  };

  // Handle auth form submission
  const handleSignIn = async (prevState: any, formData: FormData) => {
    setAuthError(null);
    try {
      // Implement sign in logic here
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      // Add the returnUrl to the form data for proper redirection
      formData.append('returnUrl', '/dashboard');

      // Call your authentication function here

      // Return any error state
      return { message: 'Invalid credentials' };
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError(
        error instanceof Error ? error.message : 'An error occurred',
      );
      return { message: 'An error occurred during sign in' };
    }
  };

  return (
    <section id="hero" className="w-full relative overflow-hidden min-h-[100svh] flex items-center justify-center">
      <div className="relative flex flex-col items-center w-full px-6">
        {/* Left side flickering grid with gradient fades - more subtle */}
        <div className="absolute left-0 top-0 h-[100svh] w-1/3 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/60 to-background z-10" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background via-background/90 to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/90 to-transparent z-10" />

          <FlickeringGrid
            className="h-full w-full"
            squareSize={mounted && tablet ? 1.5 : 2}
            gridGap={mounted && tablet ? 1.5 : 2}
            color="var(--secondary)"
            maxOpacity={0.15}
            flickerChance={isScrolling ? 0.005 : 0.02}
          />
        </div>

        {/* Right side flickering grid with gradient fades - more subtle */}
        <div className="absolute right-0 top-0 h-[100svh] w-1/3 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-background/60 to-background z-10" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background via-background/90 to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/90 to-transparent z-10" />

          <FlickeringGrid
            className="h-full w-full"
            squareSize={mounted && tablet ? 1.5 : 2}
            gridGap={mounted && tablet ? 1.5 : 2}
            color="var(--secondary)"
            maxOpacity={0.15}
            flickerChance={isScrolling ? 0.005 : 0.02}
          />
        </div>

        {/* Center content */}
        <motion.div 
          className="relative z-10 max-w-4xl mx-auto h-full w-full flex flex-col gap-12 lg:gap-16 items-center justify-center py-32"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Badge with enhanced styling */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Link
              href="#enterprise"
              className="group relative inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/80 backdrop-blur-sm px-4 py-2 text-sm transition-all duration-300 hover:border-secondary/40 hover:bg-secondary/5 hover:shadow-lg hover:shadow-secondary/10"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                <span className="font-medium text-muted-foreground text-xs tracking-wider uppercase group-hover:text-primary transition-colors duration-300">
                  {hero.badge}
                </span>
              </div>
              <div className="inline-flex items-center justify-center size-4 rounded-full bg-secondary/10 group-hover:bg-secondary/20 transition-colors duration-300">
                <ArrowRight className="h-2.5 w-2.5 text-secondary group-hover:translate-x-0.5 transition-transform duration-300" />
              </div>
            </Link>
          </motion.div>

          {/* Hero text with improved typography */}
          <motion.div 
            className="flex flex-col items-center justify-center gap-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight text-balance leading-[1.1] text-foreground">
              {hero.title}
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-center text-muted-foreground font-normal text-balance leading-relaxed max-w-2xl tracking-tight">
              {hero.description}
            </p>
          </motion.div>

          {/* Enhanced input with modern styling */}
          <motion.div 
            className="flex items-center w-full max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <form className="w-full relative group" onSubmit={handleSubmit}>
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-secondary/20 via-secondary/10 to-secondary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-500"></div>
                
                {/* Input container */}
                <div className="relative flex items-center rounded-full border border-border/50 bg-background/90 backdrop-blur-md px-6 shadow-xl transition-all duration-300 hover:border-secondary/30 focus-within:border-secondary/50 focus-within:shadow-2xl focus-within:shadow-secondary/10">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hero.inputPlaceholder}
                    className="flex-1 h-16 lg:h-18 rounded-full px-2 bg-transparent focus:outline-none text-base lg:text-lg placeholder:text-muted-foreground/60 py-2"
                    disabled={isSubmitting}
                  />
                  <motion.button
                    type="submit"
                    className={`rounded-full p-3 lg:p-4 transition-all duration-300 ${
                      inputValue.trim()
                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-secondary/25 scale-100'
                        : 'bg-muted/50 text-muted-foreground scale-95'
                    }`}
                    disabled={!inputValue.trim() || isSubmitting}
                    aria-label="Submit"
                    whileHover={inputValue.trim() ? { scale: 1.05 } : {}}
                    whileTap={inputValue.trim() ? { scale: 0.95 } : {}}
                  >
                    {isSubmitting ? (
                      <div className="h-5 lg:h-6 w-5 lg:w-6 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="size-5 lg:size-6" />
                    )}
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Subtle hint text */}
          <motion.p 
            className="text-sm text-muted-foreground/60 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            Try asking: "Help me analyze my team's productivity metrics"
          </motion.p>
        </motion.div>
      </div>

      {/* Video section with better spacing */}
      <motion.div 
        className="w-full max-w-6xl mx-auto px-6 pb-20"
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
