import { Metadata } from 'next';
import { MarketplaceGuard } from './marketplace-guard';

export const metadata: Metadata = {
  title: 'Agent Marketplace | Operator by OMNI',
  description: 'Browse and share agents on the Operator marketplace',
  openGraph: {
    title: 'Agent Marketplace | Operator by OMNI',
    description: 'Discover and add powerful AI agents created by the community to your personal library',
    type: 'website',
  },
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketplaceGuard>
      {children}
    </MarketplaceGuard>
  );
}
