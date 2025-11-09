// [2025-11-08 06:55:45] Offline workflow configuration utilities
const { Setting } = require('../models');

const DEFAULT_STAGE_CONFIG = [
  { key: 'intake', label: 'Intake', description: 'New offline POD requests' },
  { key: 'collect-materials', label: 'Collect Materials', description: 'Awaiting brand assets and specs' },
  { key: 'design', label: 'Design', description: 'Design team working on mockups' },
  { key: 'production', label: 'Production', description: 'Manufacturing and finishing' },
  { key: 'logistics', label: 'Logistics', description: 'Preparing shipment and delivery' },
  { key: 'completed', label: 'Completed', description: 'Order fulfilled and delivered' }
];

const STAGE_SETTING_KEY = 'offline_workflow_stages';

const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const parseSettingValue = (rawValue) => {
  if (!rawValue) {
    return null;
  }

  if (typeof rawValue === 'string') {
    try {
      return JSON.parse(rawValue);
    } catch (error) {
      return null;
    }
  }

  return rawValue;
};

const normalizeStages = (stages = []) => {
  if (!Array.isArray(stages) || !stages.length) {
    return DEFAULT_STAGE_CONFIG;
  }

  const seen = new Set();

  return stages
    .map((stage) => {
      const label = stage?.label?.toString().trim();
      if (!label) return null;

      const key = slugify(stage.key || label);
      if (!key || seen.has(key)) return null;

      seen.add(key);
      return {
        key,
        label,
        description: stage?.description?.toString().trim() || ''
      };
    })
    .filter(Boolean);
};

const getStageConfig = async () => {
  const record = await Setting.findOne({ where: { key: STAGE_SETTING_KEY } });

  const parsed = parseSettingValue(record?.value);
  const stages = normalizeStages(parsed?.stages || parsed);

  return stages;
};

const updateStageConfig = async (stages = [], actorId = null) => {
  const normalized = normalizeStages(stages);

  const payload = {
    stages: normalized
  };

  const [record, created] = await Setting.findOrCreate({
    where: { key: STAGE_SETTING_KEY },
    defaults: {
      value: payload,
      updated_at: new Date(),
      updated_by: actorId || null
    }
  });

  if (!created) {
    record.value = payload;
    record.updated_at = new Date();
    record.updated_by = actorId || null;
    await record.save();
  }

  return normalized;
};

const findStageByKey = async (stageKey) => {
  const stages = await getStageConfig();
  return stages.find((stage) => stage.key === stageKey) || null;
};

const getInitialStage = async () => {
  const stages = await getStageConfig();
  return stages[0] || DEFAULT_STAGE_CONFIG[0];
};

module.exports = {
  DEFAULT_STAGE_CONFIG,
  getStageConfig,
  updateStageConfig,
  findStageByKey,
  getInitialStage,
  STAGE_SETTING_KEY
};

