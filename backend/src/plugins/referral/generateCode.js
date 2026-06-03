// Deterministic invite code generator — must stay in sync with apps/web/src/app/referral/lib/inviteCode.ts
const BASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(userId) {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let code = 'PNG';
  let seed = hash;
  for (let i = 0; i < 4; i++) {
    code += BASE[seed % BASE.length];
    seed = Math.floor(seed / BASE.length) + (seed % 7) * 31 + 17;
  }
  return code;
}

module.exports = { generateInviteCode };
