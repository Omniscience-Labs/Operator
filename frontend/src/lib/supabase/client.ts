import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  // Get URL and key from environment variables
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      url: supabaseUrl ? 'set' : 'missing',
      key: supabaseAnonKey ? 'set' : 'missing'
    });
    
    // Return a mock client for development or throw error
    if (process.env.NODE_ENV === 'development') {
      console.warn('Running in development mode without Supabase. Some features may not work.');
      // You could return a mock client here if needed
    }
    
    throw new Error('Supabase environment variables are not configured. Please check your Doppler/Vercel setup.');
  }

  // Ensure the URL is in the proper format with http/https protocol
  if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    // If it's just a hostname without protocol, add http://
    supabaseUrl = `http://${supabaseUrl}`;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
