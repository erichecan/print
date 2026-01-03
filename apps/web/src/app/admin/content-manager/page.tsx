/**
 * Content Manager Page
* Complete CMS content management interface
* Added internationalization support
 */
'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { adminContentApi, ContentConfig, HomePageContent, AboutPageContent, HelpPageContent, StaticTexts, FooterConfig } from '@/lib/api';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useAdminI18n } from '@/contexts/adminI18nContext';

export default function ContentManagerPage() {
  const { t, locale } = useAdminI18n(); // 使用国际化
  const { data, isLoading, error, mutate } = useSWR('admin-content-config', adminContentApi.get);
  const [content, setContent] = useState<ContentConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'homepage' | 'about' | 'help' | 'static' | 'footer'>('homepage');

  useEffect(() => {
    if (data?.data) {
      setContent(data.data);
    }
  }, [data]);

  // 确保内容对象有所有必需的字段
  const ensureContentStructure = (content: ContentConfig): ContentConfig => {
    return {
      ...content,
      homePage: content.homePage || {
        heroTitle: '',
        heroSubtitle: '',
        heroCards: [],
        servicePromises: [],
        testimonials: [],
        enterprisePanels: [],
        brandLogos: [],
      },
      aboutPage: content.aboutPage || {
        headerTitle: '',
        headerDescription: '',
        milestones: [],
        values: [],
        teamTitle: '',
        teamDescription: '',
      },
      helpPage: content.helpPage || {
        quickLinks: [],
        faqCategories: [],
      },
      staticTexts: content.staticTexts || {
        topMessageBar: '',
      },
      footer: content.footer || {
        socialLinks: [],
        contactInfo: {
          phone: '',
          email: '',
          hours: {
            weekday: '',
            saturday: '',
            sunday: '',
          },
          holidayNotice: '',
        },
        columns: [],
        copyrightText: '',
        bottomLinks: [],
      },
    };
  };

  const handleSave = async () => {
    if (!content) return;
    try {
      setSaving(true);
      const contentToSave = ensureContentStructure(content);
      await adminContentApi.update(contentToSave);
      mutate();
      alert(t('saveAllChanges') + ' ' + (locale === 'zh' ? '成功！' : 'Success!'));
    } catch (apiError) {
      alert((apiError as Error).message || (locale === 'zh' ? '保存失败' : 'Failed to save content'));
    } finally {
      setSaving(false);
    }
  };

  // Footer 管理函数
  const updateFooter = (field: keyof FooterConfig, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        footer: {
          ...(prev.footer || {} as FooterConfig),
          [field]: value,
        } as FooterConfig,
      };
    });
  };

  const addFooterSocialLink = () => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          socialLinks: [...(footer.socialLinks || []), { id: `social-${Date.now()}`, platform: '', url: '', icon: '' }],
        },
      };
    });
  };

  const updateFooterSocialLink = (id: string, field: string, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          socialLinks: (footer.socialLinks || []).map((link) => (link.id === id ? { ...link, [field]: value } : link)),
        },
      };
    });
  };

  const removeFooterSocialLink = (id: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          socialLinks: (footer.socialLinks || []).filter((link) => link.id !== id),
        },
      };
    });
  };

  const addFooterColumn = () => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          columns: [...(footer.columns || []), { id: `footer-col-${Date.now()}`, title: '', links: [] }],
        },
      };
    });
  };

  const updateFooterColumn = (id: string, field: string, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          columns: (footer.columns || []).map((col) => (col.id === id ? { ...col, [field]: value } : col)),
        },
      };
    });
  };

  const addFooterLink = (columnId: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          columns: (footer.columns || []).map((col) =>
            col.id === columnId
              ? { ...col, links: [...col.links, { id: `footer-link-${Date.now()}`, label: '', href: '' }] }
              : col
          ),
        },
      };
    });
  };

  const updateFooterLink = (columnId: string, linkId: string, field: string, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          columns: (footer.columns || []).map((col) =>
            col.id === columnId
              ? {
                ...col,
                links: col.links.map((link) => (link.id === linkId ? { ...link, [field]: value } : link)),
              }
              : col
          ),
        },
      };
    });
  };

  const removeFooterLink = (columnId: string, linkId: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          columns: (footer.columns || []).map((col) =>
            col.id === columnId ? { ...col, links: col.links.filter((link) => link.id !== linkId) } : col
          ),
        },
      };
    });
  };

  const removeFooterColumn = (id: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          columns: (footer.columns || []).filter((col) => col.id !== id),
        },
      };
    });
  };

  const addFooterBottomLink = () => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          bottomLinks: [...(footer.bottomLinks || []), { id: `bottom-link-${Date.now()}`, label: '', href: '' }],
        },
      };
    });
  };

  const updateFooterBottomLink = (id: string, field: string, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          bottomLinks: (footer.bottomLinks || []).map((link) => (link.id === id ? { ...link, [field]: value } : link)),
        },
      };
    });
  };

  const removeFooterBottomLink = (id: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const footer = prev.footer || {} as FooterConfig;
      return {
        ...prev,
        footer: {
          ...footer,
          bottomLinks: (footer.bottomLinks || []).filter((link) => link.id !== id),
        },
      };
    });
  };


  // 首页内容管理函数
  const updateHomePage = (field: keyof HomePageContent, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        homePage: {
          ...(prev.homePage || {} as HomePageContent),
          [field]: value,
        } as HomePageContent,
      };
    });
  };

  const addHomePageItem = (section: 'heroCards' | 'servicePromises' | 'testimonials' | 'enterprisePanels' | 'brandLogos') => {
    setContent((prev) => {
      if (!prev) return prev;
      const homePage = prev.homePage || {} as HomePageContent;
      const newId = `${section}-${Date.now()}`;
      let newItem: any;

      switch (section) {
        case 'heroCards':
          newItem = { id: newId, src: '', alt: '' };
          break;
        case 'servicePromises':
          newItem = { id: newId, title: '', detail: '' };
          break;
        case 'testimonials':
          newItem = { id: newId, quote: '', author: '', stars: 5 };
          break;
        case 'enterprisePanels':
          newItem = { id: newId, title: '', description: '', ctaLabel: '', ctaHref: '' };
          break;
        case 'brandLogos':
          newItem = { id: newId, name: '', src: '' };
          break;
      }

      return {
        ...prev,
        homePage: {
          ...homePage,
          [section]: [...(homePage[section] || []), newItem],
        },
      };
    });
  };

  const updateHomePageItem = (section: keyof HomePageContent, id: string, field: string, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      const homePage = prev.homePage || {} as HomePageContent;
      const items = (homePage[section] as any[]) || [];
      return {
        ...prev,
        homePage: {
          ...homePage,
          [section]: items.map((item: any) => (item.id === id ? { ...item, [field]: value } : item)),
        },
      };
    });
  };

  const removeHomePageItem = (section: keyof HomePageContent, id: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const homePage = prev.homePage || {} as HomePageContent;
      const items = (homePage[section] as any[]) || [];
      return {
        ...prev,
        homePage: {
          ...homePage,
          [section]: items.filter((item: any) => item.id !== id),
        },
      };
    });
  };

  // 关于页内容管理函数
  const updateAboutPage = (field: keyof AboutPageContent, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        aboutPage: {
          ...(prev.aboutPage || {} as AboutPageContent),
          [field]: value,
        } as AboutPageContent,
      };
    });
  };

  const addAboutPageItem = (section: 'milestones' | 'values') => {
    setContent((prev) => {
      if (!prev) return prev;
      const aboutPage = prev.aboutPage || {} as AboutPageContent;
      const newId = `${section}-${Date.now()}`;
      const newItem = section === 'milestones'
        ? { id: newId, year: '', detail: '' }
        : { id: newId, title: '', description: '' };

      return {
        ...prev,
        aboutPage: {
          ...aboutPage,
          [section]: [...(aboutPage[section] || []), newItem],
        },
      };
    });
  };

  const updateAboutPageItem = (section: 'milestones' | 'values', id: string, field: string, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      const aboutPage = prev.aboutPage || {} as AboutPageContent;
      const items = (aboutPage[section] || []) as any[];
      return {
        ...prev,
        aboutPage: {
          ...aboutPage,
          [section]: items.map((item: any) => (item.id === id ? { ...item, [field]: value } : item)),
        },
      };
    });
  };

  const removeAboutPageItem = (section: 'milestones' | 'values', id: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const aboutPage = prev.aboutPage || {} as AboutPageContent;
      const items = (aboutPage[section] || []) as any[];
      return {
        ...prev,
        aboutPage: {
          ...aboutPage,
          [section]: items.filter((item: any) => item.id !== id),
        },
      };
    });
  };

  // 帮助页内容管理函数
  const addHelpPageQuickLink = () => {
    setContent((prev) => {
      if (!prev) return prev;
      const helpPage = prev.helpPage || {} as HelpPageContent;
      return {
        ...prev,
        helpPage: {
          ...helpPage,
          quickLinks: [...(helpPage.quickLinks || []), { id: `quick-${Date.now()}`, label: '', href: '', icon: '📦' }],
        },
      };
    });
  };

  const updateHelpPageQuickLink = (id: string, field: string, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      const helpPage = prev.helpPage || {} as HelpPageContent;
      return {
        ...prev,
        helpPage: {
          ...helpPage,
          quickLinks: (helpPage.quickLinks || []).map((link) => (link.id === id ? { ...link, [field]: value } : link)),
        },
      };
    });
  };

  const removeHelpPageQuickLink = (id: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const helpPage = prev.helpPage || {} as HelpPageContent;
      return {
        ...prev,
        helpPage: {
          ...helpPage,
          quickLinks: (helpPage.quickLinks || []).filter((link) => link.id !== id),
        },
      };
    });
  };

  const addHelpPageFaqCategory = () => {
    setContent((prev) => {
      if (!prev) return prev;
      const helpPage = prev.helpPage || {} as HelpPageContent;
      return {
        ...prev,
        helpPage: {
          ...helpPage,
          faqCategories: [...(helpPage.faqCategories || []), { id: `faq-cat-${Date.now()}`, category: '', icon: '📦', items: [] }],
        },
      };
    });
  };

  const updateHelpPageFaqCategory = (id: string, field: string, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      const helpPage = prev.helpPage || {} as HelpPageContent;
      return {
        ...prev,
        helpPage: {
          ...helpPage,
          faqCategories: (helpPage.faqCategories || []).map((cat) => (cat.id === id ? { ...cat, [field]: value } : cat)),
        },
      };
    });
  };

  const addHelpPageFaqItem = (categoryId: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const helpPage = prev.helpPage || {} as HelpPageContent;
      return {
        ...prev,
        helpPage: {
          ...helpPage,
          faqCategories: (helpPage.faqCategories || []).map((cat) =>
            cat.id === categoryId
              ? { ...cat, items: [...cat.items, { id: `faq-${Date.now()}`, question: '', answer: '' }] }
              : cat
          ),
        },
      };
    });
  };

  const updateHelpPageFaqItem = (categoryId: string, itemId: string, field: string, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      const helpPage = prev.helpPage || {} as HelpPageContent;
      return {
        ...prev,
        helpPage: {
          ...helpPage,
          faqCategories: (helpPage.faqCategories || []).map((cat) =>
            cat.id === categoryId
              ? {
                ...cat,
                items: cat.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
              }
              : cat
          ),
        },
      };
    });
  };

  const removeHelpPageFaqItem = (categoryId: string, itemId: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const helpPage = prev.helpPage || {} as HelpPageContent;
      return {
        ...prev,
        helpPage: {
          ...helpPage,
          faqCategories: (helpPage.faqCategories || []).map((cat) =>
            cat.id === categoryId ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) } : cat
          ),
        },
      };
    });
  };

  const removeHelpPageFaqCategory = (id: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const helpPage = prev.helpPage || {} as HelpPageContent;
      return {
        ...prev,
        helpPage: {
          ...helpPage,
          faqCategories: (helpPage.faqCategories || []).filter((cat) => cat.id !== id),
        },
      };
    });
  };

  // 静态文字管理函数
  const updateStaticTexts = (field: keyof StaticTexts, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        staticTexts: {
          ...(prev.staticTexts || {} as StaticTexts),
          [field]: value,
        } as StaticTexts,
      };
    });
  };


  if (isLoading && !content) {
    return <div className="admin-table-placeholder">Loading content…</div>;
  }

  if (error || !content) {
    return <div className="admin-table-placeholder error">Failed to load content configuration.</div>;
  }

  const safeContent = ensureContentStructure(content);

  return (
    <div style={{ marginTop: 24 }}>
      <header className="admin-page-header">
        <div>
          <h1>{t('contentManager')}</h1>
          <p className="text-muted">{t('contentManagerSubtitle')}</p>
        </div>
        <nav style={{ display: 'flex', gap: 16 }}>
          <a href="/admin" className="text-muted">
            {t('dashboard')}
          </a>
          <a href="/admin/content-manager" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            {t('content')}
          </a>
          <a href="/admin/settings" className="text-muted">
            {t('settings')}
          </a>
          <a href="/" className="text-muted" target="_blank" rel="noreferrer">
            {t('viewSite')}
          </a>
        </nav>
      </header>

      {/* Tab Navigation - 按分类组织 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        {([
          { key: 'homepage', i18nKey: 'homepage' },
          { key: 'about', i18nKey: 'aboutPage' },
          { key: 'help', i18nKey: 'helpPage' },
          { key: 'static', i18nKey: 'staticTexts' },
          { key: 'footer', i18nKey: 'footer' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--color-primary)' : '#6b7280',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {t(tab.i18nKey)}
          </button>
        ))}
      </div>

      {/* Navigation Management */}
      {/* Footer Management */}
      {activeTab === 'footer' && (
        <section className="content-section">
          <h2>{t('footer')}</h2>
          <p className="text-muted">{t('footerSubtitle')}</p>

          {/* Social Links */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>{t('footerSocial')}</h3>
              <button type="button" className="btn btn--outline" onClick={addFooterSocialLink}>
                {t('addSocialLink')}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {safeContent.footer?.socialLinks?.map((link) => (
                <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
                  <input
                    type="text"
                    placeholder={t('platform')}
                    value={link.platform}
                    onChange={(e) => updateFooterSocialLink(link.id, 'platform', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('url')}
                    value={link.url}
                    onChange={(e) => updateFooterSocialLink(link.id, 'url', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('icon')}
                    value={link.icon}
                    onChange={(e) => updateFooterSocialLink(link.id, 'icon', e.target.value)}
                  />
                  <button type="button" onClick={() => removeFooterSocialLink(link.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3>{t('footerContact')}</h3>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4 }}>{t('phone')}</label>
                  <input
                    type="text"
                    value={safeContent.footer?.contactInfo?.phone || ''}
                    onChange={(e) => updateFooter('contactInfo', { ...safeContent.footer!.contactInfo, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4 }}>{t('email')}</label>
                  <input
                    type="text"
                    value={safeContent.footer?.contactInfo?.email || ''}
                    onChange={(e) => updateFooter('contactInfo', { ...safeContent.footer!.contactInfo, email: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4 }}>{t('weekday')}</label>
                  <input
                    type="text"
                    value={safeContent.footer?.contactInfo?.hours?.weekday || ''}
                    onChange={(e) => updateFooter('contactInfo', {
                      ...safeContent.footer!.contactInfo,
                      hours: { ...safeContent.footer!.contactInfo.hours, weekday: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4 }}>{t('saturday')}</label>
                  <input
                    type="text"
                    value={safeContent.footer?.contactInfo?.hours?.saturday || ''}
                    onChange={(e) => updateFooter('contactInfo', {
                      ...safeContent.footer!.contactInfo,
                      hours: { ...safeContent.footer!.contactInfo.hours, saturday: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4 }}>{t('sunday')}</label>
                  <input
                    type="text"
                    value={safeContent.footer?.contactInfo?.hours?.sunday || ''}
                    onChange={(e) => updateFooter('contactInfo', {
                      ...safeContent.footer!.contactInfo,
                      hours: { ...safeContent.footer!.contactInfo.hours, sunday: e.target.value }
                    })}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>{t('holidayNotice')}</label>
                <input
                  type="text"
                  value={safeContent.footer?.contactInfo?.holidayNotice || ''}
                  onChange={(e) => updateFooter('contactInfo', { ...safeContent.footer!.contactInfo, holidayNotice: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Footer Columns */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>{t('footerColumns')}</h3>
              <button type="button" className="btn btn--outline" onClick={addFooterColumn}>
                {t('addColumn')}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 24 }}>
              {safeContent.footer?.columns?.map((column) => (
                <div key={column.id} style={{ padding: 16, border: '1px solid #f3f4f6', borderRadius: 8 }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder={t('columnTitle')}
                      value={column.title}
                      onChange={(e) => updateFooterColumn(column.id, 'title', e.target.value)}
                      style={{ fontWeight: 600 }}
                    />
                    <button type="button" className="btn btn--outline" onClick={() => removeFooterColumn(column.id)}>
                      {t('removeColumn')}
                    </button>
                  </div>
                  <div style={{ marginLeft: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong>{t('links')}</strong>
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => addFooterLink(column.id)}>
                        {t('addLink')}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {column.links.map((link) => (
                        <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                          <input
                            type="text"
                            placeholder={t('linkLabel')}
                            value={link.label}
                            onChange={(e) => updateFooterLink(column.id, link.id, 'label', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder={t('linkUrl')}
                            value={link.href}
                            onChange={(e) => updateFooterLink(column.id, link.id, 'href', e.target.value)}
                          />
                          <button type="button" onClick={() => removeFooterLink(column.id, link.id)}>
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright & Bottom Links */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3>{t('footerCopyright')}</h3>
            <div style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder={t('copyrightText')}
                value={safeContent.footer?.copyrightText || ''}
                onChange={(e) => updateFooter('copyrightText', e.target.value)}
              />
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <strong>{t('bottomLinks')}</strong>
                <button type="button" className="btn btn--outline" onClick={addFooterBottomLink}>
                  {t('addBottomLink')}
                </button>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {safeContent.footer?.bottomLinks?.map((link) => (
                  <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                    <input
                      type="text"
                      placeholder={t('label')}
                      value={link.label}
                      onChange={(e) => updateFooterBottomLink(link.id, 'label', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder={t('url')}
                      value={link.href}
                      onChange={(e) => updateFooterBottomLink(link.id, 'href', e.target.value)}
                    />
                    <button type="button" onClick={() => removeFooterBottomLink(link.id)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}


      {/* Homepage Management */}
      {activeTab === 'homepage' && (
        <section className="content-section">
          <h2>{t('homepageContent')}</h2>
          <p className="text-muted">{t('homepageSubtitle')}</p>

          {/* Hero Section */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3>{t('heroSection')}</h3>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <input
                type="text"
                placeholder={t('heroTitle')}
                value={safeContent.homePage?.heroTitle || ''}
                onChange={(e) => updateHomePage('heroTitle', e.target.value)}
              />
              <textarea
                placeholder={t('heroSubtitle')}
                value={safeContent.homePage?.heroSubtitle || ''}
                onChange={(e) => updateHomePage('heroSubtitle', e.target.value)}
                rows={2}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <strong>{t('heroCards')}</strong>
                <button type="button" className="btn btn--outline" onClick={() => addHomePageItem('heroCards')}>
                  {t('addCard')}
                </button>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {safeContent.homePage?.heroCards?.map((card) => (
                  <div key={card.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'start' }}>
                    <ImageUploader
                      currentUrl={card.src}
                      onUploadComplete={(url) => updateHomePageItem('heroCards', card.id, 'src', url)}
                      onRemove={() => updateHomePageItem('heroCards', card.id, 'src', '')}
                    />
                    <div style={{ display: 'grid', gap: 8 }}>
                      <input
                        type="text"
                        placeholder={t('altText')}
                        value={card.alt}
                        onChange={(e) => updateHomePageItem('heroCards', card.id, 'alt', e.target.value)}
                      />
                    </div>
                    <button type="button" onClick={() => removeHomePageItem('heroCards', card.id)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Service Promises */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>{t('servicePromises')}</h3>
              <button type="button" className="btn btn--outline" onClick={() => addHomePageItem('servicePromises')}>
                {t('addPromise')}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {safeContent.homePage?.servicePromises?.map((promise) => (
                <div key={promise.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
                  <input
                    type="text"
                    placeholder={t('title')}
                    value={promise.title}
                    onChange={(e) => updateHomePageItem('servicePromises', promise.id, 'title', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('detail')}
                    value={promise.detail}
                    onChange={(e) => updateHomePageItem('servicePromises', promise.id, 'detail', e.target.value)}
                  />
                  <button type="button" onClick={() => removeHomePageItem('servicePromises', promise.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

        </section>
      )}

      {/* About Page Management */}
      {activeTab === 'about' && (
        <section className="content-section">
          <h2>{t('aboutPageContent')}</h2>
          <p className="text-muted">{t('aboutPageSubtitle')}</p>

          {/* Header */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3>{t('pageHeader')}</h3>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <input
                type="text"
                placeholder={t('headerTitle')}
                value={safeContent.aboutPage?.headerTitle || ''}
                onChange={(e) => updateAboutPage('headerTitle', e.target.value)}
              />
              <textarea
                placeholder={t('headerDescription')}
                value={safeContent.aboutPage?.headerDescription || ''}
                onChange={(e) => updateAboutPage('headerDescription', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Milestones */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>{t('milestones')}</h3>
              <button type="button" className="btn btn--outline" onClick={() => addAboutPageItem('milestones')}>
                {t('addMilestone')}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {safeContent.aboutPage?.milestones?.map((milestone) => (
                <div key={milestone.id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: 8 }}>
                  <input
                    type="text"
                    placeholder={t('year')}
                    value={milestone.year}
                    onChange={(e) => updateAboutPageItem('milestones', milestone.id, 'year', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('detail')}
                    value={milestone.detail}
                    onChange={(e) => updateAboutPageItem('milestones', milestone.id, 'detail', e.target.value)}
                  />
                  <button type="button" onClick={() => removeAboutPageItem('milestones', milestone.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Values */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>{t('values')}</h3>
              <button type="button" className="btn btn--outline" onClick={() => addAboutPageItem('values')}>
                {t('addValue')}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {safeContent.aboutPage?.values?.map((value) => (
                <div key={value.id} style={{ display: 'grid', gap: 8 }}>
                  <input
                    type="text"
                    placeholder={t('title')}
                    value={value.title}
                    onChange={(e) => updateAboutPageItem('values', value.id, 'title', e.target.value)}
                  />
                  <textarea
                    placeholder={t('description')}
                    value={value.description}
                    onChange={(e) => updateAboutPageItem('values', value.id, 'description', e.target.value)}
                    rows={2}
                  />
                  <button type="button" onClick={() => removeAboutPageItem('values', value.id)}>
                    {t('remove')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Team Section */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3>{t('teamSection')}</h3>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <input
                type="text"
                placeholder={t('teamTitle')}
                value={safeContent.aboutPage?.teamTitle || ''}
                onChange={(e) => updateAboutPage('teamTitle', e.target.value)}
              />
              <textarea
                placeholder={t('teamDescription')}
                value={safeContent.aboutPage?.teamDescription || ''}
                onChange={(e) => updateAboutPage('teamDescription', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </section>
      )}

      {/* Help Page Management */}
      {activeTab === 'help' && (
        <section className="content-section">
          <h2>{t('helpPageContent')}</h2>
          <p className="text-muted">{t('helpPageSubtitle')}</p>

          {/* Quick Links */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>{t('quickLinks')}</h3>
              <button type="button" className="btn btn--outline" onClick={addHelpPageQuickLink}>
                {t('addQuickLink')}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {safeContent.helpPage?.quickLinks?.map((link) => (
                <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr auto', gap: 8 }}>
                  <input
                    type="text"
                    placeholder={t('icon')}
                    value={link.icon}
                    onChange={(e) => updateHelpPageQuickLink(link.id, 'icon', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('label')}
                    value={link.label}
                    onChange={(e) => updateHelpPageQuickLink(link.id, 'label', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('url')}
                    value={link.href}
                    onChange={(e) => updateHelpPageQuickLink(link.id, 'href', e.target.value)}
                  />
                  <button type="button" onClick={() => removeHelpPageQuickLink(link.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Categories */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>{t('faqCategories')}</h3>
              <button type="button" className="btn btn--outline" onClick={addHelpPageFaqCategory}>
                {t('addCategory')}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              {safeContent.helpPage?.faqCategories?.map((category) => (
                <div key={category.id} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 8, marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder={t('icon')}
                      value={category.icon}
                      onChange={(e) => updateHelpPageFaqCategory(category.id, 'icon', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder={t('categoryName')}
                      value={category.category}
                      onChange={(e) => updateHelpPageFaqCategory(category.id, 'category', e.target.value)}
                    />
                    <button type="button" onClick={() => removeHelpPageFaqCategory(category.id)}>
                      {t('removeCategory')}
                    </button>
                  </div>
                  <div style={{ marginLeft: 88 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong>{t('faqItems')}</strong>
                      <button
                        type="button"
                        className="btn btn--outline"
                        onClick={() => addHelpPageFaqItem(category.id)}
                      >
                        {t('addFaq')}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {category.items.map((item) => (
                        <div key={item.id} style={{ display: 'grid', gap: 8 }}>
                          <input
                            type="text"
                            placeholder={t('question')}
                            value={item.question}
                            onChange={(e) => updateHelpPageFaqItem(category.id, item.id, 'question', e.target.value)}
                          />
                          <textarea
                            placeholder={t('answer')}
                            value={item.answer}
                            onChange={(e) => updateHelpPageFaqItem(category.id, item.id, 'answer', e.target.value)}
                            rows={3}
                          />
                          <button
                            type="button"
                            onClick={() => removeHelpPageFaqItem(category.id, item.id)}
                          >
                            {t('removeFaq')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Static Texts Management */}
      {activeTab === 'static' && (
        <section className="content-section">
          <h2>{t('staticTextsTitle')}</h2>
          <p className="text-muted">{t('staticTextsSubtitle')}</p>

          {/* Top Message Bar */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3>{t('topMessageBar')}</h3>
            <input
              type="text"
              placeholder={t('messageBarText')}
              value={safeContent.staticTexts?.topMessageBar || ''}
              onChange={(e) => updateStaticTexts('topMessageBar', e.target.value)}
              style={{ width: '100%', marginTop: 12 }}
            />
          </div>

        </section>
      )}

      <div className="content-actions" style={{ marginTop: 24 }}>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? t('saving') : t('saveAllChanges')}
        </button>
        <button className="btn btn--outline" type="button" onClick={() => mutate()} disabled={saving}>
          {t('reloadConfig')}
        </button>
      </div>
    </div>
  );
}
