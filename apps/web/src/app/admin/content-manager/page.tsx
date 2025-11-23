/**
 * Content Manager Page
 * [2025-01-28 06:10:00] Complete CMS content management interface
 * [2025-01-28 08:15:00] Added internationalization support
 */
'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { adminContentApi, ContentConfig, NavigationMenuItem, HomePageContent, AboutPageContent, HelpPageContent, StaticTexts } from '@/lib/api';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useAdminI18n } from '@/contexts/adminI18nContext';

export default function ContentManagerPage() {
  const { t, locale } = useAdminI18n(); // [2025-01-28 08:15:00] 使用国际化
  const { data, isLoading, error, mutate } = useSWR('admin-content-config', adminContentApi.get);
  const [content, setContent] = useState<ContentConfig | null>(null);
  const [saving, setSaving] = useState(false);
  // [2025-01-28 10:00:00] 移除 legacy tab，不再需要遗留内容
  const [activeTab, setActiveTab] = useState<'navigation' | 'homepage' | 'about' | 'help' | 'static'>('navigation');

  useEffect(() => {
    if (data?.data) {
      setContent(data.data);
    }
  }, [data]);

  // [2025-01-28 06:10:00] 确保内容对象有所有必需的字段
  const ensureContentStructure = (content: ContentConfig): ContentConfig => {
    return {
      ...content,
      navigation: content.navigation || [],
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
        footerColumns: [],
        footerCopyright: '',
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

  // [2025-01-28 06:10:00] 导航管理函数
  const addNavigationItem = () => {
    setContent((prev) => {
      if (!prev) return prev;
      const newItem: NavigationMenuItem = {
        id: `nav-${Date.now()}`,
        label: 'New Menu Item',
        href: '/',
        order: (prev.navigation?.length || 0) + 1,
        type: 'link',
      };
      return {
        ...prev,
        navigation: [...(prev.navigation || []), newItem],
      };
    });
  };

  const updateNavigationItem = (id: string, field: keyof NavigationMenuItem, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        navigation: (prev.navigation || []).map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        ),
      };
    });
  };

  const removeNavigationItem = (id: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        navigation: (prev.navigation || []).filter((item) => item.id !== id),
      };
    });
  };

  // [2025-01-28 06:10:00] 首页内容管理函数
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

  // [2025-01-28 06:10:00] 关于页内容管理函数
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

  // [2025-01-28 06:10:00] 帮助页内容管理函数
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

  // [2025-01-28 06:10:00] 静态文字管理函数
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

  const addFooterColumn = () => {
    setContent((prev) => {
      if (!prev) return prev;
      const staticTexts = prev.staticTexts || {} as StaticTexts;
      return {
        ...prev,
        staticTexts: {
          ...staticTexts,
          footerColumns: [...(staticTexts.footerColumns || []), { id: `footer-col-${Date.now()}`, title: '', links: [] }],
        },
      };
    });
  };

  const updateFooterColumn = (id: string, field: string, value: any) => {
    setContent((prev) => {
      if (!prev) return prev;
      const staticTexts = prev.staticTexts || {} as StaticTexts;
      return {
        ...prev,
        staticTexts: {
          ...staticTexts,
          footerColumns: (staticTexts.footerColumns || []).map((col) => (col.id === id ? { ...col, [field]: value } : col)),
        },
      };
    });
  };

  const addFooterLink = (columnId: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const staticTexts = prev.staticTexts || {} as StaticTexts;
      return {
        ...prev,
        staticTexts: {
          ...staticTexts,
          footerColumns: (staticTexts.footerColumns || []).map((col) =>
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
      const staticTexts = prev.staticTexts || {} as StaticTexts;
      return {
        ...prev,
        staticTexts: {
          ...staticTexts,
          footerColumns: (staticTexts.footerColumns || []).map((col) =>
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
      const staticTexts = prev.staticTexts || {} as StaticTexts;
      return {
        ...prev,
        staticTexts: {
          ...staticTexts,
          footerColumns: (staticTexts.footerColumns || []).map((col) =>
            col.id === columnId ? { ...col, links: col.links.filter((link) => link.id !== linkId) } : col
          ),
        },
      };
    });
  };

  const removeFooterColumn = (id: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const staticTexts = prev.staticTexts || {} as StaticTexts;
      return {
        ...prev,
        staticTexts: {
          ...staticTexts,
          footerColumns: (staticTexts.footerColumns || []).filter((col) => col.id !== id),
        },
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

      {/* [2025-01-28 08:00:00] Tab Navigation - 按分类组织 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        {/* [2025-01-28 10:00:00] 移除 legacy tab */}
        {([
          { key: 'navigation', i18nKey: 'navigation' },
          { key: 'homepage', i18nKey: 'homepage' },
          { key: 'about', i18nKey: 'aboutPage' },
          { key: 'help', i18nKey: 'helpPage' },
          { key: 'static', i18nKey: 'staticTexts' },
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

      {/* [2025-01-28 06:10:00] Navigation Management */}
      {activeTab === 'navigation' && (
        <section className="content-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2>{t('navigationMenu')}</h2>
              <p className="text-muted">{t('navigationSubtitle')}</p>
            </div>
            <button type="button" className="btn btn--outline" onClick={addNavigationItem}>
              {t('addMenuItem')}
            </button>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {safeContent.navigation
              ?.sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((item) => (
                <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr auto', gap: 12, alignItems: 'center' }}>
                      {/* [2025-01-28 08:30:00] 排序输入框 */}
                      <input
                        type="number"
                        placeholder="Order"
                        value={item.order || 0}
                        onChange={(e) => updateNavigationItem(item.id, 'order', parseInt(e.target.value) || 0)}
                        style={{ width: '60px', padding: '8px', textAlign: 'center' }}
                        title={locale === 'zh' ? '排序顺序（数字越小越靠前）' : 'Sort order (lower numbers appear first)'}
                      />
                      <input
                        type="text"
                        placeholder={t('label')}
                        value={item.label}
                        onChange={(e) => updateNavigationItem(item.id, 'label', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder={t('url')}
                        value={item.href}
                        onChange={(e) => updateNavigationItem(item.id, 'href', e.target.value)}
                      />
                      <select
                        value={item.type}
                        onChange={(e) => updateNavigationItem(item.id, 'type', e.target.value as any)}
                      >
                        <option value="link">{t('simpleLink')}</option>
                        <option value="mega">{t('megaMenu')}</option>
                        <option value="simple">{t('simplePanel')}</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn--outline"
                        onClick={() => removeNavigationItem(item.id)}
                      >
                        {t('remove')}
                      </button>
                    </div>

                    {item.type === 'mega' && item.megaPanel && (
                      <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 4 }}>
                        <h4 style={{ marginBottom: 12 }}>{locale === 'zh' ? '大型菜单列' : 'Mega Menu Columns'}</h4>
                        {item.megaPanel.columns.map((col, colIndex) => (
                          <div key={col.id} style={{ marginBottom: 16 }}>
                            <strong>{locale === 'zh' ? `列 ${colIndex + 1}` : `Column ${colIndex + 1}`}</strong>
                            {col.links.map((link) => (
                              <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 8 }}>
                                <input
                                  type="text"
                                  placeholder={t('label')}
                                  value={link.label}
                                  onChange={(e) => {
                                    const newColumns = [...item.megaPanel!.columns];
                                    newColumns[colIndex] = {
                                      ...col,
                                      links: col.links.map((l) => (l.id === link.id ? { ...l, label: e.target.value } : l)),
                                    };
                                    updateNavigationItem(item.id, 'megaPanel', { columns: newColumns });
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder={t('url')}
                                  value={link.href}
                                  onChange={(e) => {
                                    const newColumns = [...item.megaPanel!.columns];
                                    newColumns[colIndex] = {
                                      ...col,
                                      links: col.links.map((l) => (l.id === link.id ? { ...l, href: e.target.value } : l)),
                                    };
                                    updateNavigationItem(item.id, 'megaPanel', { columns: newColumns });
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newColumns = [...item.megaPanel!.columns];
                                    newColumns[colIndex] = {
                                      ...col,
                                      links: col.links.filter((l) => l.id !== link.id),
                                    };
                                    updateNavigationItem(item.id, 'megaPanel', { columns: newColumns });
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="btn btn--outline"
                              style={{ marginTop: 8 }}
                              onClick={() => {
                                const newColumns = [...item.megaPanel!.columns];
                                newColumns[colIndex] = {
                                  ...col,
                                  links: [...col.links, { id: `link-${Date.now()}`, label: '', href: '' }],
                                };
                                updateNavigationItem(item.id, 'megaPanel', { columns: newColumns });
                              }}
                            >
                              {t('addLink')}
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn btn--outline"
                          onClick={() => {
                            const newColumns = [...(item.megaPanel?.columns || [])];
                            newColumns.push({ id: `col-${Date.now()}`, links: [] });
                            updateNavigationItem(item.id, 'megaPanel', { columns: newColumns });
                          }}
                        >
                          {t('addColumn')}
                        </button>
                      </div>
                    )}

                    {item.type === 'simple' && item.simplePanel && (
                      <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 4 }}>
                        <h4 style={{ marginBottom: 12 }}>{locale === 'zh' ? '简单面板内容' : 'Simple Panel Content'}</h4>
                        <div style={{ display: 'grid', gap: 12 }}>
                          <input
                            type="text"
                            placeholder={t('title')}
                            value={item.simplePanel.title}
                            onChange={(e) =>
                              updateNavigationItem(item.id, 'simplePanel', { ...item.simplePanel!, title: e.target.value })
                            }
                          />
                          <textarea
                            placeholder={t('description')}
                            value={item.simplePanel.description}
                            onChange={(e) =>
                              updateNavigationItem(item.id, 'simplePanel', { ...item.simplePanel!, description: e.target.value })
                            }
                            rows={3}
                          />
                          {item.simplePanel.actions.map((action, actionIndex) => (
                            <div key={actionIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
                              <input
                                type="text"
                                placeholder={t('ctaLabel')}
                                value={action.label}
                                onChange={(e) => {
                                  const newActions = [...item.simplePanel!.actions];
                                  newActions[actionIndex] = { ...action, label: e.target.value };
                                  updateNavigationItem(item.id, 'simplePanel', { ...item.simplePanel!, actions: newActions });
                                }}
                              />
                              <input
                                type="text"
                                placeholder={t('ctaHref')}
                                value={action.href}
                                onChange={(e) => {
                                  const newActions = [...item.simplePanel!.actions];
                                  newActions[actionIndex] = { ...action, href: e.target.value };
                                  updateNavigationItem(item.id, 'simplePanel', { ...item.simplePanel!, actions: newActions });
                                }}
                              />
                              <select
                                value={action.variant || 'primary'}
                                onChange={(e) => {
                                  const newActions = [...item.simplePanel!.actions];
                                  newActions[actionIndex] = { ...action, variant: e.target.value as any };
                                  updateNavigationItem(item.id, 'simplePanel', { ...item.simplePanel!, actions: newActions });
                                }}
                              >
                                <option value="primary">{locale === 'zh' ? '主要' : 'Primary'}</option>
                                <option value="outline">{locale === 'zh' ? '轮廓' : 'Outline'}</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  const newActions = item.simplePanel!.actions.filter((_, i) => i !== actionIndex);
                                  updateNavigationItem(item.id, 'simplePanel', { ...item.simplePanel!, actions: newActions });
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="btn btn--outline"
                            onClick={() => {
                              const newActions = [...(item.simplePanel?.actions || [])];
                              newActions.push({ label: '', href: '', variant: 'primary' });
                              updateNavigationItem(item.id, 'simplePanel', { ...item.simplePanel!, actions: newActions });
                            }}
                          >
                            {locale === 'zh' ? '+ 添加操作' : '+ Add Action'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* [2025-01-28 06:10:00] Homepage Management */}
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

          {/* Testimonials */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>{t('testimonials')}</h3>
              <button type="button" className="btn btn--outline" onClick={() => addHomePageItem('testimonials')}>
                {t('addTestimonial')}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {safeContent.homePage?.testimonials?.map((testimonial) => (
                <div key={testimonial.id} style={{ display: 'grid', gap: 8 }}>
                  <textarea
                    placeholder={t('quote')}
                    value={testimonial.quote}
                    onChange={(e) => updateHomePageItem('testimonials', testimonial.id, 'quote', e.target.value)}
                    rows={2}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
                    <input
                      type="text"
                      placeholder={t('author')}
                      value={testimonial.author}
                      onChange={(e) => updateHomePageItem('testimonials', testimonial.id, 'author', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder={t('stars')}
                      min={1}
                      max={5}
                      value={testimonial.stars}
                      onChange={(e) => updateHomePageItem('testimonials', testimonial.id, 'stars', parseInt(e.target.value) || 5)}
                    />
                    <div></div>
                    <button type="button" onClick={() => removeHomePageItem('testimonials', testimonial.id)}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enterprise Panels */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>Enterprise Panels</h3>
              <button type="button" className="btn btn--outline" onClick={() => addHomePageItem('enterprisePanels')}>
                + Add Panel
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {safeContent.homePage?.enterprisePanels?.map((panel) => (
                <div key={panel.id} style={{ display: 'grid', gap: 8 }}>
                  <input
                    type="text"
                    placeholder={t('title')}
                    value={panel.title}
                    onChange={(e) => updateHomePageItem('enterprisePanels', panel.id, 'title', e.target.value)}
                  />
                  <textarea
                    placeholder={t('description')}
                    value={panel.description}
                    onChange={(e) => updateHomePageItem('enterprisePanels', panel.id, 'description', e.target.value)}
                    rows={2}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
                    <input
                      type="text"
                      placeholder={t('ctaLabel')}
                      value={panel.ctaLabel}
                      onChange={(e) => updateHomePageItem('enterprisePanels', panel.id, 'ctaLabel', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder={t('ctaHref')}
                      value={panel.ctaHref}
                      onChange={(e) => updateHomePageItem('enterprisePanels', panel.id, 'ctaHref', e.target.value)}
                    />
                    <select
                      value={panel.ctaVariant || 'primary'}
                      onChange={(e) => updateHomePageItem('enterprisePanels', panel.id, 'ctaVariant', e.target.value)}
                    >
                      <option value="primary">Primary</option>
                      <option value="outline">Outline</option>
                    </select>
                    <button type="button" onClick={() => removeHomePageItem('enterprisePanels', panel.id)}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Logos */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>{t('brandLogos')}</h3>
              <button type="button" className="btn btn--outline" onClick={() => addHomePageItem('brandLogos')}>
                {t('addLogo')}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {safeContent.homePage?.brandLogos?.map((logo) => (
                <div key={logo.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'start' }}>
                  <ImageUploader
                    currentUrl={logo.src}
                    onUploadComplete={(url) => updateHomePageItem('brandLogos', logo.id, 'src', url)}
                    onRemove={() => updateHomePageItem('brandLogos', logo.id, 'src', '')}
                  />
                  <input
                    type="text"
                    placeholder={t('brandName')}
                    value={logo.name}
                    onChange={(e) => updateHomePageItem('brandLogos', logo.id, 'name', e.target.value)}
                  />
                  <button type="button" onClick={() => removeHomePageItem('brandLogos', logo.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* [2025-01-28 06:10:00] About Page Management */}
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

      {/* [2025-01-28 06:10:00] Help Page Management */}
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

      {/* [2025-01-28 06:10:00] Static Texts Management */}
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

          {/* Footer Columns */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3>{t('footerColumns')}</h3>
              <button type="button" className="btn btn--outline" onClick={addFooterColumn}>
                {t('addColumn')}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              {safeContent.staticTexts?.footerColumns?.map((column) => (
                <div key={column.id} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder={t('columnTitle')}
                      value={column.title}
                      onChange={(e) => updateFooterColumn(column.id, 'title', e.target.value)}
                    />
                    <button type="button" onClick={() => removeFooterColumn(column.id)}>
                      {t('removeColumn')}
                    </button>
                  </div>
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong>{t('links')}</strong>
                      <button
                        type="button"
                        className="btn btn--outline"
                        onClick={() => addFooterLink(column.id)}
                      >
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

          {/* Footer Copyright */}
          <div style={{ marginTop: 24, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <h3>{t('footerCopyright')}</h3>
            <input
              type="text"
              placeholder={t('copyrightText')}
              value={safeContent.staticTexts?.footerCopyright || ''}
              onChange={(e) => updateStaticTexts('footerCopyright', e.target.value)}
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
