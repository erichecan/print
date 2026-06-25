# UI REVIEW — Referral Module

**Audited:** 2026-06-03  
**Module:** `/src/app/referral/`  
**Overall Score: 13/24**

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Visual Hierarchy | 3/4 | Hero/tier cards communicate priority well; EarningsCard balance lacks emphasis vs. surrounding copy |
| 2. Consistency | 2/4 | CTA `rounded-xl` vs `rounded-2xl` across pages; `generateInviteCode` copy-pasted 3x |
| 3. Mobile UX | 2/4 | Back button 32x32px (below 44px min); platform tabs ~28px; `safe-bottom` class undefined |
| 4. Component Quality | 2/4 | FriendStatusList/RewardsList no loading skeleton; `pending = 0` hardcoded; code duplicated |
| 5. Accessibility | 1/4 | #07C160 on white = 2.26:1 (fails WCAG AA); #F5A623 on #FFF9E6 = 1.86:1; no aria-label on back button |
| 6. Brand Alignment | 3/4 | WeChat green reads cohesive; EarnModal/ProgressBar/SocialPosterTabs still use legacy #E42313 |

---

## Top 3 Critical Fixes (Blockers)

### BLOCKER 1 — #07C160 text on white fails WCAG AA (2.26:1)
Used in 12+ places as text color on white/near-white. Switch to `#04954A` (4.6:1) for all text instances.  
Keep `#07C160` only as background color with white text on top.  
Worst offender: `#F5A623 on #FFF9E6` (1.86:1) — "待邀请" badge is nearly invisible.

Files: `FriendStatusList.tsx:27`, `RewardsList.tsx:24`, `MilestoneBar.tsx:69`, `page.tsx:104`, `InviteCodeCard.tsx:72`

### BLOCKER 2 — Back button touch target 32x32px (below 44px minimum)
`me/page.tsx:112` — `w-8 h-8`. Fix: change to `w-11 h-11` + `aria-label="返回"`.

### BLOCKER 3 — `safe-bottom` / `pt-safe-top` are undefined Tailwind classes
`BottomTabBar.tsx:24` and `me/page.tsx:107`. Tab bar overlaps iPhone home indicator (34px).  
Fix: use `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` inline.

---

## Top 5 Warnings

1. `generateInviteCode` duplicated in `me/page.tsx`, `InviteCodeCard.tsx`, `ShareTextCard.tsx` → extract to `lib/inviteCode.ts`
2. CTA button radius inconsistency: `rounded-xl` (page.tsx, invite) vs `rounded-2xl` (me/page) → unify to `rounded-2xl`
3. `FriendStatusList` and `RewardsList` have no loading skeleton → add pulse skeleton on `loading === true`
4. Auth loading gap: during `authLoading=true`, `me/page.tsx` renders with `user=null` showing `PNG----` → add early skeleton return
5. Legacy `#E42313` bleeds into green campaign: `EarnModal.tsx`, `ProgressBar.tsx`, `SocialPosterTabs.tsx` still use red CTAs/fills inside the referral module
