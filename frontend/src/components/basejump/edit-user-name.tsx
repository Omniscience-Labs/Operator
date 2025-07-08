'use client';

import { Input } from '@/components/ui/input';
import { Label } from '../ui/label';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Props = {
  currentName: string;
  onUpdate?: () => void;
};

export default function EditUserName({ currentName, onUpdate }: Props) {
  const [name, setName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);

  // Sync local state when currentName prop changes
  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { name: trimmedName },
      });

      if (error) {
        toast.error('Failed to update name: ' + error.message);
        return;
      }

      toast.success('Name updated successfully!');
      onUpdate?.(); // Trigger parent component refresh
    } catch (error) {
      toast.error('Failed to update name');
      console.error('Error updating name:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in space-y-4">
      <div className="flex flex-col gap-y-2">
        <Label
          htmlFor="name"
          className="text-sm font-medium text-foreground/90"
        >
          Your Name
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          name="name"
          id="name"
          placeholder="Enter your name"
          required
          className="h-10"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Updating...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
