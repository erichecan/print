/**
 * Referral 模块布局 - Swiss Clean 风格
 * 白底、红强调 #E42313、近黑主文字、无圆角、留白充足
 * 2025-02-20 创建 | 2026-03-02 落实 Pencil 设计
 */
import { ReferralProvider } from '@/contexts/ReferralContext';
import Link from 'next/link';

export default function ReferralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReferralProvider>
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-[#E8E8E8] px-4 py-3 flex items-center justify-between">
          <Link href="/referral" className="text-[#E42313] font-semibold hover:text-[#c51f11]">
            推广中心
          </Link>
          <nav className="flex gap-4">
            <Link href="/referral" className="text-[#7A7A7A] hover:text-[#E42313]">
              活动页
            </Link>
            <Link href="/referral/dashboard" className="text-[#7A7A7A] hover:text-[#E42313]">
              控制台
            </Link>
            <Link href="/referral/share" className="text-[#7A7A7A] hover:text-[#E42313]">
              分享
            </Link>
            <Link href="/referral/wallet" className="text-[#7A7A7A] hover:text-[#E42313]">
              钱包
            </Link>
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </ReferralProvider>
  );
}
