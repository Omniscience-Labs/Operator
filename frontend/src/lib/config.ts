// Environment mode types
export enum EnvMode {
  LOCAL = 'local',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

// Subscription tier structure
export interface SubscriptionTierData {
  priceId: string;
  name: string;
}

// Subscription tiers structure
export interface SubscriptionTiers {
  FREE: SubscriptionTierData;
  TIER_2_40: SubscriptionTierData;
  TIER_6_100: SubscriptionTierData;
  TIER_12_200: SubscriptionTierData;
  TIER_25_400: SubscriptionTierData;
  TIER_50_800: SubscriptionTierData;
  TIER_125_1600: SubscriptionTierData;
  TIER_200_2000: SubscriptionTierData;
}

// Configuration object
interface Config {
  ENV_MODE: EnvMode;
  IS_LOCAL: boolean;
  SUBSCRIPTION_TIERS: SubscriptionTiers;
}

// Production tier IDs
const PROD_TIERS: SubscriptionTiers = {
  FREE: {
    priceId: 'price_1RegArRGnNhiCsluGAhYK7dx',
    name: 'Free',
  },
  TIER_2_40: {
    priceId: 'price_1RegOhRGnNhiCslubFHARKST',
    name: '2h/$40',
  },
  TIER_6_100: {
    priceId: 'price_1RegOzRGnNhiCsluQOiybjzk',
    name: '6h/$100',
  },
  TIER_12_200: {
    priceId: 'price_1RILb4G6l1KZGqIr5Y20ZLHm',
    name: '12h/$200',
  },
  TIER_25_400: {
    priceId: 'price_1RegPLRGnNhiCsluDOrzGyto',
    name: '25h/$400',
  },
  TIER_50_800: {
    priceId: 'price_1RegPaRGnNhiCsluLNbiTfuH',
    name: '50h/$800',
  },
  TIER_125_1600: {
    priceId: 'price_1RegPtRGnNhiCsluGHQEnQ6l',
    name: '125h/$1600',
  },
  TIER_200_2000: {
    priceId: 'price_1RegQDRGnNhiCsluNOytv8Aj',
    name: '200h/$2000',
  },
} as const;

// Staging tier IDs
const STAGING_TIERS: SubscriptionTiers = {
  FREE: {
    priceId: 'price_1RegYKRGnNhiCsluWeXW1YVr',
    name: 'Free',
  },
  TIER_2_40: {
    priceId: 'price_1RegYKRGnNhiCslum8Rq2tb3',
    name: '2h/$40',
  },
  TIER_6_100: {
    priceId: 'price_1RegYKRGnNhiCslurElDw2Sk',
    name: '6h/$100',
  },
  TIER_12_200: {
    priceId: 'price_1RegYKRGnNhiCslut8FSYWI8',
    name: '12h/$200',
  },
  TIER_25_400: {
    priceId: 'price_1RegYKRGnNhiCsluG0cHtAGA',
    name: '25h/$400',
  },
  TIER_50_800: {
    priceId: 'price_1RegYKRGnNhiCslu7ZDEFcMd',
    name: '50h/$800',
  },
  TIER_125_1600: {
    priceId: 'price_1RegYKRGnNhiCsluyYL6yg2H',
    name: '125h/$1600',
  },
  TIER_200_2000: {
    priceId: 'price_1RegYKRGnNhiCslu4peMXqGv',
    name: '200h/$2000',
  },
} as const;

// Determine the environment mode from environment variables
const getEnvironmentMode = (): EnvMode => {
  // Get the environment mode from the environment variable, if set
  const envMode = process.env.NEXT_PUBLIC_ENV_MODE?.toLowerCase();

  // First check if the environment variable is explicitly set
  if (envMode) {
    if (envMode === EnvMode.LOCAL) {
      console.log('Using explicitly set LOCAL environment mode');
      return EnvMode.LOCAL;
    } else if (envMode === EnvMode.STAGING) {
      console.log('Using explicitly set STAGING environment mode');
      return EnvMode.STAGING;
    } else if (envMode === EnvMode.PRODUCTION) {
      console.log('Using explicitly set PRODUCTION environment mode');
      return EnvMode.PRODUCTION;
    }
  }

  // If no valid environment mode is set, fall back to defaults based on NODE_ENV
  if (process.env.NODE_ENV === 'development') {
    console.log('Defaulting to LOCAL environment mode in development');
    return EnvMode.LOCAL;
  } else {
    console.log('Defaulting to PRODUCTION environment mode');
    return EnvMode.PRODUCTION;
  }
};

// Get the environment mode once to ensure consistency
const currentEnvMode = getEnvironmentMode();

// Create the config object
export const config: Config = {
  ENV_MODE: currentEnvMode,
  IS_LOCAL: currentEnvMode === EnvMode.LOCAL,
  SUBSCRIPTION_TIERS:
    currentEnvMode === EnvMode.STAGING ? STAGING_TIERS : PROD_TIERS,
};

// Helper function to check if we're in local mode (for component conditionals)
export const isLocalMode = (): boolean => {
  return config.IS_LOCAL;
};

// Export subscription tier type for typing elsewhere
export type SubscriptionTier = keyof typeof PROD_TIERS;
