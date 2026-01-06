// Offline workflow configuration utilities
const { Setting } = require('../models');
const logger = require('../utils/logger');

// 默认阶段配置，当数据库中没有配置时使用
// 修复：提供默认阶段，避免 getInitialStage 返回 undefined
const DEFAULT_STAGE_CONFIG = [
  {
    key: 'pending-design',
    labelEn: 'Pending Design',
    labelZh: '待确认设计',
    description: 'Pending design confirmation',
    position: 0
  },
  {
    key: 'layout-proofing',
    labelEn: 'Layout/Proofing',
    labelZh: '设计排版/校样',
    description: 'Layout and proofing',
    position: 1
  },
  {
    key: 'printing',
    labelEn: 'Printing',
    labelZh: '印刷生产',
    description: 'In printing production',
    position: 2
  },
  {
    key: 'transfer',
    labelEn: 'Transfer',
    labelZh: '转印生产',
    description: 'In transfer production',
    position: 3
  },
  {
    key: 'qc',
    labelEn: 'Quality Control',
    labelZh: '出货审核',
    description: 'Quality control and shipping review',
    position: 4
  },
  {
    key: 'ready',
    labelEn: 'Ready',
    labelZh: '待取货/发货',
    description: 'Ready for pickup or shipment',
    position: 5
  }
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
  const source = Array.isArray(stages) && stages.length ? stages : DEFAULT_STAGE_CONFIG;

  const seen = new Set();

  const normalized = source
    .map((stage, index) => {
      // Handle legacy "label" field OR new bilingual labels
      const labelEn = (stage?.labelEn || stage?.label || '').toString().trim();
      const labelZh = (stage?.labelZh || stage?.label || '').toString().trim();

      if (!labelEn && !labelZh) return null;

      const key = slugify(stage.key || labelEn || labelZh);
      if (!key || seen.has(key)) return null;

      const rawPosition =
        stage?.position !== undefined && !Number.isNaN(Number(stage.position))
          ? parseInt(stage.position, 10)
          : index;

      seen.add(key);
      return {
        key,
        label: labelEn || labelZh, // Legacy compatibility
        labelEn,
        labelZh,
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
  try {
    const record = await Setting.findOne({ where: { key: STAGE_SETTING_KEY } });

    const parsed = parseSettingValue(record?.value);
    const stages = normalizeStages(parsed?.stages || parsed);

    return stages;
  } catch (error) {
    // 如果查询失败，记录错误并返回默认阶段配置，确保前端能正常渲染
    logger.warn('[offlineWorkflowService] Failed to get stage config from database, using defaults:', error?.message);
    return DEFAULT_STAGE_CONFIG;
  }
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
  try {
    const stages = await getStageConfig();
    // 确保始终返回有效的阶段对象
    if (stages && stages.length > 0) {
      return stages[0];
    }
  } catch (error) {
    // 如果获取阶段配置失败，返回默认阶段
    logger.warn('[offlineWorkflowService] Failed to get stage config, using default:', error?.message);
  }
  // 返回默认阶段，确保永远不会返回 undefined
  return DEFAULT_STAGE_CONFIG[0];
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

