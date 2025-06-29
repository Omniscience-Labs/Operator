'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { BillingModal } from '@/components/billing/billing-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';
import { CreditCard, User, Settings, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAccounts } from '@/hooks/use-accounts';
import { editPersonalAccountName } from '@/lib/actions/personal-account';

type SelectedAccount = NonNullable<ReturnType<typeof useAccounts>['data']>[0];

interface PersonalizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: SelectedAccount;
}

export function PersonalizationModal({
  open,
  onOpenChange,
  account,
}: PersonalizationModalProps) {
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary rounded-2xl shadow-custom">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium text-foreground">
              Personalization Settings
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Manage your personal profile information, preferences, and billing.
            </p>
          </DialogHeader>

          <Tabs defaultValue="profile" className="mt-6">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Billing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Profile Information
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Update your display name that appears throughout the application.
                </p>
                <Separator className="mb-6" />
                <form className="animate-in">
                  <input type="hidden" name="accountId" value={account.account_id} />
                  <div className="flex flex-col gap-y-4">
                    <div className="flex flex-col gap-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-medium text-foreground/90"
                      >
                        Name
                      </Label>
                      <Input
                        defaultValue={account.name}
                        name="name"
                        id="name"
                        placeholder="Enter your name"
                        required
                        className="h-10 rounded-lg border-subtle dark:border-white/10 bg-white dark:bg-background-secondary text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <SubmitButton
                        formAction={editPersonalAccountName}
                        pendingText="Updating..."
                        className="rounded-lg bg-primary hover:bg-primary/90 text-white h-10"
                      >
                        Save Changes
                      </SubmitButton>
                    </div>
                  </div>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  App Preferences
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Customize your application experience.
                </p>
                <Separator className="mb-6" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Palette className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">Theme</p>
                        <p className="text-sm text-muted-foreground">
                          Choose your preferred color scheme
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                      className="capitalize"
                    >
                      {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Billing & Subscription
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage your subscription and billing information.
                </p>
                <Separator className="mb-6" />
                
                <Button
                  onClick={() => setBillingModalOpen(true)}
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Open Billing Dashboard
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <BillingModal
        open={billingModalOpen}
        onOpenChange={setBillingModalOpen}
        returnUrl={typeof window !== 'undefined' ? window.location.href : '/'}
      />
    </>
  );
}