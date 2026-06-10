import { ReferralProvider } from '@/contexts/ReferralContext';

export default function ReferralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReferralProvider>
      <div className="min-h-screen bg-[#0D0D0D]">
        {children}
      </div>
    </ReferralProvider>
  );
}
