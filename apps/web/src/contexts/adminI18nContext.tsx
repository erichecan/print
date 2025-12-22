'use client';

/**
 * Admin I18n Context
 * [2025-11-16 14:25:00] Provide locale state, translation helper, and DOM sync for data-i18n attributes
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ADMIN_TRANSLATIONS, AdminLocale } from '@/translations/admin';

type TranslationParams = Record<string, string | number>;

interface AdminI18nContextValue {
  locale: AdminLocale;
  setLocale: (locale: AdminLocale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const DEFAULT_LOCALE: AdminLocale = 'en';
const STORAGE_KEY = 'adminLocale';

const AdminI18nContext = createContext<AdminI18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key: string) => key,
});

const formatTemplate = (value: string, params?: TranslationParams) => {
  if (!params) {
    return value;
  }
  return value.replace(/\{(\w+)\}/g, (_, token) => {
    if (Object.prototype.hasOwnProperty.call(params, token)) {
      return String(params[token]);
    }
    return '';
  });
};

const collectElements = (root: ParentNode) => {
  const elements: Element[] = [];
  if (root instanceof Element) {
    elements.push(root);
  }
  root.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]').forEach((element) => {
    elements.push(element);
  });
  return elements;
};

export function AdminI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') {
      setLocaleState(stored);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const dictionary = ADMIN_TRANSLATIONS[locale] || ADMIN_TRANSLATIONS.en;
      const fallback = ADMIN_TRANSLATIONS.en;
      const template = dictionary[key] ?? fallback[key] ?? key;
      return formatTemplate(template, params);
    },
    [locale]
  );

  const setLocale = useCallback((nextLocale: AdminLocale) => {
    setLocaleState(nextLocale);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    }
  }, []);

  const applyTranslations = useCallback(
    (root?: ParentNode | null) => {
      if (typeof document === 'undefined') {
        return;
      }
      const scope = root ?? document.body;
      if (!scope) {
        return;
      }
      const elements = collectElements(scope);
      elements.forEach((element) => {
        if (element.hasAttribute('data-i18n')) {
          const key = element.getAttribute('data-i18n');
          if (key) {
            const translation = t(key);
            // [2025-12-21] Fix: Prevent infinite loops and child destruction
            // Only update if text is different AND element has no element children (to protect icons/react nodes)
            // Or if it's a simple text-only element that React expects to be text
            if (element.textContent !== translation && element.children.length === 0) {
              element.textContent = translation;
            }
          }
        }
        if (element.hasAttribute('data-i18n-placeholder')) {
          const key = element.getAttribute('data-i18n-placeholder');
          if (key && 'placeholder' in element) {
            (element as HTMLInputElement | HTMLTextAreaElement).placeholder = t(key);
          }
        }
        if (element.hasAttribute('data-i18n-title')) {
          const key = element.getAttribute('data-i18n-title');
          if (key) {
            element.setAttribute('title', t(key));
          }
        }
        if (element.hasAttribute('data-i18n-aria-label')) {
          const key = element.getAttribute('data-i18n-aria-label');
          if (key) {
            element.setAttribute('aria-label', t(key));
          }
        }
      });
    },
    [t]
  );

  useEffect(() => {
    applyTranslations();
  }, [applyTranslations]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element || node instanceof DocumentFragment) {
            applyTranslations(node as ParentNode);
          }
        });
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          applyTranslations(mutation.target);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-i18n', 'data-i18n-placeholder', 'data-i18n-title', 'data-i18n-aria-label'],
    });

    return () => observer.disconnect();
  }, [applyTranslations]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
}

export const useAdminI18n = () => useContext(AdminI18nContext);


