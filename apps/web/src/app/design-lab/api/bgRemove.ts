const getApiBase = () => {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? '/api';
};

const authHeader = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface BgRemoveUsage {
  used: number;
  limit: number;
  remaining: number;
  isGuest: boolean;
}

export interface BgRemovedImage {
  id: string;
  resultUrl: string;
  createdAt: string;
}

export async function getBgRemoveUsage(): Promise<BgRemoveUsage> {
  const res = await fetch(`${getApiBase()}/bg-remove/usage`, {
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch usage');
  return res.json();
}

export async function getBgRemoveResults(): Promise<BgRemovedImage[]> {
  const res = await fetch(`${getApiBase()}/bg-remove/results`, {
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

export async function removeBackground(
  imageBlob: Blob
): Promise<{ ok: true; url: string } | { ok: false; error: string; requiresSignup?: boolean }> {
  const form = new FormData();
  form.append('image', imageBlob, 'image.png');

  const res = await fetch(`${getApiBase()}/bg-remove`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeader(),
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error ?? 'Unknown error', requiresSignup: data.requiresSignup };
  }
  return { ok: true, url: data.url };
}
