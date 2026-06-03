export function generateInviteCode(userId: string): string {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const base = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PNG';
  let seed = hash;
  for (let i = 0; i < 4; i++) {
    code += base[seed % base.length];
    seed = Math.floor(seed / base.length) + (seed % 7) * 31 + 17;
  }
  return code;
}
