import { ReferralProvider } from '@/contexts/ReferralContext';

export default function ReferralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReferralProvider>
      <div className="min-h-screen bg-[#F5F5F5]">
        {children}
      </div>
    </ReferralProvider>
  );
}
