'use client';

interface TawkChatButtonProps {
  className?: string;
  children: React.ReactNode;
}

export function TawkChatButton({ className, children }: TawkChatButtonProps) {
  function handleClick() {
    if (typeof window !== 'undefined' && (window as any).Tawk_API) {
      (window as any).Tawk_API.maximize();
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {children}
    </button>
  );
}
