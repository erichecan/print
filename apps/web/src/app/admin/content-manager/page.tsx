'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useAdminI18n } from '@/contexts/adminI18nContext';
import { adminContentApi, ContentConfig } from '@/lib/api';
// Import client component tabs
import {
  HomepageTab,
  AboutPageTab,
  HelpPageTab,
  StaticTextsTab,
  LegacyTab,
  FooterTab
} from './components/ContentTabs';

export default function ContentManagerPage() {
  const { t } = useAdminI18n();
  const { data, error, isLoading, mutate } = useSWR('website-content', adminContentApi.get);
  const [activeTab, setActiveTab] = useState('homepage');
  const [isSaving, setIsSaving] = useState(false);
  const [contentDraft, setContentDraft] = useState<ContentConfig | null>(null);

  // Initialize draft when data loads
  if (data?.data && !contentDraft) {
    setContentDraft(data.data);
  }

  const handleSave = async () => {
    if (!contentDraft) return;
    try {
      setIsSaving(true);
      await adminContentApi.update(contentDraft);
      await mutate();
      alert(t('successfullySaved') || 'Content saved successfully');
    } catch (err) {
      console.error(err);
      alert(t('saveError') || 'Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSection = (section: keyof ContentConfig, value: any) => {
    if (!contentDraft) return;
    setContentDraft({ ...contentDraft, [section]: value });
  };

  if (isLoading) return <div className="admin-page-header">{t('loading')}</div>;
  if (error) return <div className="admin-page-header text-red-600">{t('failedDashboard')}</div>;

  return (
    <div className="admin-page max-w-6xl mx-auto">
      <header className="admin-page-header mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">{t('contentManagerTitle')}</h1>
          <p className="text-gray-500">{t('contentManagerSubtitle')}</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/"
            target="_blank"
            className="btn btn--outline"
          >
            {t('viewSite')} ↗
          </a>
          <button
            onClick={handleSave}
            className="btn btn--primary"
            disabled={isSaving}
          >
            {isSaving ? t('saving') : t('saveAllChanges')}
          </button>
        </div>
      </header>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'homepage', label: t('tabHomepage') },
            { id: 'about', label: t('tabAbout') },
            { id: 'help', label: t('tabHelp') },
            { id: 'static', label: t('tabStatic') },
            { id: 'footer', label: t('tabFooter') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors
                ${activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {contentDraft && (
            <>
              {activeTab === 'homepage' && (
                <HomepageTab
                  data={contentDraft.homePage}
                  onChange={(val) => updateSection('homePage', val)}
                />
              )}
              {activeTab === 'about' && (
                <AboutPageTab
                  data={contentDraft.aboutPage}
                  onChange={(val) => updateSection('aboutPage', val)}
                />
              )}
              {activeTab === 'help' && (
                <HelpPageTab
                  data={contentDraft.helpPage}
                  onChange={(val) => updateSection('helpPage', val)}
                />
              )}
              {activeTab === 'static' && (
                <StaticTextsTab
                  data={contentDraft.staticTexts}
                  onChange={(val) => updateSection('staticTexts', val)}
                />
              )}
              {activeTab === 'footer' && (
                <FooterTab
                  data={contentDraft.footer}
                  onChange={(val) => updateSection('footer', val)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
