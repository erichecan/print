/**
 * Mobile Rewards View Component
 * 移动端奖励与积分视图
 */
'use client';

export function MobileRewardsView() {
    return (
        <div className="mobile-view">
            <header className="mobile-view__header">
                <h1>Rewards & Points</h1>
                <p>View your credits and special offers</p>
            </header>

            <div className="mobile-rewards-content">
                <div className="mobile-rewards-card">
                    <div className="card-icon">🎁</div>
                    <h3>Coming Soon</h3>
                    <p>We are working hard to bring you a new rewards experience.</p>
                </div>

                <div className="mobile-rewards-info">
                    <p>You will soon be able to:</p>
                    <ul>
                        <li>Check your point balance</li>
                        <li>Redeem points for discounts</li>
                        <li>View your reward history</li>
                        <li>Manage referral bonuses</li>
                    </ul>
                </div>
            </div>

            <style jsx>{`
        .mobile-view { display: flex; flex-direction: column; gap: 20px; }
        .mobile-view__header h1 { font-size: 20px; font-weight: 700; margin: 0; }
        .mobile-view__header p { font-size: 14px; color: #6b7280; margin: 4px 0 0; }
        
        .mobile-rewards-content { display: flex; flex-direction: column; gap: 16px; }
        
        .mobile-rewards-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px 20px; text-align: center; }
        .card-icon { font-size: 40px; margin-bottom: 12px; }
        .mobile-rewards-card h3 { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
        .mobile-rewards-card p { font-size: 14px; color: #6b7280; margin: 0; }
        
        .mobile-rewards-info { background: #f9fafb; border-radius: 12px; padding: 20px; }
        .mobile-rewards-info p { font-size: 15px; font-weight: 600; margin: 0 0 12px; }
        .mobile-rewards-info ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
        .mobile-rewards-info li { font-size: 14px; color: #4b5563; }
      `}</style>
        </div>
    );
}
