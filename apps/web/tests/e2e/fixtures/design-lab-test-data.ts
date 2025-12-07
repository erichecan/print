/**
 * Design Lab 测试数据
 * [2025-01-27 12:00:00] 提供测试所需的静态数据
 */
import * as path from 'path';

/**
 * 测试图片文件路径
 * [2025-01-27 12:00:00]
 */
export const TEST_IMAGES = {
  // 小图片（用于快速测试）- 使用项目根目录的 favicon
  small: path.resolve(__dirname, '../../../../../favicon-512x512.png'),
  // 中等图片 - 使用 assets 目录
  medium: path.resolve(__dirname, '../../../../../assets/cat-tshirt.webp'),
  // 大图片（测试文件大小限制）
  large: path.resolve(__dirname, '../../../../../assets/hero/hero-card-tee.jpg'),
};

/**
 * 测试文字内容
 * [2025-01-27 12:00:00]
 */
export const TEST_TEXTS = {
  simple: 'Hello World',
  multiline: 'Line 1\nLine 2\nLine 3',
  specialChars: 'Test & Special <Chars>',
  long: 'This is a very long text that should test text wrapping and display in the design lab',
  emoji: 'Hello 👋 World 🌍',
};

/**
 * 测试产品数据
 * [2025-01-27 12:00:00]
 */
export const TEST_PRODUCTS = {
  tshirt: {
    name: 'Classic Crew Tee',
    slug: 'classic-crew-tee',
    variantId: 'variant-001',
  },
  hoodie: {
    name: 'Classic Hoodie',
    slug: 'classic-hoodie',
    variantId: 'variant-002',
  },
};

/**
 * 测试尺码配置
 * [2025-01-27 12:00:00]
 */
export const TEST_SIZES = {
  youth: ['YS', 'YM', 'YL'],
  adult: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
  all: ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
};

/**
 * 测试颜色配置
 * [2025-01-27 12:00:00]
 */
export const TEST_COLORS = {
  black: { name: 'Black', hex: '#000000' },
  white: { name: 'White', hex: '#FFFFFF' },
  navy: { name: 'Navy', hex: '#001F3F' },
  red: { name: 'Red', hex: '#FF0000' },
};

/**
 * 测试 Names & Numbers 数据
 * [2025-01-27 12:00:00]
 */
export const TEST_NAMES_NUMBERS = {
  names: ['John', 'Jane', 'Bob', 'Alice'],
  numbers: ['1', '2', '3', '10', '23'],
  combined: [
    { name: 'John', number: '1', size: 'M' },
    { name: 'Jane', number: '2', size: 'L' },
    { name: 'Bob', number: '3', size: 'XL' },
  ],
};

/**
 * 测试字体名称
 * [2025-01-27 12:00:00]
 */
export const TEST_FONTS = {
  popular: ['Arial', 'Helvetica', 'Times New Roman'],
  script: ['Brush Script', 'Comic Sans', 'Cursive'],
  modern: ['Roboto', 'Open Sans', 'Lato'],
};

/**
 * 测试素材分类
 * [2025-01-27 12:00:00]
 */
export const TEST_ART_CATEGORIES = [
  'Emojis',
  'Shapes & Symbols',
  'Sports & Games',
  'Letters & Numbers',
  'Animals',
  'Mascots',
  'Nature',
  'America',
  'Parties & Events',
  'Military',
  'Occupations',
  'Colleges',
  'Music',
  'Transportation',
  'Greek Life',
  'School',
  'Charity',
  'People',
];

/**
 * 测试数量配置
 * [2025-01-27 12:00:00]
 */
export const TEST_QUANTITIES = {
  small: { S: 2, M: 3, L: 2 },
  medium: { S: 5, M: 10, L: 5, XL: 3 },
  large: { S: 10, M: 20, L: 15, XL: 10, '2XL': 5 },
};

/**
 * 测试配送选项
 * [2025-01-27 12:00:00]
 */
export const TEST_SHIPPING_OPTIONS = {
  single: 'Ship to single address',
  multiple: 'Ship to multiple addresses',
};

/**
 * 测试支付选项
 * [2025-01-27 12:00:00]
 */
export const TEST_PAYMENT_OPTIONS = {
  iPay: 'I will pay for the entire order',
  groupPay: 'Invite my group to pay for their order',
};

/**
 * 测试尺码选择选项
 * [2025-01-27 12:00:00]
 */
export const TEST_SIZE_OPTIONS = {
  iKnow: 'I know the sizes I need',
  inviteGroup: 'Invite my group to choose their sizes',
};

