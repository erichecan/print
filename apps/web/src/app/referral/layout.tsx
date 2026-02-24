/**
 * Referral 模块布局
 * 阶梯裂变推广 MVP - 独立流程，无主站 header/footer
 * 2025-02-20 创建 | 2026-02-20 23:04:53 注释
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
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <Link href="/referral" className="text-indigo-600 font-semibold hover:text-indigo-700">
            推广中心
          </Link>
          <nav className="flex gap-4">
            <Link href="/referral" className="text-slate-600 hover:text-indigo-600">
              活动页
            </Link>
            <Link href="/referral/dashboard" className="text-slate-600 hover:text-indigo-600">
              控制台
            </Link>
            <Link href="/referral/share" className="text-slate-600 hover:text-indigo-600">
              分享
            </Link>
            <Link href="/referral/wallet" className="text-slate-600 hover:text-indigo-600">
              钱包
            </Link>
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </ReferralProvider>
  );
}
