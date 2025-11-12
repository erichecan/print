const { normalizeStages, DEFAULT_STAGE_CONFIG } = require('../../src/services/offlineWorkflowService');

describe('offlineWorkflowService.normalizeStages', () => {
  it('returns default config with sequential positions when input empty', () => {
    const stages = normalizeStages([]);
    expect(stages).toHaveLength(DEFAULT_STAGE_CONFIG.length);
    stages.forEach((stage, index) => {
      expect(stage).toMatchObject({
        key: DEFAULT_STAGE_CONFIG[index].key,
        label: DEFAULT_STAGE_CONFIG[index].label,
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

    expect(stages).toEqual([
      { key: 'draft', label: 'Draft', description: '', position: 4 },
      { key: 'review', label: 'Review', description: '', position: 1 },
      { key: 'shipping', label: 'Shipping', description: '', position: 3 }
    ]);
  });
});

