// [2025-11-08 06:55:45] Offline workflow configuration utilities
const { Setting } = require('../models');

// [2025-01-28 05:40:00] 清空默认阶段配置，由管理员通过设置页面配置
const DEFAULT_STAGE_CONFIG = [];

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
  const source = Array.isArray(stages) && stages.length ? stages : DEFAULT_STAGE_CONFIG;

  const seen = new Set();

  const normalized = source
    .map((stage, index) => {
      const label = stage?.label?.toString().trim();
      if (!label) return null;

      const key = slugify(stage.key || label);
      if (!key || seen.has(key)) return null;

      const rawPosition =
        stage?.position !== undefined && !Number.isNaN(Number(stage.position))
          ? parseInt(stage.position, 10)
          : index;

      seen.add(key);
      return {
        key,
        label,
        description: stage?.description?.toString().trim() || '',
        position: rawPosition
      };
    })
    .filter(Boolean);

  return normalized.map((stage, index) => ({
    ...stage,
    position: stage.position ?? index
  }));
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
  STAGE_SETTING_KEY,
  normalizeStages
};

