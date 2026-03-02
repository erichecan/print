const { normalizeStages, DEFAULT_STAGE_CONFIG } = require('../../src/services/offlineWorkflowService');

describe('offlineWorkflowService.normalizeStages', () => {
  it('returns default config with sequential positions when input empty', () => {
    const stages = normalizeStages([]);
    expect(stages).toHaveLength(DEFAULT_STAGE_CONFIG.length);
    stages.forEach((stage, index) => {
      // [2026-03-02 05:55:10] 默认配置使用 labelEn 作为规范化 label
      expect(stage).toMatchObject({
        key: DEFAULT_STAGE_CONFIG[index].key,
        label: DEFAULT_STAGE_CONFIG[index].labelEn,
        position: index
      });
    });
  });

  it('normalizes custom stages, enforcing unique keys and positions', () => {
    const customStages = [
      { label: 'Draft', position: 4 },
      { label: 'Review', key: 'review', position: 1 },
      { label: 'Production', key: 'Production' }, // duplicate key should be ignored
      { label: 'Shipping' }
    ];

    const stages = normalizeStages(customStages);
    // [2026-03-02 05:53:30] 兼容新增的双语标签字段（labelEn/labelZh），仅校验核心结构
    expect(stages).toMatchObject([
      { key: 'draft', label: 'Draft', description: '', position: 4 },
      { key: 'review', label: 'Review', description: '', position: 1 },
      { key: 'production', label: 'Production', description: '', position: 2 },
      { key: 'shipping', label: 'Shipping', description: '', position: 3 }
    ]);
  });
});

