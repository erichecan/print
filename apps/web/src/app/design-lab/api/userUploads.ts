const getApiBase = () => {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? '/api';
};

const authHeader = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface RecentUpload {
  id: string;
  url: string;
  createdAt: string;
}

export async function getRecentUploads(): Promise<RecentUpload[]> {
  try {
    const res = await fetch(`${getApiBase()}/user-uploads/recent`, {
      credentials: 'include',
      headers: authHeader(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.uploads ?? [];
  } catch {
    return [];
  }
}

export async function saveUpload(imageBlob: Blob): Promise<RecentUpload | null> {
  try {
    const form = new FormData();
    form.append('image', imageBlob, 'upload.png');

    const res = await fetch(`${getApiBase()}/user-uploads/save`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeader(),
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { id: data.id, url: data.url, createdAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
