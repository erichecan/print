/**
 * Referral 商品数据 - 参考 Amazon Best Sellers 热门电子产品
 * 价格区间 100-1000，含图片
 * 图片优先使用 Tavily 搜索得到的 URL（运行 backend/scripts/fetch-product-images-tavily.js 生成）
 * 2026-03-01 创建
 */

import tavilyImages from './productImages.json';

export interface ReferralProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category?: string;
}

/** picsum.photos 占位图（当 Tavily 无结果时使用） */
function placeholderImage(seed: string): string {
  return `https://picsum.photos/seed/${seed}/400/400`;
}

/** 优先 Tavily 搜索结果，否则 picsum 占位 */
function getImageUrl(id: string, fallbackSeed: string): string {
  const tavily = (tavilyImages as Record<string, string>)[id];
  return tavily && tavily.length > 0 ? tavily : placeholderImage(fallbackSeed);
}

export const REFERRAL_PRODUCTS: ReferralProduct[] = [
  // 耳机/音响 100-300
  { id: 'p01', name: '无线降噪耳机 Pro 版', price: 249, imageUrl: getImageUrl('p01', 'headphone1'), category: '耳机' },
  { id: 'p02', name: '真无线蓝牙耳机 长续航版', price: 129, imageUrl: getImageUrl('p02', 'earbud1'), category: '耳机' },
  { id: 'p03', name: '便携蓝牙音箱 防水设计', price: 159, imageUrl: getImageUrl('p03', 'speaker1'), category: '音箱' },
  { id: 'p04', name: '头戴式游戏耳机 7.1 声道', price: 199, imageUrl: getImageUrl('p04', 'gaming1'), category: '耳机' },
  { id: 'p05', name: '运动防水骨传导耳机', price: 179, imageUrl: getImageUrl('p05', 'sport1'), category: '耳机' },
  { id: 'p06', name: '智能音箱 语音助手', price: 139, imageUrl: getImageUrl('p06', 'smart1'), category: '音箱' },
  // 智能手表/穿戴 150-400
  { id: 'p07', name: 'GPS 运动智能手表', price: 299, imageUrl: getImageUrl('p07', 'watch1'), category: '穿戴' },
  { id: 'p08', name: '健康监测手环 心率血氧', price: 119, imageUrl: getImageUrl('p08', 'band1'), category: '穿戴' },
  { id: 'p09', name: '户外三防太阳能手表', price: 349, imageUrl: getImageUrl('p09', 'watch2'), category: '穿戴' },
  { id: 'p10', name: '商务智能手表 大屏', price: 399, imageUrl: getImageUrl('p10', 'watch3'), category: '穿戴' },
  // 平板/阅读器 200-500
  { id: 'p11', name: '10 寸平板 高分辨率屏', price: 429, imageUrl: getImageUrl('p11', 'tablet1'), category: '平板' },
  { id: 'p12', name: '电子书阅读器 护眼屏', price: 249, imageUrl: getImageUrl('p12', 'ereader1'), category: '阅读器' },
  { id: 'p13', name: '便携平板 8 寸', price: 199, imageUrl: getImageUrl('p13', 'tablet2'), category: '平板' },
  { id: 'p14', name: '绘图平板 专业压感', price: 499, imageUrl: getImageUrl('p14', 'tablet3'), category: '平板' },
  // 显示器/外设 150-600
  { id: 'p15', name: '27 寸 2K 显示器', price: 399, imageUrl: getImageUrl('p15', 'monitor1'), category: '显示器' },
  { id: 'p16', name: '机械键盘 青轴 RGB', price: 149, imageUrl: getImageUrl('p16', 'keyboard1'), category: '外设' },
  { id: 'p17', name: '无线鼠标 人体工学', price: 89, imageUrl: getImageUrl('p17', 'mouse1'), category: '外设' },
  { id: 'p18', name: '4K 便携显示器 15.6 寸', price: 459, imageUrl: getImageUrl('p18', 'monitor2'), category: '显示器' },
  { id: 'p19', name: '高清网络摄像头 降噪麦克风', price: 129, imageUrl: getImageUrl('p19', 'webcam1'), category: '外设' },
  // 充电/储能 80-200
  { id: 'p20', name: '65W 多口快充充电器', price: 79, imageUrl: getImageUrl('p20', 'charger1'), category: '充电' },
  { id: 'p21', name: '20000mAh 移动电源', price: 99, imageUrl: getImageUrl('p21', 'powerbank1'), category: '充电' },
  { id: 'p22', name: 'MagSafe 无线充电座', price: 119, imageUrl: getImageUrl('p22', 'wireless1'), category: '充电' },
  // 智能家居 100-350
  { id: 'p23', name: '智能扫地机器人', price: 399, imageUrl: getImageUrl('p23', 'robot1'), category: '智能家居' },
  { id: 'p24', name: '智能门铃 可视对讲', price: 199, imageUrl: getImageUrl('p24', 'doorbell1'), category: '智能家居' },
  { id: 'p25', name: '智能音箱 Hub 家庭中心', price: 159, imageUrl: getImageUrl('p25', 'hub1'), category: '智能家居' },
  { id: 'p26', name: '空气净化器 除霾除甲醛', price: 349, imageUrl: getImageUrl('p26', 'purifier1'), category: '智能家居' },
  // 相机/摄影 300-800
  { id: 'p27', name: '运动相机 4K 防水', price: 399, imageUrl: getImageUrl('p27', 'action1'), category: '摄影' },
  { id: 'p28', name: '无人机 4K 航拍', price: 599, imageUrl: getImageUrl('p28', 'drone1'), category: '摄影' },
  { id: 'p29', name: '环形补光灯 主播专用', price: 129, imageUrl: getImageUrl('p29', 'light1'), category: '摄影' },
  { id: 'p30', name: '稳定器 手持云台', price: 279, imageUrl: getImageUrl('p30', 'gimbal1'), category: '摄影' },
  // 高端单品 500-1000
  { id: 'p31', name: '高端降噪头戴耳机', price: 549, imageUrl: getImageUrl('p31', 'premium1'), category: '耳机' },
  { id: 'p32', name: '32 寸 4K 专业显示器', price: 799, imageUrl: getImageUrl('p32', 'monitor3'), category: '显示器' },
  { id: 'p33', name: '高端服务套餐（牙齿美白/VIP 黑卡）', price: 1000, imageUrl: getImageUrl('p33', 'service1'), category: '服务' },
];
