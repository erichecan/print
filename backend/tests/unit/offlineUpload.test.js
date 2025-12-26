const fs = require('fs');

// eslint-disable-next-line import/no-dynamic-require
const offlineUpload = require('../../src/utils/offlineUpload');

describe('offlineUpload utils', () => {
  const originalEnv = process.env.OFFLINE_ORDER_ALLOWED_EXTENSIONS;

  afterEach(() => {
    process.env.OFFLINE_ORDER_ALLOWED_EXTENSIONS = originalEnv;
  });

  it('ensures upload root is created and reusable', () => {
    const root = offlineUpload.ensureOfflineUploadRoot();
    expect(fs.existsSync(root)).toBe(true);
    expect(offlineUpload.ensureOfflineUploadRoot()).toBe(root);
  });

  it('validates file extensions using defaults', () => {
    delete process.env.OFFLINE_ORDER_ALLOWED_EXTENSIONS;
    expect(offlineUpload.isExtensionAllowed('design.ai')).toBe(true);
    expect(offlineUpload.isExtensionAllowed('design.exe')).toBe(false);
  });

  it('reads allowed extensions from environment variable', () => {
    process.env.OFFLINE_ORDER_ALLOWED_EXTENSIONS = '.zip,.csv';
    expect(offlineUpload.getAllowedExtensions()).toEqual(['.zip', '.csv']);
    expect(offlineUpload.isExtensionAllowed('addresses.csv')).toBe(true);
    expect(offlineUpload.isExtensionAllowed('design.ai')).toBe(false);
  });
});

