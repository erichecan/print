'use client';

/**
 * Design Lab Client
 * [2025-11-11 15:54:12] Fabric.js + Zustand 前端编辑器骨架，实现桌面编辑与移动端快速编辑
 * [2025-01-27 20:00:00] 完全重新设计以100%匹配参考设计，包含所有模块、布局、颜色和功能
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // [2025-11-16 13:10:00] 使用 Next Image 优化缩略图
import { v4 as uuidv4 } from 'uuid';
import {
  authApi,
  designLabApi,
  templateApi,
  designCommentApi,
  productsApi,
  artAssetsApi,
  type DesignDraft,
  type DesignCanvasSnapshot,
  type DesignTemplate,
  type DesignComment,
} from '@/lib/api';
import { useDesignLabStore, type LayerInfo } from '@/contexts/designLabStore';

type ToolKey = 'upload' | 'text' | 'art' | 'templates' | 'products' | 'colors' | 'names' | 'printArea' | 'comments';

const AUTO_SAVE_DELAY = 1200;

const RECOMMENDED_PRODUCTS = [
  { id: '1', name: 'Gildan Softstyle Jersey T-shirt', color: 'Heather Dark Grey', action: 'Add another color', image: '/assets/categories/cat-tshirt.png' },
  { id: '2', name: "Gildan Women's Midweight Softstyle Jersey T-shirt", color: 'Blue', action: 'Add this product', image: '/assets/categories/cat-tshirt.png' },
  { id: '3', name: 'Gildan Midweight 50/50 Pullover Hoodie', color: 'Heather Dark Grey', action: 'Add this product', image: '/assets/categories/cat-sweatshirt.png' },
  { id: '4', name: 'Gildan Midweight 50/50 Crewneck Sweatshirt', color: 'Heather Dark Grey', action: 'Add this product', image: '/assets/categories/cat-sweatshirt.png' },
  { id: '5', name: 'Gildan Ultra Cotton Long Sleeve T-shirt', color: 'Heather Dark Grey', action: 'Add this product', image: '/assets/categories/cat-tshirt.png' },
  { id: '6', name: 'Gildan Softstyle Long Sleeve Jersey T-shirt', color: 'Heather Dark Grey', action: 'Add this product', image: '/assets/categories/cat-tshirt.png' },
  { id: '7', name: 'Gildan Softstyle Jersey V-Neck T-shirt', color: 'Heather Dark Grey', action: 'Add this product', image: '/assets/categories/cat-tshirt.png' },
  { id: '8', name: 'Gildan Youth Softstyle Jersey T-shirt', color: 'Heather Dark Grey', action: 'Add this product', image: '/assets/categories/cat-tshirt.png' },
  { id: '9', name: "Gildan Women's Slim Fit Softstyle Jersey T-shirt", color: 'Heather Dark Grey', action: 'Add this product', image: '/assets/categories/cat-tshirt.png' },
  { id: '10', name: 'Gildan Softstyle Eco Crewneck Sweatshirt', color: 'Heather Dark Grey', action: 'Add this product', image: '/assets/categories/cat-sweatshirt.png' },
  { id: '11', name: "Gildan Women's Slim Fit Softstyle V-Neck Jersey T-shirt", color: 'Heather Dark Grey', action: 'Add this product', image: '/assets/categories/cat-tshirt.png' },
  { id: '12', name: 'Gildan Youth Softstyle Jersey Blend T-shirt', color: 'Heather Dark Grey', action: 'Add this product', image: '/assets/categories/cat-tshirt.png' },
];

const PRODUCT_IMAGES = [
  '/assets/categories/cat-tshirt.png',
  '/assets/categories/cat-tshirt.png',
  '/assets/categories/cat-tshirt.png',
  '/assets/categories/cat-tshirt.png',
];

// [2025-11-20 22:30:00] Art Assets
// [2025-01-27 22:35:00] 扩展素材库，添加更多分类和素材
const ART_ASSETS: Record<string, string[]> = {
  'Emojis': ['😀', '😎', '😍', '🤔', '👍', '👎', '🔥', '⭐', '❤️', '🎉', '😂', '🥳', '🤩', '😇', '🤠', '👻', '👽', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊'],
  'Shapes & Symbols': ['★', '●', '■', '▲', '◆', '❤', '☁', '☀', '☾', '⚡', '❄️', '💧', '🔥', '✨', '🌈', '☂️', '🎈', '🎁', '🎀', '🎗️', '◉', '◎', '◐', '◑', '◒', '◓', '◔', '◕', '⬤', '⬥', '⬦', '⬧', '⬨', '⬩', '⬪', '⬫', '⬬', '⬭', '⬮', '⬯'],
  'Sports & Games': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🎮', '🎲', '🏆', '🎳', '🥊', '🥋', '⛳', '⛸️', '🎣', '🎯', '🪀', '🪁', '🧩', '🏓', '🏸', '🏒', '🏑', '🏏', '🥍', '🏹', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎵', '🎶', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻'],
  'Letters & Numbers': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '#', '&', '@', '!', '?', '$', '%', '+', '-', '=', '*', '(', ')', '[', ']', '{', '}', '<', '>', '/', '\\', '|', '~', '`', '^', '_'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈'],
  'Mascots': ['🦁', '🦅', '🦈', '🐺', '🐗', '🐴', '🦄', '🐲', '🦖', '🦕', '🦍', '🦏', '🦛', '🐘', '🦒', '🦓', '🦌', '🐂', '🐃', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🐪', '🐫', '🦘', '🦡', '🐀', '🐁', '🐿️', '🦔', '🦝', '🦨', '🦦', '🦥', '🦫', '🐾'],
  'Nature': ['🌲', '🌳', '🌴', '🌵', '🌷', '🌸', '🌹', '🌻', '🌼', '🍁', '🍂', '🍃', '🍄', '🌾', '🌿', '☘️', '🍀', '🎍', '🎋', '🍃', '🌱', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰', '🌰'],
  'America': ['🇺🇸', '🗽', '🦅', '🎆', '🌭', '🍔', '🍟', '⚾', '🏈', '🏀', '🥧', '🥤', '🍿', '🥓', '🥞', '🧇', '🥯', '🥨', '🥐', '🥖', '🎆', '🎇', '🎊', '🎉', '🎈', '🎁', '🎀', '🎗️', '🎟️', '🎫', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎵', '🎶', '🎼', '🎹'],
  'Food & Drink': ['🍕', '🍔', '🍟', '🌭', '🍿', '🥓', '🥚', '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥨', '🥯', '🥖', '🧀', '🥗', '🥙', '🥪', '🌮', '🌯', '🫔', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '🫖', '☕️', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'],
  'Travel': ['✈️', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚂', '🚆', '🚇', '🚊', '🚉', '🚞', '🚋', '🚃', '🚟', '🚠', '🚡', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉'],
  'Objects': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧴', '🧷', '🧹', '🧺', '🧻', '🧼', '🧽', '🧯', '🛒', '🚬'],
  'Clothing': ['👕', '👔', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '👛', '👜', '👝', '🛍️', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', '👑', '👒', '🎩', '🎓', '🧢', '🪖', '⛑️', '📿', '💄', '💍', '💎', '🔇', '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕'],
  'Activities': ['🎯', '🎲', '🎮', '🕹️', '🎰', '🎨', '🖼️', '🖌️', '🖍️', '✏️', '✒️', '🖊️', '🖋️', '🖍️', '📝', '💼', '📁', '📂', '🗂️', '📅', '📆', '🗒️', '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔏', '🔐', '🔑', '🗝️', '🔨', '🪓', '🪚', '🔧', '🪛', '🔩', '⚙️', '🪤', '🧰', '🧲', '🪜', '🛠️', '⚒️', '⛏️', '🪚', '🔫', '💣', '🧨', '🔪', '🗡️', '⚔️', '🛡️'],
};

const DesignLabClient = () => {
  // [2025-01-28 03:15:00] 组件函数开始执行 - 最早期的日志
  console.log('[Upload] ========================================');
  console.log('[Upload] ===== DesignLabClient FUNCTION CALLED =====');
  console.log('[Upload] Timestamp:', new Date().toISOString());
  console.log('[Upload] ========================================');
  
  // [2025-01-28 03:20:00] React Hooks 必须在组件顶层调用
  const router = useRouter();
  const params = useSearchParams();
  const paramsString = params?.toString() || '';
  const designIdParam = params?.get('designId');
  const variantIdParam = params?.get('variantId');
  
  console.log('[Upload] Component initialized, params:', {
    designIdParam,
    variantIdParam,
    paramsString,
    timestamp: new Date().toISOString()
  });

  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<any>(null);
  const fabricCanvasRef = useRef<any>(null);
  const applyingSnapshotRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialSyncRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const defaultVariantIdRef = useRef<string | null>(
    process.env.NEXT_PUBLIC_DESIGN_LAB_DEFAULT_VARIANT_ID || null
  );

  const { draft, canvas, mode, mobileLocked, layers, currentView, viewCanvases, history, future } = useDesignLabStore((state) => ({
    draft: state.draft,
    canvas: state.canvas,
    mode: state.mode,
    mobileLocked: state.mobileLocked,
    layers: state.layers,
    currentView: state.currentView, // [2025-01-27 21:00:00] 当前视图
    viewCanvases: state.viewCanvases, // [2025-01-27 21:00:00] 多视图画布
    history: state.history, // [2025-01-27 23:30:00] 历史记录
    future: state.future, // [2025-01-27 23:30:00] 未来记录
  }));
  const setDraft = useDesignLabStore((state) => state.setDraft);
  const patchDraft = useDesignLabStore((state) => state.patchDraft);
  const setCanvas = useDesignLabStore((state) => state.setCanvas);
  const setView = useDesignLabStore((state) => state.setView); // [2025-01-27 21:00:00] 切换视图
  const undo = useDesignLabStore((state) => state.undo);
  const redo = useDesignLabStore((state) => state.redo);
  const setMode = useDesignLabStore((state) => state.setMode);
  const setMobileLocked = useDesignLabStore((state) => state.setMobileLocked);
  const updateLayers = useDesignLabStore((state) => state.updateLayers);
  const toggleLayerVisibility = useDesignLabStore((state) => state.toggleLayerVisibility);
  const toggleLayerLock = useDesignLabStore((state) => state.toggleLayerLock);
  const bringToFront = useDesignLabStore((state) => state.bringToFront);
  const sendToBack = useDesignLabStore((state) => state.sendToBack);
  const moveLayer = useDesignLabStore((state) => state.moveLayer);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ unitPrice: number; quantity: number; total: number; currency: string } | null>(null);
  const [quantity, setQuantity] = useState(12);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeObjectId, setActiveObjectId] = useState<string | null>(null);
  const [designName, setDesignName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedTextObject, setSelectedTextObject] = useState<any>(null);
  const [showPrintArea, setShowPrintArea] = useState(true);
  // [2025-11-15 16:05:30] 5 区域布局新增：选中工具、指南面板、产品色和视图缩略图状态
  const [selectedTool, setSelectedTool] = useState<ToolKey>('upload');
  const [guideCollapsed, setGuideCollapsed] = useState(false);
  const [hasArtwork, setHasArtwork] = useState(false);
  const [selectedProductColor, setSelectedProductColor] = useState('navy');

  // [2025-01-27 21:05:00] 批量命名功能状态
  const [showBatchNames, setShowBatchNames] = useState(false);
  const [batchNames, setBatchNames] = useState('');
  const [exporting, setExporting] = useState(false);

  // [2025-01-27 21:05:00] 设计模板库状态
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string | null>(null);

  // [2025-01-27 21:55:00] 设计评论状态
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<DesignComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // [2025-01-27 20:00:00] 新增状态以匹配参考设计
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sizeFit: false,
    shipping: false,
    moreDetails: false,
    printAreas: false,
  });
  const [selectedView, setSelectedView] = useState<'front' | 'back' | 'sleeve' | 'zoom'>('front');
  const [productImageIndex, setProductImageIndex] = useState(0);

  // [2025-01-27 21:00:00] 模态框状态
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [textInput, setTextInput] = useState('Your Text');
  const [textFont, setTextFont] = useState('Arial');
  const [textColor, setTextColor] = useState('#FFFFFF'); // [2025-01-28] 默认白色文字
  const [textSize, setTextSize] = useState(48);
  const [textRotation, setTextRotation] = useState(0);
  const [showAddArtModal, setShowAddArtModal] = useState(false);
  const [selectedArtCategory, setSelectedArtCategory] = useState<string | null>(null); // [2025-11-20 22:30:00] Art category state
  const [artAssetsFromApi, setArtAssetsFromApi] = useState<Record<string, any[]>>({}); // [2025-01-28 01:20:00] Art assets from API
  const [loadingArtAssets, setLoadingArtAssets] = useState(false); // [2025-01-28 01:20:00] Loading state for art assets
  const [showProductColorsModal, setShowProductColorsModal] = useState(false);
  const [showAddNamesModal, setShowAddNamesModal] = useState(false);
  const [showNamesToolsModal, setShowNamesToolsModal] = useState(false);
  // [2025-12-02 执行 Custom Ink Plan] Names & Numbers 列表页状态
  const [showNamesListModal, setShowNamesListModal] = useState(false);
  const [namesNumbersList, setNamesNumbersList] = useState<Array<{ size: string; name?: string; number?: string }>>([]);

  // [2025-01-27 21:00:00] 添加文本状态（已在上面定义，移除重复）

  // [2025-01-27 21:00:00] 产品颜色选择状态
  const [selectedColor, setSelectedColor] = useState('Heather Dark Grey');
  const [orderFewerThan6, setOrderFewerThan6] = useState(false);

  // [2025-01-27 21:00:00] 名称和数字工具状态
  const [addNames, setAddNames] = useState(false);
  const [addNumbers, setAddNumbers] = useState(false);
  const [nameSide, setNameSide] = useState('Back');
  const [numberSide, setNumberSide] = useState('Back');
  const [nameHeight, setNameHeight] = useState('2 In');
  const [numberHeight, setNumberHeight] = useState('8 In');
  const [nameColor, setNameColor] = useState('Black');
  const [numberColor, setNumberColor] = useState('Black');

  // [2025-01-27 22:00:00] Get Price流程状态
  const [showDesignActionModal, setShowDesignActionModal] = useState(false);
  const [showOrderingOptionsModal, setShowOrderingOptionsModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showOrderOptionsPanel, setShowOrderOptionsPanel] = useState(false);
  const [designAction, setDesignAction] = useState<'buy-ship' | 'fundraiser'>('buy-ship');
  const [shippingOption, setShippingOption] = useState<'single' | 'multiple'>('single');
  const [sizesOption, setSizesOption] = useState<'know' | 'invite'>('know');
  const [paymentOption, setPaymentOption] = useState<'pay-all' | 'invite-pay'>('pay-all');
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({
    XS: 0, S: 0, M: 0, L: 0, XL: 0, '2XL': 0, '3XL': 0, '4XL': 0, '5XL': 0
  });
  const [showBuyMoreView, setShowBuyMoreView] = useState(false);

  // [2025-01-27 23:00:00] 图层编辑状态
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedImageObject, setSelectedImageObject] = useState<any>(null);

  // [2025-01-27 23:50:00] 批量操作状态
  const [selectedLayerIds, setSelectedLayerIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // [2025-01-27 23:45:00] Save & Add to Cart状态
  const [showSaveCartModal, setShowSaveCartModal] = useState(false);
  const [saveDesignName, setSaveDesignName] = useState('');
  const [saveEmail, setSaveEmail] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [zipCodeError, setZipCodeError] = useState(false);

  // [2025-01-27 23:45:00] 价格计算
  const [calculatedPrice, setCalculatedPrice] = useState(32.25);
  const [pricePerItem, setPricePerItem] = useState(32.25);

  // [2025-11-20 22:00:00] Dynamic Product Loading
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [currentVariant, setCurrentVariant] = useState<any>(null);

  // [2025-11-18 14:05:00] Hoist resolver before effects to avoid TDZ runtime errors
  const resolveDefaultVariantId = useCallback(async (): Promise<string | null> => {
    if (defaultVariantIdRef.current) {
      return defaultVariantIdRef.current;
    }
    const fallbackVariantIdFromEnv = process.env.NEXT_PUBLIC_DESIGN_LAB_DEFAULT_VARIANT_ID;
    if (fallbackVariantIdFromEnv) {
      defaultVariantIdRef.current = fallbackVariantIdFromEnv;
      return fallbackVariantIdFromEnv;
    }
    const fallbackProductSlug =
      process.env.NEXT_PUBLIC_DESIGN_LAB_DEFAULT_PRODUCT_SLUG || 'gildan-softstyle-jersey-tee';
    try {
      const product = await productsApi.getBySlug(fallbackProductSlug) as any;
      const variantId = product?.variants?.[0]?.id || null;
      if (variantId) {
        defaultVariantIdRef.current = variantId;
        return variantId;
      }
    } catch (resolveError) {
      console.error('[2025-11-15 16:22:10] resolveDefaultVariantId error:', resolveError);
      // Don't set error here to avoid blocking the UI if we can fallback to hardcoded defaults
    }
    return null;
  }, []);

  // [2025-11-21 11:00:00] 从 API 获取产品详情并显示主图
  useEffect(() => {
    const fetchProductDetails = async () => {
      let targetVariantId = variantIdParam;

      if (!targetVariantId) {
        // Try to get default variant ID
        targetVariantId = await resolveDefaultVariantId();
      }

      if (!targetVariantId) {
        // Fallback to a hardcoded default if everything fails, so the page doesn't crash or show empty
        setCurrentProduct({
          id: 'default-product',
          name: 'Gildan Softstyle Jersey T-shirt',
          image: '/assets/categories/cat-tshirt.png'
        });
        setCurrentVariant({
          id: 'default-variant',
          color: 'Heather Dark Grey',
          image: '/assets/categories/cat-tshirt.png',
          baseImages: { front: '/assets/categories/cat-tshirt.png' },
          gallery: ['/assets/categories/cat-tshirt.png']
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // [2025-11-21 11:00:00] 调用 API 获取真实的产品数据
        const productData = await productsApi.getByVariant(targetVariantId);

        setCurrentProduct({
          id: productData.productId,
          name: productData.productName,
          image: productData.baseImages.front || productData.gallery[0] || '/assets/categories/cat-tshirt.png'
        });

        const productImage = productData.baseImages.front || productData.gallery[0] || '/assets/categories/cat-tshirt.png';
        console.log('[Design Lab] Product data loaded:', {
          productId: productData.productId,
          variantId: productData.variantId,
          imageUrl: productImage,
          baseImages: productData.baseImages,
          gallery: productData.gallery
        });

        setCurrentVariant({
          id: productData.variantId,
          color: productData.color || 'White',
          image: productImage,
          baseImages: productData.baseImages,
          gallery: productData.gallery
        });

        // [2025-11-21 11:00:00] 更新产品颜色选择器
        if (productData.color) {
          setSelectedProductColor(productData.color);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch product details:', err);
        // setError(err.message || 'Failed to load product details'); // Don't block UI
        // [2025-11-21 11:00:00] 失败时使用默认图片
        setCurrentVariant({
          id: targetVariantId,
          color: 'White',
          image: '/assets/categories/cat-tshirt.png'
        });
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [variantIdParam, resolveDefaultVariantId]);

  // [2025-01-28 01:20:00] 从 API 获取素材
  useEffect(() => {
    const fetchArtAssets = async () => {
      try {
        console.log('[Design Lab] ===== Fetching art assets from API =====');
        setLoadingArtAssets(true);
        const response = await artAssetsApi.getAll();
        console.log('[Design Lab] API Response:', {
          success: response.success,
          hasData: !!response.data,
          categories: response.categories,
          dataKeys: response.data ? Object.keys(response.data) : [],
          fullResponse: response
        });
        
        if (response.success && response.data) {
          // [2025-01-28 03:00:00] 详细记录每个分类的素材
          Object.keys(response.data).forEach((category) => {
            console.log(`[Design Lab] Category "${category}":`, {
              count: response.data[category].length,
              assets: response.data[category].map((a: any) => ({
                id: a.id,
                name: a.name,
                imageUrl: a.imageUrl,
                thumbnailUrl: a.thumbnailUrl
              }))
            });
          });
          
          setArtAssetsFromApi(response.data);
          console.log('[Design Lab] ✅ Art assets loaded from API:', {
            categories: response.categories,
            totalCategories: Object.keys(response.data).length,
            totalAssets: Object.values(response.data).reduce((sum: number, arr: any) => sum + arr.length, 0)
          });
        } else {
          console.warn('[Design Lab] ⚠️ API response missing data:', response);
        }
      } catch (err: any) {
        console.error('[Design Lab] ❌ Failed to load art assets from API:', err);
        console.error('[Design Lab] Error details:', {
          message: err.message,
          stack: err.stack
        });
        // 失败时继续使用硬编码的素材
      } finally {
        setLoadingArtAssets(false);
      }
    };

    fetchArtAssets();
  }, []);

  // [2025-01-28 01:20:00] 合并硬编码的 emoji 素材和 API 返回的图片素材
  const mergedArtAssets = useMemo(() => {
    console.log('[Design Lab] ===== Merging art assets =====');
    console.log('[Design Lab] API categories:', Object.keys(artAssetsFromApi));
    console.log('[Design Lab] Hardcoded categories:', Object.keys(ART_ASSETS));
    
    const merged: Record<string, Array<{ type: 'emoji' | 'image'; content: string; id?: string; imageUrl?: string }>> = {};
    
    // 先添加硬编码的 emoji 素材
    Object.keys(ART_ASSETS).forEach((category) => {
      merged[category] = ART_ASSETS[category].map((emoji) => ({
        type: 'emoji' as const,
        content: emoji
      }));
    });

    // 然后添加 API 返回的图片素材
    Object.keys(artAssetsFromApi).forEach((category) => {
      console.log(`[Design Lab] Processing API category "${category}":`, {
        assetsCount: artAssetsFromApi[category].length,
        categoryExists: !!merged[category]
      });
      
      if (!merged[category]) {
        merged[category] = [];
        console.log(`[Design Lab] Created new category "${category}"`);
      }
      
      artAssetsFromApi[category].forEach((asset: any) => {
        const imageUrl = asset.imageUrl || asset.thumbnailUrl || asset.image_url;
        console.log(`[Design Lab] Adding asset to "${category}":`, {
          id: asset.id,
          name: asset.name,
          imageUrl: imageUrl
        });
        
        merged[category].push({
          type: 'image' as const,
          content: asset.name,
          id: asset.id,
          imageUrl: imageUrl
        });
      });
    });

    console.log('[Design Lab] ✅ Merged art assets:', {
      totalCategories: Object.keys(merged).length,
      categoryCounts: Object.keys(merged).map(cat => ({
        category: cat,
        count: merged[cat].length,
        emojiCount: merged[cat].filter(a => a.type === 'emoji').length,
        imageCount: merged[cat].filter(a => a.type === 'image').length
      }))
    });

    return merged;
  }, [artAssetsFromApi]);

  // [2025-11-15 16:06:02] 视图缩略图、产品配色、预设素材与推荐产品数据
  const viewOptions = useMemo(
    () => [
      { key: 'front' as const, label: '正面', thumbnail: '/assets/hero/hero-card-tee.jpg' },
      { key: 'back' as const, label: '背面', thumbnail: '/assets/hero/hero-card-bag.jpg' },
      { key: 'sleeve' as const, label: '袖口', thumbnail: '/assets/hero/hero-card-hat.jpg' },
      { key: 'zoom' as const, label: '细节', thumbnail: '/assets/hero/hero-card-bottle.jpg' },
    ],
    []
  );

  const productColors = useMemo(
    () => [
      { key: 'navy', label: '海军蓝', swatch: '#0f172a' },
      { key: 'black', label: '黑色', swatch: '#111827' },
      { key: 'heather', label: 'Heather', swatch: '#94a3b8' },
      { key: 'sunset', label: '暮光橙', swatch: '#f97316' },
      { key: 'forest', label: '森林绿', swatch: '#065f46' },
    ],
    []
  );

  const artPresets = useMemo(
    () => [
      {
        id: 'badge',
        label: 'Heritage Badge',
        type: 'image' as const,
        src: '/assets/hero/hero-hats.jpg',
      },
      {
        id: 'sunburst',
        label: 'Sunburst',
        type: 'shape' as const,
        shape: 'star',
        fill: '#facc15',
      },
      {
        id: 'stripe',
        label: 'Stripes',
        type: 'shape' as const,
        shape: 'rect',
        fill: '#38bdf8',
      },
      {
        id: 'badge-2',
        label: 'Monogram',
        type: 'text' as const,
        text: 'SP',
      },
    ],
    []
  );

  const recommendations = useMemo(
    () => [
      {
        id: 'rec-hoodie',
        title: 'Gildan Midweight Hoodie',
        description: '经典 50/50 抓绒，适合团建发放。',
        image: '/assets/categories/cat-sweatshirt.png',
      },
      {
        id: 'rec-tee',
        title: 'Softstyle Jersey Tee',
        description: '最低 MOQ 12 件，支持混色。',
        image: '/assets/categories/cat-tshirt.png',
      },
      {
        id: 'rec-hat',
        title: 'Structured Trucker Hat',
        description: '刺绣工艺，提供预设色板。',
        image: '/assets/categories/cat-hat.png',
      },
      {
        id: 'rec-bottle',
        title: 'Vacuum Bottle',
        description: '双层不锈钢，礼品场景佳选。',
        image: '/assets/categories/cat-drinkware.png',
      },
    ],
    []
  );

  const guideActions = useMemo(
    () => [
      { key: 'upload' as ToolKey, label: 'Upload', description: '拖拽或选择 AI、PDF、PNG', icon: '⬆️' },
      { key: 'text' as ToolKey, label: 'Add Text', description: '输入标语 / 名称', icon: '🔤' },
      { key: 'art' as ToolKey, label: 'Add Art', description: '使用预设图形或图案', icon: '🎨' },
      { key: 'products' as ToolKey, label: 'Change Product', description: '切换品类或颜色', icon: '🧢' },
    ],
    []
  );
  const printAreaRef = useRef<any>(null);
  const safeAreaRef = useRef<any>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  // [2025-01-27 21:25:00] currentView 现在从 store 获取，不需要本地 state
  // const [currentView, setCurrentView] = useState<'front' | 'back' | 'sleeve' | 'zoom'>('front');

  const ensureFabric = useCallback(async () => {
    if (fabricRef.current) {
      return fabricRef.current;
    }
    const fabricModule = await import('fabric');
    const fabric = fabricModule.default || fabricModule;
    fabricRef.current = fabric;
    return fabric;
  }, []);

  const ensureObjectIds = useCallback(() => {
    const canvasInstance = fabricCanvasRef.current;
    if (!canvasInstance) {
      return;
    }
    canvasInstance.getObjects().forEach((obj: any) => {
      const fabricObject = obj as unknown as { id?: string };
      if (!fabricObject.id) {
        fabricObject.id = uuidv4();
      }
    });
  }, []);

  const applySnapshotToCanvas = useCallback(
    async (snapshot: DesignCanvasSnapshot) => {
      const fabric = await ensureFabric();
      const element = canvasElementRef.current;
      if (!element) {
        return;
      }

      if (!fabricCanvasRef.current) {
        fabricCanvasRef.current = new fabric.Canvas(element, {
          preserveObjectStacking: true,
          selection: true,
          backgroundColor: 'transparent', // [2025-11-21 11:15:00] 确保画布背景透明，不遮挡产品图片
        });
      }

      const canvasInstance = fabricCanvasRef.current;

      applyingSnapshotRef.current = true;
      canvasInstance.loadFromJSON(
        snapshot,
        () => {
          ensureObjectIds();
          canvasInstance.renderAll();
          applyingSnapshotRef.current = false;
        },
        (o: any, object: any) => {
          if (object) {
            const castObject = object as unknown as { id?: string };
            if (!castObject.id) {
              castObject.id = uuidv4();
            }
          }
        }
      );

      if (snapshot.size) {
        element.width = snapshot.size.width;
        element.height = snapshot.size.height;
        canvasInstance.setWidth(snapshot.size.width);
        canvasInstance.setHeight(snapshot.size.height);
      }
    },
    [ensureFabric, ensureObjectIds]
  );

  // [2025-01-27 15:40:00] Update layers list from canvas objects
  const updateLayersFromCanvas = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const objects = fabricCanvasRef.current.getObjects();
    const layerInfos: LayerInfo[] = objects.map((obj: any, index: number) => {
      const id = obj.id || uuidv4();
      if (!obj.id) obj.id = id;

      let name = '未命名';
      let type: LayerInfo['type'] = 'rect';

      if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
        type = obj.type === 'textbox' ? 'textbox' : obj.type === 'i-text' ? 'i-text' : 'text';
        name = (obj.text || obj.text || '文字').substring(0, 20);
      } else if (obj.type === 'image') {
        type = 'image';
        name = '图片';
      } else if (obj.type === 'group') {
        type = 'group';
        name = 'Group';
      } else {
        type = obj.type as LayerInfo['type'];
        name = obj.type || '对象';
      }

      return {
        id,
        type,
        name,
        visible: obj.visible !== false,
        locked: obj.selectable === false || obj.evented === false,
        zIndex: index,
      };
    });

    // Reverse to show top layer first (like Custom Ink)
    updateLayers(layerInfos.reverse());
  }, [updateLayers]);

  const handleCanvasChange = useCallback(() => {
    if (!fabricCanvasRef.current || applyingSnapshotRef.current) {
      return;
    }
    const snapshot = fabricCanvasRef.current.toJSON(['id']);
    setCanvas(snapshot, { pushHistory: true });
    updateLayersFromCanvas();
  }, [setCanvas, updateLayersFromCanvas]);

  const handleSelectionChange = useCallback(() => {
    const selected = fabricCanvasRef.current?.getActiveObject() as (Record<string, any> & { id?: string }) | undefined;
    if (selected?.id) {
      setActiveObjectId(selected.id);
      setShowEditPanel(true);
      // [2025-01-27 15:50:00] Check if selected object is a text object
      if (selected.type === 'textbox' || selected.type === 'i-text' || selected.type === 'text') {
        setSelectedTextObject(selected);
        setSelectedImageObject(null);
      } else if (selected.type === 'image') {
        setSelectedImageObject(selected);
        setSelectedTextObject(null);
      } else if (selected.type === 'group') {
        // [2025-01-27 23:50:00] 组对象不显示编辑面板，但保持选中状态
        setSelectedTextObject(null);
        setSelectedImageObject(null);
        setShowEditPanel(false);
      } else {
        setSelectedTextObject(null);
        setSelectedImageObject(null);
      }
    } else {
      setActiveObjectId(null);
      setSelectedTextObject(null);
      setSelectedImageObject(null);
      setShowEditPanel(false);
    }
  }, []);


  // [2025-01-27 15:40:00] Handle layer selection
  const handleLayerSelect = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        fabricCanvasRef.current.setActiveObject(obj);
        fabricCanvasRef.current.renderAll();
        setActiveObjectId(layerId);
      }
    },
    []
  );

  // [2025-01-27 15:40:00] Handle layer visibility toggle
  const handleLayerVisibilityToggle = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        obj.visible = !obj.visible;
        fabricCanvasRef.current.renderAll();
        toggleLayerVisibility(layerId);
        handleCanvasChange();
      }
    },
    [toggleLayerVisibility, handleCanvasChange]
  );

  // [2025-01-27 15:40:00] Handle layer lock toggle
  const handleLayerLockToggle = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        obj.selectable = obj.selectable === false;
        obj.evented = obj.evented === false;
        if (obj.selectable === false) {
          fabricCanvasRef.current.discardActiveObject();
        }
        fabricCanvasRef.current.renderAll();
        toggleLayerLock(layerId);
        handleCanvasChange();
      }
    },
    [toggleLayerLock, handleCanvasChange]
  );

  // [2025-01-27 15:40:00] Handle bring to front
  const handleBringToFront = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        fabricCanvasRef.current.bringToFront(obj);
        fabricCanvasRef.current.renderAll();
        bringToFront(layerId);
        updateLayersFromCanvas();
        handleCanvasChange();
      }
    },
    [bringToFront, updateLayersFromCanvas, handleCanvasChange]
  );

  // [2025-01-27 15:40:00] Handle send to back
  const handleSendToBack = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        fabricCanvasRef.current.sendToBack(obj);
        fabricCanvasRef.current.renderAll();
        sendToBack(layerId);
        updateLayersFromCanvas();
        handleCanvasChange();
      }
    },
    [sendToBack, updateLayersFromCanvas, handleCanvasChange]
  );

  // [2025-12-02 执行 Custom Ink Plan] Center object to canvas
  const handleCenterObject = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (!activeObj) return;

    const canvas = fabricCanvasRef.current;
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    // Center the object
    activeObj.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: 'center',
      originY: 'center',
    });

    canvas.renderAll();
    handleCanvasChange();
    updateLayersFromCanvas();
  }, [handleCanvasChange, updateLayersFromCanvas]);

  // [2025-12-02 执行 Custom Ink Plan] Bring active object to front
  const handleBringActiveToFront = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (!activeObj || !activeObj.id) return;

    fabricCanvasRef.current.bringToFront(activeObj);
    fabricCanvasRef.current.renderAll();
    bringToFront(activeObj.id);
    updateLayersFromCanvas();
    handleCanvasChange();
  }, [bringToFront, updateLayersFromCanvas, handleCanvasChange]);

  // [2025-12-02 执行 Custom Ink Plan] Send active object to back
  const handleSendActiveToBack = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (!activeObj || !activeObj.id) return;

    fabricCanvasRef.current.sendToBack(activeObj);
    fabricCanvasRef.current.renderAll();
    sendToBack(activeObj.id);
    updateLayersFromCanvas();
    handleCanvasChange();
  }, [sendToBack, updateLayersFromCanvas, handleCanvasChange]);

  // [2025-12-02 执行 Custom Ink Plan] Convert pixels to inches (assuming 150 DPI)
  const pixelsToInches = useCallback((pixels: number, dpi: number = 150): number => {
    return pixels / dpi;
  }, []);

  // [2025-12-02 执行 Custom Ink Plan] Convert inches to pixels
  const inchesToPixels = useCallback((inches: number, dpi: number = 150): number => {
    return inches * dpi;
  }, []);

  // [2025-01-27 15:50:00] Advanced text tools handlers
  const handleTextFontSizeChange = useCallback(
    (fontSize: number) => {
      if (!fabricCanvasRef.current || !selectedTextObject) return;
      selectedTextObject.set('fontSize', fontSize);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedTextObject({ ...selectedTextObject, fontSize });
    },
    [selectedTextObject, handleCanvasChange]
  );

  const handleTextBoldToggle = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedTextObject) return;
    const currentWeight = selectedTextObject.fontWeight || 'normal';
    const newWeight = currentWeight === 'bold' ? 'normal' : 'bold';
    selectedTextObject.set('fontWeight', newWeight);
    fabricCanvasRef.current.renderAll();
    handleCanvasChange();
    setSelectedTextObject({ ...selectedTextObject, fontWeight: newWeight });
  }, [selectedTextObject, handleCanvasChange]);

  const handleTextItalicToggle = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedTextObject) return;
    const currentStyle = selectedTextObject.fontStyle || 'normal';
    const newStyle = currentStyle === 'italic' ? 'normal' : 'italic';
    selectedTextObject.set('fontStyle', newStyle);
    fabricCanvasRef.current.renderAll();
    handleCanvasChange();
    setSelectedTextObject({ ...selectedTextObject, fontStyle: newStyle });
  }, [selectedTextObject, handleCanvasChange]);

  const handleTextUnderlineToggle = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedTextObject) return;
    const currentUnderline = selectedTextObject.underline || false;
    selectedTextObject.set('underline', !currentUnderline);
    fabricCanvasRef.current.renderAll();
    handleCanvasChange();
    setSelectedTextObject({ ...selectedTextObject, underline: !currentUnderline });
  }, [selectedTextObject, handleCanvasChange]);

  const handleTextAlign = useCallback(
    (align: 'left' | 'center' | 'right' | 'justify') => {
      if (!fabricCanvasRef.current || !selectedTextObject) return;
      selectedTextObject.set('textAlign', align);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedTextObject({ ...selectedTextObject, textAlign: align });
    },
    [selectedTextObject, handleCanvasChange]
  );

  const handleTextColorChange = useCallback(
    (color: string) => {
      if (!fabricCanvasRef.current || !selectedTextObject) return;
      selectedTextObject.set('fill', color);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedTextObject({ ...selectedTextObject, fill: color });
    },
    [selectedTextObject, handleCanvasChange]
  );

  // [2025-01-27 23:00:00] 文本编辑功能
  const handleTextChange = useCallback(
    (text: string) => {
      if (!fabricCanvasRef.current || !selectedTextObject) return;
      selectedTextObject.set('text', text);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedTextObject({ ...selectedTextObject, text });
    },
    [selectedTextObject, handleCanvasChange]
  );

  const handleTextFontChange = useCallback(
    (fontFamily: string) => {
      if (!fabricCanvasRef.current || !selectedTextObject) return;
      selectedTextObject.set('fontFamily', fontFamily);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedTextObject({ ...selectedTextObject, fontFamily });
    },
    [selectedTextObject, handleCanvasChange]
  );

  const handleTextRotationChange = useCallback(
    (angle: number) => {
      if (!fabricCanvasRef.current || !selectedTextObject) return;
      selectedTextObject.set('angle', angle);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedTextObject({ ...selectedTextObject, angle });
    },
    [selectedTextObject, handleCanvasChange]
  );

  const handleTextSizeChange = useCallback(
    (size: number) => {
      if (!fabricCanvasRef.current || !selectedTextObject) return;
      selectedTextObject.set('fontSize', size);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedTextObject({ ...selectedTextObject, fontSize: size });
    },
    [selectedTextObject, handleCanvasChange]
  );

  // [2025-01-27 23:00:00] 对象操作功能
  const handleDuplicateObject = useCallback(() => {
    if (!fabricCanvasRef.current || !activeObjectId) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (!activeObj) return;

    activeObj.clone((cloned: any) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });
      cloned.id = uuidv4();
      fabricCanvasRef.current?.add(cloned);
      fabricCanvasRef.current?.setActiveObject(cloned);
      fabricCanvasRef.current?.renderAll();
      handleCanvasChange();
    });
  }, [activeObjectId, handleCanvasChange]);

  const handleDeleteObject = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (activeObj) {
      fabricCanvasRef.current.remove(activeObj);
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setShowEditPanel(false);
    }
  }, [handleCanvasChange]);

  // [2025-01-27 23:00:00] 图片编辑功能
  const handleImageOpacityChange = useCallback(
    (opacity: number) => {
      if (!fabricCanvasRef.current || !selectedImageObject) return;
      selectedImageObject.set('opacity', opacity / 100);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedImageObject({ ...selectedImageObject, opacity: opacity / 100 });
    },
    [selectedImageObject, handleCanvasChange]
  );

  const handleImageRotationChange = useCallback(
    (angle: number) => {
      if (!fabricCanvasRef.current || !selectedImageObject) return;
      selectedImageObject.set('angle', angle);
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      setSelectedImageObject({ ...selectedImageObject, angle });
    },
    [selectedImageObject, handleCanvasChange]
  );

  // [2025-01-27 23:30:00] 导出功能
  const handleExportCanvas = useCallback(
    async (format: 'png' | 'jpg' | 'svg') => {
      if (!fabricCanvasRef.current) return;

      try {
        setExporting(true);
        const canvasInstance = fabricCanvasRef.current;

        // 隐藏打印区域等辅助元素
        const objects = canvasInstance.getObjects();
        const hiddenObjects: any[] = [];
        objects.forEach((obj: any) => {
          if (obj.name === 'print-area' || obj.name === 'safe-area') {
            obj.visible = false;
            hiddenObjects.push(obj);
          }
        });
        canvasInstance.renderAll();

        let dataUrl: string;
        if (format === 'svg') {
          dataUrl = canvasInstance.toSVG();
        } else {
          dataUrl = canvasInstance.toDataURL({
            format: format === 'jpg' ? 'jpeg' : 'png',
            quality: 1,
            multiplier: 2, // 2x resolution for better quality
          });
        }

        // 恢复辅助元素
        hiddenObjects.forEach((obj: any) => {
          obj.visible = true;
        });
        canvasInstance.renderAll();

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `design-${Date.now()}.${format}`;
        if (format === 'svg') {
          const blob = new Blob([dataUrl], { type: 'image/svg+xml' });
          link.href = URL.createObjectURL(blob);
        } else {
          link.href = dataUrl;
        }
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (err: any) {
        setError(err.message || '导出失败');
      } finally {
        setExporting(false);
      }
    },
    []
  );

  // [2025-01-27 23:30:00] 对齐和分布功能
  const handleAlignObjects = useCallback(
    (alignType: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (!fabricCanvasRef.current) return;
      const activeObj = fabricCanvasRef.current.getActiveObject();
      if (!activeObj) return;

      const objects = activeObj.type === 'activeSelection'
        ? (activeObj as any)._objects
        : [activeObj];

      if (objects.length < 2) return;

      let targetValue: number;
      const bounds = activeObj.getBoundingRect();

      switch (alignType) {
        case 'left':
          targetValue = bounds.left;
          objects.forEach((obj: any) => {
            obj.set('left', targetValue);
          });
          break;
        case 'center':
          targetValue = bounds.left + bounds.width / 2;
          objects.forEach((obj: any) => {
            obj.set('left', targetValue - (obj.width * obj.scaleX) / 2);
          });
          break;
        case 'right':
          targetValue = bounds.left + bounds.width;
          objects.forEach((obj: any) => {
            obj.set('left', targetValue - obj.width * obj.scaleX);
          });
          break;
        case 'top':
          targetValue = bounds.top;
          objects.forEach((obj: any) => {
            obj.set('top', targetValue);
          });
          break;
        case 'middle':
          targetValue = bounds.top + bounds.height / 2;
          objects.forEach((obj: any) => {
            obj.set('top', targetValue - (obj.height * obj.scaleY) / 2);
          });
          break;
        case 'bottom':
          targetValue = bounds.top + bounds.height;
          objects.forEach((obj: any) => {
            obj.set('top', targetValue - obj.height * obj.scaleY);
          });
          break;
      }

      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
    },
    [handleCanvasChange]
  );

  // [2025-01-27 23:30:00] 分布功能
  const handleDistributeObjects = useCallback(
    (distributeType: 'horizontal' | 'vertical') => {
      if (!fabricCanvasRef.current) return;
      const activeObj = fabricCanvasRef.current.getActiveObject();
      if (!activeObj || activeObj.type !== 'activeSelection') return;

      const objects = (activeObj as any)._objects;
      if (objects.length < 3) return;

      if (distributeType === 'horizontal') {
        objects.sort((a: any, b: any) => a.left - b.left);
        const first = objects[0];
        const last = objects[objects.length - 1];
        const totalGap = last.left - first.left;
        const gap = totalGap / (objects.length - 1);

        objects.forEach((obj: any, index: number) => {
          if (index > 0 && index < objects.length - 1) {
            obj.set('left', first.left + gap * index);
          }
        });
      } else {
        objects.sort((a: any, b: any) => a.top - b.top);
        const first = objects[0];
        const last = objects[objects.length - 1];
        const totalGap = last.top - first.top;
        const gap = totalGap / (objects.length - 1);

        objects.forEach((obj: any, index: number) => {
          if (index > 0 && index < objects.length - 1) {
            obj.set('top', first.top + gap * index);
          }
        });
      }

      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
    },
    [handleCanvasChange]
  );

  // [2025-01-27 23:30:00] 图层顺序调整（上移一层、下移一层）
  const handleMoveLayerUp = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (!obj) return;

      const objects = fabricCanvasRef.current.getObjects();
      const currentIndex = objects.indexOf(obj);
      if (currentIndex < objects.length - 1) {
        fabricCanvasRef.current.bringForward(obj);
        fabricCanvasRef.current.renderAll();
        updateLayersFromCanvas();
        handleCanvasChange();
      }
    },
    [updateLayersFromCanvas, handleCanvasChange]
  );

  const handleMoveLayerDown = useCallback(
    (layerId: string) => {
      if (!fabricCanvasRef.current) return;
      const obj = fabricCanvasRef.current.getObjects().find((o: any) => o.id === layerId);
      if (!obj) return;

      const objects = fabricCanvasRef.current.getObjects();
      const currentIndex = objects.indexOf(obj);
      if (currentIndex > 0) {
        fabricCanvasRef.current.sendBackwards(obj);
        fabricCanvasRef.current.renderAll();
        updateLayersFromCanvas();
        handleCanvasChange();
      }
    },
    [updateLayersFromCanvas, handleCanvasChange]
  );

  // [2025-01-27 23:50:00] 批量操作功能
  const handleLayerMultiSelect = useCallback(
    (layerId: string, event: React.MouseEvent) => {
      if (event.ctrlKey || event.metaKey || isMultiSelectMode) {
        setSelectedLayerIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(layerId)) {
            newSet.delete(layerId);
          } else {
            newSet.add(layerId);
          }
          return newSet;
        });
      } else {
        setSelectedLayerIds(new Set([layerId]));
        handleLayerSelect(layerId);
      }
    },
    [isMultiSelectMode, handleLayerSelect]
  );

  const handleBatchDelete = useCallback(() => {
    if (!fabricCanvasRef.current || selectedLayerIds.size === 0) return;

    selectedLayerIds.forEach(layerId => {
      const obj = fabricCanvasRef.current?.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        fabricCanvasRef.current?.remove(obj);
      }
    });

    fabricCanvasRef.current?.discardActiveObject();
    fabricCanvasRef.current?.renderAll();
    setSelectedLayerIds(new Set());
    handleCanvasChange();
    updateLayersFromCanvas();
  }, [selectedLayerIds, handleCanvasChange, updateLayersFromCanvas]);

  const handleBatchLock = useCallback(() => {
    if (!fabricCanvasRef.current || selectedLayerIds.size === 0) return;

    const allLocked = Array.from(selectedLayerIds).every(layerId => {
      const layer = layers.find(l => l.id === layerId);
      return layer?.locked;
    });

    selectedLayerIds.forEach(layerId => {
      const obj = fabricCanvasRef.current?.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        obj.selectable = allLocked;
        obj.evented = allLocked;
        toggleLayerLock(layerId);
      }
    });

    fabricCanvasRef.current?.renderAll();
    handleCanvasChange();
    updateLayersFromCanvas();
  }, [selectedLayerIds, layers, toggleLayerLock, handleCanvasChange, updateLayersFromCanvas]);

  const handleBatchVisibility = useCallback(() => {
    if (!fabricCanvasRef.current || selectedLayerIds.size === 0) return;

    const allVisible = Array.from(selectedLayerIds).every(layerId => {
      const layer = layers.find(l => l.id === layerId);
      return layer?.visible;
    });

    selectedLayerIds.forEach(layerId => {
      const obj = fabricCanvasRef.current?.getObjects().find((o: any) => o.id === layerId);
      if (obj) {
        obj.visible = !allVisible;
        toggleLayerVisibility(layerId);
      }
    });

    fabricCanvasRef.current?.renderAll();
    handleCanvasChange();
    updateLayersFromCanvas();
  }, [selectedLayerIds, layers, toggleLayerVisibility, handleCanvasChange, updateLayersFromCanvas]);

  // [2025-01-27 23:50:00] 图层分组功能
  const handleCreateGroup = useCallback(async () => {
    if (!fabricCanvasRef.current || selectedLayerIds.size < 2) return;

    const fabric = await ensureFabric();
    const objects = Array.from(selectedLayerIds)
      .map(layerId => fabricCanvasRef.current?.getObjects().find((o: any) => o.id === layerId))
      .filter(Boolean);

    if (objects.length < 2) return;

    const group = new fabric.Group(objects as any[], {
      id: uuidv4(),
    });

    // 移除原对象
    objects.forEach(obj => fabricCanvasRef.current?.remove(obj));

    // 添加组
    fabricCanvasRef.current?.add(group);
    fabricCanvasRef.current?.setActiveObject(group);
    fabricCanvasRef.current?.renderAll();

    setSelectedLayerIds(new Set());
    handleCanvasChange();
    updateLayersFromCanvas();
  }, [selectedLayerIds, ensureFabric, handleCanvasChange, updateLayersFromCanvas]);

  const handleUngroup = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObj = fabricCanvasRef.current.getActiveObject();

    if (activeObj && activeObj.type === 'group') {
      const group = activeObj as any;
      const objects = group.getObjects();

      // 移除组
      fabricCanvasRef.current.remove(group);

      // 添加回原对象
      objects.forEach((obj: any) => {
        obj.setCoords();
        fabricCanvasRef.current?.add(obj);
      });

      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
      updateLayersFromCanvas();
    }
  }, [handleCanvasChange, updateLayersFromCanvas]);

  const sendObjectToCanvasBack = useCallback((canvasInstance: any, obj: any) => {
    if (!canvasInstance || !obj) return;
    if (typeof canvasInstance.sendToBack === 'function') {
      canvasInstance.sendToBack(obj);
    } else if (typeof canvasInstance.moveTo === 'function') {
      canvasInstance.moveTo(obj, 0);
    }
  }, []);

  // [2025-01-27 16:00:00] Initialize print area visualization
  const initializePrintArea = useCallback(async (fabric: any, canvasInstance: any) => {
    if (!canvasInstance) return;

    const canvasWidth = canvas?.size?.width || 500;
    const canvasHeight = canvas?.size?.height || 600;

    // Print area: 80% of canvas (centered)
    const printAreaWidth = canvasWidth * 0.8;
    const printAreaHeight = canvasHeight * 0.8;
    const printAreaLeft = (canvasWidth - printAreaWidth) / 2;
    const printAreaTop = (canvasHeight - printAreaHeight) / 2;

    // Safe area: 90% of print area (centered within print area)
    const safeAreaWidth = printAreaWidth * 0.9;
    const safeAreaHeight = printAreaHeight * 0.9;
    const safeAreaLeft = printAreaLeft + (printAreaWidth - safeAreaWidth) / 2;
    const safeAreaTop = printAreaTop + (printAreaHeight - safeAreaHeight) / 2;

    // Create print area rectangle (dashed border)
    if (!printAreaRef.current) {
      const printAreaRect = new fabric.Rect({
        left: printAreaLeft,
        top: printAreaTop,
        width: printAreaWidth,
        height: printAreaHeight,
        fill: 'transparent',
        stroke: '#ff1f3d',
        strokeWidth: 2,
        strokeDashArray: [10, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'print-area',
      });
      printAreaRef.current = printAreaRect;
      canvasInstance.add(printAreaRect);
      sendObjectToCanvasBack(canvasInstance, printAreaRect);
    }

    // Create safe area rectangle (dotted border)
    if (!safeAreaRef.current) {
      const safeAreaRect = new fabric.Rect({
        left: safeAreaLeft,
        top: safeAreaTop,
        width: safeAreaWidth,
        height: safeAreaHeight,
        fill: 'transparent',
        stroke: '#ff1f3d',
        strokeWidth: 1,
        strokeDashArray: [3, 3],
        strokeOpacity: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'safe-area',
      });
      safeAreaRef.current = safeAreaRect;
      canvasInstance.add(safeAreaRect);
      sendObjectToCanvasBack(canvasInstance, safeAreaRect);
    }

    // Ensure print area indicators are always at the back
    if (printAreaRef.current) {
      sendObjectToCanvasBack(canvasInstance, printAreaRef.current);
    }
    if (safeAreaRef.current) {
      sendObjectToCanvasBack(canvasInstance, safeAreaRef.current);
    }

    canvasInstance.renderAll();
  }, [canvas, sendObjectToCanvasBack]);

  // [2025-01-27 16:00:00] Toggle print area visibility
  const togglePrintArea = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const newVisibility = !showPrintArea;
    setShowPrintArea(newVisibility);

    if (printAreaRef.current) {
      printAreaRef.current.set('visible', newVisibility);
    }
    if (safeAreaRef.current) {
      safeAreaRef.current.set('visible', newVisibility);
    }
    fabricCanvasRef.current.renderAll();
  }, [showPrintArea]);

  // [2025-01-27 16:05:00] Zoom controls
  const handleZoomChange = useCallback(
    (newZoom: number) => {
      if (!fabricCanvasRef.current) return;
      const clampedZoom = Math.max(50, Math.min(400, newZoom));
      setZoomLevel(clampedZoom);

      const canvasInstance = fabricCanvasRef.current;
      const zoom = clampedZoom / 100;
      canvasInstance.setZoom(zoom);

      // Center the canvas after zoom
      const canvasWidth = canvasInstance.getWidth();
      const canvasHeight = canvasInstance.getHeight();
      const vpt = canvasInstance.viewportTransform;
      if (vpt) {
        vpt[4] = (canvasWidth - canvasWidth * zoom) / 2;
        vpt[5] = (canvasHeight - canvasHeight * zoom) / 2;
        canvasInstance.setViewportTransform(vpt);
      }

      canvasInstance.renderAll();
    },
    []
  );

  const handleZoomIn = useCallback(() => {
    handleZoomChange(zoomLevel + 10);
  }, [zoomLevel, handleZoomChange]);

  const handleZoomOut = useCallback(() => {
    handleZoomChange(zoomLevel - 10);
  }, [zoomLevel, handleZoomChange]);

  const handleZoomReset = useCallback(() => {
    handleZoomChange(100);
  }, [handleZoomChange]);

  // [2025-01-27 16:10:00] View switching (front/back/sleeve)
  // [2025-01-27 21:00:00] 实现多视图切换功能
  const handleViewSwitch = useCallback(
    async (view: 'front' | 'back' | 'sleeve' | 'zoom') => {
      if (view === 'zoom') {
        // [2025-01-27 21:25:00] Zoom 视图只是放大当前视图（不切换画布）
        handleZoomChange(150); // 放大到 150%
        return;
      }

      // 保存当前画布状态到 store
      if (fabricCanvasRef.current && (currentView === 'front' || currentView === 'back' || currentView === 'sleeve')) {
        const snapshot = fabricCanvasRef.current.toJSON(['id']);
        setCanvas(snapshot, { pushHistory: false });
      }

      // 切换视图
      setView(view as 'front' | 'back' | 'sleeve');

      // 加载新视图的画布
      const viewCanvas = viewCanvases[view as 'front' | 'back' | 'sleeve'];
      if (viewCanvas) {
        await applySnapshotToCanvas(viewCanvas);

        // [2025-01-27 21:00:00] 根据视图调整画布尺寸
        if (view === 'sleeve') {
          // 袖子区域较小（200x600）
          if (fabricCanvasRef.current) {
            fabricCanvasRef.current.setWidth(200);
            fabricCanvasRef.current.setHeight(600);
          }
        } else {
          // 正面和背面标准尺寸（500x600）
          if (fabricCanvasRef.current) {
            fabricCanvasRef.current.setWidth(500);
            fabricCanvasRef.current.setHeight(600);
          }
        }

        // 重新初始化打印区域
        if (fabricCanvasRef.current) {
          const fabric = await ensureFabric();
          await initializePrintArea(fabric, fabricCanvasRef.current);
        }
      }
    },
    [currentView, viewCanvases, setView, setCanvas, applySnapshotToCanvas, ensureFabric, initializePrintArea, handleZoomChange]
  );

  useEffect(() => {
    const detectUser = async () => {
      try {
        const current = await authApi.me();
        setUser(current as any);
      } catch (err) {
        // [2025-11-19 11:00:00] Design Lab 允许未登录用户使用，静默处理 401 错误
        setUser(null);
        console.log('[Design Lab] User not authenticated, continuing as guest');
      }
    };
    detectUser();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && !user) {
      setMode('preview');
      setMobileLocked(true);
    } else if (isMobile && user) {
      setMode('quick-edit');
      setMobileLocked(false);
    } else {
      setMode('edit');
      setMobileLocked(false);
    }
  }, [isMobile, user, setMode, setMobileLocked]);

  const syncDesignToStore = useCallback(
    async (design: DesignDraft) => {
      setDraft(design);
      setDesignName(design.name);
      await applySnapshotToCanvas(design.canvasSnapshot);
    },
    [applySnapshotToCanvas, setDraft]
  );

  useEffect(() => {
    if (!canvas || !fabricCanvasRef.current) {
      return;
    }
    applySnapshotToCanvas(canvas);
  }, [canvas, applySnapshotToCanvas]);



  useEffect(() => {
    const loadDraft = async () => {
      try {
        setLoading(true);
        let draftData: DesignDraft | null = null;

        if (designIdParam) {
          const response = await designLabApi.getDraft(designIdParam) as any;
          draftData = response.data;
        } else if (variantIdParam) {
          const response = await designLabApi.createDraft({ productVariantId: variantIdParam }) as any;
          draftData = response.data;
          if (draftData) {
            const nextParams = new URLSearchParams(paramsString);
            nextParams.set('designId', draftData.id);
            router.replace(`/design-lab?${nextParams.toString()}`);
          }
        } else {
          const fallbackVariantId = await resolveDefaultVariantId();
          if (!fallbackVariantId) {
            setError('请通过产品详情页选择定制变体进入 Design Lab。');
            return;
          }
          const response = await designLabApi.createDraft({ productVariantId: fallbackVariantId }) as any;
          draftData = response.data;
          if (draftData) {
            const nextParams = new URLSearchParams(paramsString);
            nextParams.set('designId', draftData.id);
            nextParams.set('variantId', fallbackVariantId);
            router.replace(`/design-lab?${nextParams.toString()}`);
          }
        }

        if (draftData) {
          await syncDesignToStore(draftData);
        }
      } catch (err: any) {
        console.error('[2025-11-11 15:54:12] loadDraft error:', err);
        setError(err.message || '加载设计稿失败');
      } finally {
        setLoading(false);
        initialSyncRef.current = false;
      }
    };

    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designIdParam, variantIdParam, paramsString, resolveDefaultVariantId, router]);

  // [2025-01-27 23:30:00] 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框或文本区域，不处理快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl+Z / Cmd+Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const currentHistory = useDesignLabStore.getState().history;
        if (currentHistory.length > 0) {
          undo();
          // 应用撤销后的画布状态
          setTimeout(() => {
            const newCanvas = useDesignLabStore.getState().canvas;
            applySnapshotToCanvas(newCanvas);
          }, 0);
        }
        return;
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z: 重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        const currentFuture = useDesignLabStore.getState().future;
        if (currentFuture.length > 0) {
          redo();
          // 应用重做后的画布状态
          setTimeout(() => {
            const newCanvas = useDesignLabStore.getState().canvas;
            applySnapshotToCanvas(newCanvas);
          }, 0);
        }
        return;
      }

      // Delete / Backspace: 删除选中对象
      if ((e.key === 'Delete' || e.key === 'Backspace') && !target.tagName.match(/INPUT|TEXTAREA/)) {
        e.preventDefault();
        handleDeleteObject();
        return;
      }

      // Ctrl+D / Cmd+D: 复制
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicateObject();
        return;
      }

      // Ctrl+A / Cmd+A: 全选（在画布上）
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && fabricCanvasRef.current) {
        e.preventDefault();
        const objects = fabricCanvasRef.current.getObjects();
        if (objects.length > 0) {
          const selection = new (window as any).fabric.ActiveSelection(objects, {
            canvas: fabricCanvasRef.current,
          });
          fabricCanvasRef.current.setActiveObject(selection);
          fabricCanvasRef.current.renderAll();
        }
        return;
      }

      // 方向键：微调位置
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const activeObj = fabricCanvasRef.current?.getActiveObject();
        if (activeObj && !activeObj.locked) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1; // Shift + 方向键 = 10px，否则1px
          const delta = {
            ArrowUp: { top: -step },
            ArrowDown: { top: step },
            ArrowLeft: { left: -step },
            ArrowRight: { left: step },
          }[e.key];
          activeObj.set(delta);
          fabricCanvasRef.current?.renderAll();
          handleCanvasChange();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, applySnapshotToCanvas, handleDeleteObject, handleDuplicateObject, handleCanvasChange]);

  useEffect(() => {
    const setupFabricEvents = async () => {
      if (!canvasElementRef.current) {
        return;
      }
      const fabric = await ensureFabric();
      if (!fabricCanvasRef.current) {
        fabricCanvasRef.current = new fabric.Canvas(canvasElementRef.current, {
          preserveObjectStacking: true,
          selection: true,
          backgroundColor: 'transparent', // [2025-11-21 11:15:00] 确保画布背景透明，不遮挡产品图片
        });
      }

      const canvasInstance = fabricCanvasRef.current;
      canvasInstance.on('object:added', handleCanvasChange);
      canvasInstance.on('object:modified', handleCanvasChange);
      canvasInstance.on('object:removed', handleCanvasChange);
      canvasInstance.on('selection:created', handleSelectionChange);
      canvasInstance.on('selection:updated', handleSelectionChange);
      canvasInstance.on('selection:cleared', handleSelectionChange);

      // [2025-01-27 16:00:00] Initialize print area visualization
      initializePrintArea(fabric, canvasInstance);

      // [2025-01-27 15:40:00] Initial layer update
      updateLayersFromCanvas();

      return () => {
        canvasInstance.off('object:added');
        canvasInstance.off('object:modified');
        canvasInstance.off('object:removed');
        canvasInstance.off('selection:created');
        canvasInstance.off('selection:updated');
        canvasInstance.off('selection:cleared');
        canvasInstance.off('object:moving');
      };
    };

    setupFabricEvents();
  }, [ensureFabric, handleCanvasChange, handleSelectionChange, updateLayersFromCanvas, initializePrintArea]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    if (initialSyncRef.current) {
      return;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        const response = await designLabApi.updateDraft(draft.id, {
          canvas,
          name: designName,
          summary: 'Auto save',
        }) as any;
        patchDraft(response.data);
      } catch (err: any) {
        setError(err.message || '自动保存失败');
      } finally {
        setSaving(false);
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [canvas, draft, designName, patchDraft]);

  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (draft && designName === '') {
      setDesignName(draft.name);
    }
  }, [draft, designName]);

  useEffect(() => {
    // [2025-11-15 16:06:45] 根据画布对象数量控制指南面板显隐
    const layerCount = layers.length;
    const canvasObjectCount = Array.isArray(canvas?.objects) ? canvas.objects.length : 0;
    setHasArtwork(layerCount > 0 || canvasObjectCount > 0);
  }, [layers, canvas]);

  useEffect(() => {
    // [2025-11-15 16:07:05] 一旦用户开始创作就自动折叠指南
    if (hasArtwork) {
      setGuideCollapsed(true);
    }
  }, [hasArtwork]);

  const handleNameBlur = useCallback(async () => {
    if (!draft || designName.trim() === '' || designName === draft.name) {
      return;
    }
    try {
      setSaving(true);
      const response = await designLabApi.updateDraft(draft.id, { name: designName.trim(), summary: 'Rename design' }) as any;
      patchDraft(response.data);
    } catch (err: any) {
      setError(err.message || '更新设计名称失败');
      setDesignName(draft.name);
    } finally {
      setSaving(false);
    }
  }, [draft, designName, patchDraft]);

  // [2025-01-28] 改进的文本添加功能，支持字体、颜色、大小、旋转等选项（参考 native 版本）
  const handleAddText = useCallback(async (
    text: string = 'Your Text',
    options?: {
      fontFamily?: string;
      fill?: string;
      fontSize?: number;
      rotation?: number;
    }
  ) => {
    const fabric = await ensureFabric();
    if (!fabricCanvasRef.current) {
      return;
    }
    
    const canvasWidth = fabricCanvasRef.current.width || 400;
    const canvasHeight = fabricCanvasRef.current.height || 400;
    
    const textbox = new fabric.IText(text || 'Your Text', {
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      fill: options?.fill || textColor || '#FFFFFF', // [2025-01-28] 默认白色
      fontSize: options?.fontSize || textSize || 48,
      fontFamily: options?.fontFamily || textFont || 'Arial',
      originX: 'center',
      originY: 'center',
    }) as unknown as { id?: string; text?: string; rotate?: (angle: number) => void };
    
    textbox.id = uuidv4();
    
    // 应用旋转
    if (options?.rotation !== undefined) {
      textbox.rotate(options.rotation);
    } else if (textRotation !== 0) {
      textbox.rotate(textRotation);
    }
    
    fabricCanvasRef.current.add(textbox);
    fabricCanvasRef.current.setActiveObject(textbox);
    fabricCanvasRef.current.renderAll();
    
    // [2025-01-27 23:00:00] 自动显示编辑面板
    setSelectedTextObject(textbox);
    setShowEditPanel(true);
    handleCanvasChange();
    
    // [2025-01-28] 添加后返回 home 面板（类似 native 版本）
    setSelectedTool('upload');
  }, [ensureFabric, handleCanvasChange, textColor, textSize, textFont, textRotation]);

  const handleDeleteSelection = useCallback(() => {
    const active = fabricCanvasRef.current?.getActiveObject();
    if (active && fabricCanvasRef.current) {
      fabricCanvasRef.current.remove(active);
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
    }
  }, []);

  // [2025-01-27 23:30:00] 上传资源处理函数 - 添加详细日志
  const handleUploadAsset = useCallback(async () => {
    const timestamp = new Date().toISOString();
    console.log('[Upload] ===== handleUploadAsset CALLED =====', {
      timestamp,
      hasDraft: !!draft,
      hasUser: !!user,
      fileInputRefExists: !!fileInputRef.current
    });

    if (!draft) {
      console.warn('[Upload] ❌ No draft found', { timestamp });
      setError('尚未加载设计稿');
      return;
    }
    if (!user) {
      console.warn('[Upload] ❌ No user found', { timestamp });
      setError('请先登录后再上传素材');
      return;
    }

    console.log('[Upload] 📋 Triggering file input click...', {
      timestamp,
      fileInputElement: fileInputRef.current ? 'exists' : 'null'
    });

    if (fileInputRef.current) {
      fileInputRef.current.click();
      console.log('[Upload] ✅ File input click triggered', { timestamp });
    } else {
      console.error('[Upload] ❌ File input ref is null!', { timestamp });
      setError('文件输入框未初始化，请刷新页面重试');
    }
  }, [draft, user]);

  // [2025-01-27 23:40:00] 上传功能 - 完整的日志系统和错误处理
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const timestamp = new Date().toISOString();
      const sessionId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('[Upload] ========================================');
      console.log('[Upload] ===== handleFileChange FUNCTION CALLED =====');
      console.log('[Upload] Session ID:', sessionId);
      console.log('[Upload] Timestamp:', timestamp);
      console.log('[Upload] Event type:', event.type);
      console.log('[Upload] Event target:', event.target);
      console.log('[Upload] Files in event:', event.target.files?.length || 0);
      console.log('[Upload] ========================================');
      console.log('[Upload] ===== UPLOAD SESSION START =====');
      
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file) {
        console.warn('[Upload] ❌ No file selected, exiting');
        console.log('[Upload] ===== UPLOAD SESSION END (NO FILE) =====');
        return;
      }

      console.log('[Upload] ✅ File selected:', {
        sessionId,
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB (${file.size} bytes)`,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString(),
        timestamp
      });

      // [2025-01-27 23:20:00] 步骤 1: 验证文件类型
      console.log('[Upload] 📋 Step 1: Validating file type...');
      if (!file.type.startsWith('image/')) {
        const errorMsg = '请选择图片文件（PNG、JPG、GIF、SVG等）';
        console.error('[Upload] ❌ Step 1 FAILED: Invalid file type', {
          sessionId,
          fileType: file.type,
          expectedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp'],
          timestamp
        });
        setError(errorMsg);
        console.log('[Upload] ===== UPLOAD SESSION END (VALIDATION FAILED) =====');
        return;
      }
      console.log('[Upload] ✅ Step 1 PASSED: File type is valid', { fileType: file.type, sessionId });

      // [2025-01-27 23:20:00] 步骤 2: 验证文件大小（20MB限制）
      console.log('[Upload] 📋 Step 2: Validating file size...');
      const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
      if (file.size > MAX_FILE_SIZE) {
        const errorMsg = `文件大小超过限制（最大 20MB），当前文件：${(file.size / 1024 / 1024).toFixed(2)}MB`;
        console.error('[Upload] ❌ Step 2 FAILED: File too large', {
          sessionId,
          fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          maxSize: `${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`,
          exceedsBy: `${((file.size - MAX_FILE_SIZE) / 1024 / 1024).toFixed(2)}MB`,
          timestamp
        });
        setError(errorMsg);
        console.log('[Upload] ===== UPLOAD SESSION END (VALIDATION FAILED) =====');
        return;
      }
      console.log('[Upload] ✅ Step 2 PASSED: File size is within limit', {
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        maxSize: `${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`,
        sessionId
      });

      // [2025-01-27 23:20:00] 步骤 3: 开始上传流程
      console.log('[Upload] 📋 Step 3: Starting upload process...');
      setUploading(true);
      setError(null);
      console.log('[Upload] ✅ Step 3: Upload state set (uploading=true, error=null)', { sessionId });

      // Helper function to add image to canvas
      const addToCanvas = async (url: string) => {
        console.log('[Upload] 📋 Step 6: Adding image to canvas...', {
          url: url.substring(0, 100) + (url.length > 100 ? '...' : ''),
          urlLength: url.length,
          sessionId,
          timestamp
        });
        try {
          console.log('[Upload] 📋 Step 6.1: Ensuring Fabric.js is loaded...', { sessionId });
          const fabric = await ensureFabric();
          console.log('[Upload] ✅ Step 6.1: Fabric.js loaded successfully', {
            fabricVersion: fabric?.version || 'unknown',
            sessionId
          });
          
          console.log('[Upload] 📋 Step 6.2: Creating Fabric Image from URL...', { sessionId });
          fabric.Image.fromURL(
            url,
            (img: any) => {
              if (img) {
                console.log('[Upload] ✅ Step 6.2: Image loaded successfully', {
                  sessionId,
                  originalWidth: img.width,
                  originalHeight: img.height,
                  aspectRatio: (img.width / img.height).toFixed(2),
                  timestamp
                });
                
                const imageObject = img as any & { id?: string };
                imageObject.id = uuidv4();
                
                // [2025-01-27 22:30:00] 计算合适的缩放比例，确保图片适合画布
                const canvasWidth = 1000; // 新的画布宽度
                const canvasHeight = 1200; // 新的画布高度
                const maxWidth = canvasWidth * 0.6; // 最大宽度为画布的60%
                const maxHeight = canvasHeight * 0.6; // 最大高度为画布的60%
                
                const scaleX = Math.min(1, maxWidth / (img.width || 400));
                const scaleY = Math.min(1, maxHeight / (img.height || 400));
                const scale = Math.min(scaleX, scaleY); // 保持宽高比
                
                imageObject.set({
                  left: canvasWidth / 2 - (img.width * scale) / 2, // 居中
                  top: canvasHeight / 2 - (img.height * scale) / 2, // 居中
                  scaleX: scale,
                  scaleY: scale,
                });
                
                console.log('[Design Lab] Image object configured:', {
                  id: imageObject.id,
                  left: imageObject.left,
                  top: imageObject.top,
                  scaleX: imageObject.scaleX,
                  scaleY: imageObject.scaleY,
                  timestamp
                });
                
                fabricCanvasRef.current?.add(imageObject);
                fabricCanvasRef.current?.setActiveObject(imageObject);
                fabricCanvasRef.current?.renderAll();
                
                console.log('[Upload] ✅ Step 6.3: Image added to canvas successfully', {
                  sessionId,
                  canvasObjectsCount: fabricCanvasRef.current?.getObjects().length || 0,
                  timestamp
                });
                setShowUploadModal(false); // Close modal on success
                setError(null);
                console.log('[Upload] ========================================');
                console.log('[Upload] ===== UPLOAD SESSION SUCCESS =====');
                console.log('[Upload] Session ID:', sessionId);
                console.log('[Upload] Total duration:', `${((Date.now() - new Date(timestamp).getTime()) / 1000).toFixed(2)}s`);
                console.log('[Upload] ========================================');
              } else {
                console.error('[Upload] ❌ Step 6.2 FAILED: Failed to create image object from URL', {
                  sessionId,
                  url: url.substring(0, 100),
                  timestamp
                });
                setError('无法加载图片，请检查文件格式');
                console.log('[Upload] ===== UPLOAD SESSION END (CANVAS ERROR) =====');
              }
            },
            { crossOrigin: 'anonymous' }
          );
        } catch (canvasErr: any) {
          console.error('[Design Lab] Error adding image to canvas:', {
            error: canvasErr.message,
            stack: canvasErr.stack,
            timestamp
          });
          setError('添加图片到画布失败：' + (canvasErr.message || '未知错误'));
        }
      };

      try {
        // [2025-01-27 23:20:00] 步骤 4: 选择上传方式（API 或 FileReader）
        console.log('[Upload] 📋 Step 4: Choosing upload method...', {
          hasDraft: !!draft,
          draftId: draft?.id || 'none',
          sessionId
        });

        // Try to use the API first if draft exists
        if (draft) {
          console.log('[Upload] 📋 Step 4.1: Attempting API upload...', {
            draftId: draft.id,
            sessionId,
            timestamp
          });
          try {
            console.log('[Upload] 📋 Step 4.1.1: Requesting upload signature...', {
              fileName: file.name,
              fileSize: file.size,
              contentType: file.type,
              sessionId
            });
            
            const response = await designLabApi.generateAssetUpload(draft.id, {
              fileName: file.name,
              fileSize: file.size,
              contentType: file.type || 'application/octet-stream',
            }) as any;

            console.log('[Upload] ✅ Step 4.1.1: Upload signature received', {
              sessionId,
              hasUploadUrl: !!response.data?.uploadUrl,
              hasAssetUrl: !!response.data?.asset?.url,
              uploadUrl: response.data?.uploadUrl ? response.data.uploadUrl.substring(0, 100) + '...' : 'none',
              assetUrl: response.data?.asset?.url ? response.data.asset.url.substring(0, 100) + '...' : 'none',
              timestamp
            });

            console.log('[Upload] 📋 Step 4.1.2: Uploading file to storage...', { sessionId });
            const uploadStartTime = Date.now();
            const uploadResponse = await fetch(response.data.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
              },
            });
            const uploadDuration = Date.now() - uploadStartTime;

            console.log('[Upload] ✅ Step 4.1.2: File uploaded to storage', {
              sessionId,
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
              duration: `${uploadDuration}ms`,
              uploadSpeed: `${(file.size / 1024 / (uploadDuration / 1000)).toFixed(2)}KB/s`,
              timestamp
            });

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText.substring(0, 200)}`);
            }

            console.log('[Upload] 📋 Step 5: Adding uploaded image to canvas...', { sessionId });
            await addToCanvas(response.data.asset.url);
            console.log('[Upload] ===== UPLOAD SESSION SUCCESS (API) =====', {
              sessionId,
              method: 'API',
              timestamp
            });
            return; // Success, exit
          } catch (apiErr: any) {
            console.warn('[Upload] ⚠️ Step 4.1 FAILED: API upload failed, falling back to FileReader', {
              sessionId,
              error: apiErr.message,
              stack: apiErr.stack?.substring(0, 500),
              timestamp
            });
            // Fallthrough to local reader
          }
        } else {
          console.log('[Upload] 📋 Step 4: No draft exists, using FileReader fallback', {
            sessionId,
            reason: 'No draft found',
            timestamp
          });
        }

        // [2025-01-27 23:20:00] 步骤 5: 使用 FileReader 作为后备方案
        console.log('[Upload] 📋 Step 5: Using FileReader fallback...', { sessionId });
        const reader = new FileReader();
        reader.onerror = (error) => {
          console.error('[Upload] ❌ Step 5 FAILED: FileReader error', {
            sessionId,
            error: error,
            timestamp
          });
          setError('读取文件失败，请重试');
          console.log('[Upload] ===== UPLOAD SESSION END (FILEREADER ERROR) =====');
        };
        reader.onloadstart = () => {
          console.log('[Upload] 📋 Step 5.1: FileReader started reading file...', { sessionId });
        };
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            console.log('[Upload] 📋 Step 5.1: FileReader progress', {
              sessionId,
              loaded: `${(e.loaded / 1024 / 1024).toFixed(2)}MB`,
              total: `${(e.total / 1024 / 1024).toFixed(2)}MB`,
              percent: `${percent}%`,
              timestamp
            });
          }
        };
        reader.onload = async (f) => {
          const data = f.target?.result as string;
          if (data) {
            console.log('[Upload] ✅ Step 5.1: FileReader loaded successfully', {
              sessionId,
              dataLength: `${(data.length / 1024 / 1024).toFixed(2)}MB (${data.length} chars)`,
              dataPrefix: data.substring(0, 50) + '...',
              timestamp
            });
            console.log('[Upload] 📋 Step 5.2: Adding image to canvas from FileReader data...', { sessionId });
            await addToCanvas(data);
            console.log('[Upload] ===== UPLOAD SESSION SUCCESS (FILEREADER) =====', {
              sessionId,
              method: 'FileReader',
              timestamp
            });
          } else {
            console.error('[Upload] ❌ Step 5.1 FAILED: FileReader result is empty', {
              sessionId,
              timestamp
            });
            setError('读取文件失败，文件可能已损坏');
            console.log('[Upload] ===== UPLOAD SESSION END (EMPTY RESULT) =====');
          }
        };
        reader.readAsDataURL(file);

      } catch (err: any) {
        console.error('[Upload] ========================================');
        console.error('[Upload] ===== UPLOAD SESSION ERROR =====');
        console.error('[Upload] Session ID:', sessionId);
        console.error('[Upload] Error:', err.message);
        console.error('[Upload] Stack:', err.stack?.substring(0, 500));
        console.error('[Upload] ========================================');
        setError(err.message || '上传素材失败');
        console.log('[Upload] ===== UPLOAD SESSION END (ERROR) =====');
      } finally {
        setUploading(false);
        console.log('[Upload] ✅ Upload state reset (uploading=false)', { sessionId });
      }
    },
    [draft, ensureFabric]
  );

  const addImageFromUrl = useCallback(
    async (imageUrl: string, isArt: boolean = false) => {
      // [2025-11-15 16:07:22] 预设图形插入：支持内置缩略图
      // [2025-12-02 执行 Custom Ink Plan] 支持标记 Art 来源
      const fabric = await ensureFabric();
      if (!fabricCanvasRef.current) {
        return;
      }
      fabric.Image.fromURL(
        imageUrl,
        (img: any) => {
          if (img) {
            const imageObject = img as any & { id?: string; isArt?: boolean; source?: string };
            imageObject.id = uuidv4();
            if (isArt) {
              imageObject.isArt = true;
              imageObject.source = 'art';
            }
            const canvasWidth = fabricCanvasRef.current?.width || 400;
            const canvasHeight = fabricCanvasRef.current?.height || 400;
            imageObject.set({
              left: canvasWidth / 2,
              top: canvasHeight / 2,
              originX: 'center',
              originY: 'center',
              scaleX: Math.min(1, 360 / (img.width || 360)),
              scaleY: Math.min(1, 360 / (img.height || 360)),
            });
            fabricCanvasRef.current?.add(imageObject);
            fabricCanvasRef.current?.setActiveObject(imageObject);
            fabricCanvasRef.current?.renderAll();
            handleCanvasChange();
          }
        },
        { crossOrigin: 'anonymous' }
      );
    },
    [ensureFabric, handleCanvasChange]
  );

  // [2025-01-28] 添加基本形状功能（参考 native 版本）
  const handleAddArt = useCallback(
    async (artType: 'star' | 'heart' | 'circle' | 'triangle' | 'square') => {
      const fabric = await ensureFabric();
      if (!fabricCanvasRef.current) {
        return;
      }

      const canvasWidth = fabricCanvasRef.current.width || 400;
      const canvasHeight = fabricCanvasRef.current.height || 400;

      let newObject: any = null;

      // [2025-01-28] 对于 circle, square, triangle 使用 Fabric 形状
      if (artType === 'circle') {
        newObject = new fabric.Circle({
          radius: 50,
          fill: '#3b82f6',
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center',
        });
      } else if (artType === 'square') {
        newObject = new fabric.Rect({
          width: 100,
          height: 100,
          fill: '#3b82f6',
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center',
        });
      } else if (artType === 'triangle') {
        newObject = new fabric.Triangle({
          width: 100,
          height: 100,
          fill: '#3b82f6',
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center',
        });
      } else if (artType === 'star' || artType === 'heart') {
        // [2025-01-28] 对于 star 和 heart，使用 SVG（参考 native 版本）
        let svgContent = '';
        if (artType === 'star') {
          svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#3b82f6"/></svg>';
        } else if (artType === 'heart') {
          svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,85 C50,85 10,50 10,30 C10,15 20,10 30,10 C40,10 50,20 50,20 C50,20 60,10 70,10 C80,10 90,15 90,30 C90,50 50,85 50,85 Z" fill="#ff1f3d"/></svg>';
        }
        
        if (svgContent) {
          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          await addImageFromUrl(url);
          setShowAddArtModal(false);
          setSelectedTool('upload');
          return;
        }
      }

      if (newObject) {
        newObject.id = uuidv4();
        // [2025-12-02 执行 Custom Ink Plan] 标记 Basic Shapes 为 Art
        newObject.isArt = true;
        newObject.source = 'art';
        fabricCanvasRef.current.add(newObject);
        fabricCanvasRef.current.setActiveObject(newObject);
        fabricCanvasRef.current.renderAll();
        handleCanvasChange();
        setShowAddArtModal(false);
        setSelectedTool('upload');
      }
    },
    [ensureFabric, handleCanvasChange, addImageFromUrl]
  );

  const handleInsertPresetArt = useCallback(
    async (presetId: string) => {
      const preset = artPresets.find((item) => item.id === presetId);
      if (!preset) {
        return;
      }
      if (preset.type === 'image') {
        await addImageFromUrl(preset.src);
        return;
      }
      const fabric = await ensureFabric();
      if (!fabricCanvasRef.current) {
        return;
      }
      let newObject: any = null;
      if (preset.type === 'shape') {
        if (preset.shape === 'star') {
          const points = [
            { x: 0, y: -60 },
            { x: 18, y: -18 },
            { x: 60, y: -18 },
            { x: 24, y: 6 },
            { x: 36, y: 48 },
            { x: 0, y: 24 },
            { x: -36, y: 48 },
            { x: -24, y: 6 },
            { x: -60, y: -18 },
            { x: -18, y: -18 },
          ];
          newObject = new fabric.Polygon(points, {
            fill: preset.fill || '#fbbf24',
            left: 160,
            top: 160,
            scaleX: 1,
            scaleY: 1,
          });
        } else {
          newObject = new fabric.Rect({
            width: 200,
            height: 80,
            rx: 12,
            ry: 12,
            fill: preset.fill || '#38bdf8',
            left: 120,
            top: 180,
          });
        }
      } else if (preset.type === 'text') {
        newObject = new fabric.Textbox(preset.text || 'Custom', {
          left: 140,
          top: 160,
          fill: '#111111',
          fontSize: 42,
          fontWeight: 700,
        });
      }
      if (newObject) {
        newObject.id = uuidv4();
        fabricCanvasRef.current.add(newObject);
        fabricCanvasRef.current.setActiveObject(newObject);
        fabricCanvasRef.current.renderAll();
      }
    },
    [addImageFromUrl, artPresets, ensureFabric]
  );

  // [2025-01-27 23:30:00] 添加详细日志，包括上传按钮点击追踪
  // [2025-12-02 06:05:00] 更新：Upload 工具改为先打开「Choose File To Upload」模态，而不是直接触发文件选择器
  const triggerToolAction = useCallback(
    (tool: ToolKey) => {
      const timestamp = new Date().toISOString();
      console.log('[Design Lab] ===== triggerToolAction =====', { tool, timestamp });
      
      setSelectedTool(tool);
      switch (tool) {
        case 'upload':
          console.log('[Upload] ========================================');
          console.log('[Upload] ===== UPLOAD BUTTON CLICKED =====');
          console.log('[Upload] Timestamp:', timestamp);
          console.log('[Upload] draft exists:', !!draft);
          console.log('[Upload] user exists:', !!user);
          console.log('[Upload] ========================================');
          // [2025-12-02 06:05:00] 行为对齐 Custom Ink：先进入「Choose File To Upload」界面，由其中的 Browse/Drag&Drop 真正触发上传
          setShowUploadModal(true);
          break;
        case 'text':
          console.log('[Design Lab] Opening add text modal', { timestamp });
          setShowAddTextModal(true);
          break;
        case 'art':
          console.log('[Design Lab] Opening add art modal', { timestamp });
          setShowAddArtModal(true);
          break;
        case 'colors':
          console.log('[Design Lab] Opening product colors modal', { timestamp });
          setShowProductColorsModal(true);
          break;
        case 'names':
          console.log('[Design Lab] Opening add names modal', { timestamp });
          setShowAddNamesModal(true);
          break;
        case 'templates':
          // [2025-01-27 21:55:00] 打开模板库
          console.log('[Design Lab] Opening templates library', { timestamp });
          setShowTemplates(true);
          break;
        case 'comments':
          // [2025-01-27 21:55:00] 打开评论面板
          console.log('[Design Lab] Opening comments panel', { timestamp });
          setShowComments(true);
          break;
        case 'products':
          console.log('[Design Lab] Navigating to products page', { timestamp });
          router.push('/products');
          break;
        case 'printArea':
          console.log('[Design Lab] Toggling print area', { timestamp });
          togglePrintArea();
          break;
        default:
          console.warn('[Design Lab] Unknown tool action', { tool, timestamp });
          break;
      }
      console.log('[Design Lab] ===== triggerToolAction END =====', { tool, timestamp });
    },
    [router, togglePrintArea] // [2025-11-16 13:10:00] 补齐依赖，避免 stale handler
  );

  const handleGuideActionTrigger = useCallback(
    (tool: ToolKey) => {
      triggerToolAction(tool);
      // [2025-12-02 06:05:00] 保持与 hasArtwork 规则一致：不在点击瞬间强制折叠，引导面板由画布是否已有内容决定
    },
    [triggerToolAction]
  );

  const handleRequestQuote = useCallback(() => {
    // [2025-01-27 22:00:00] 显示"What do you want to do with your design?"模态框
    setShowDesignActionModal(true);
  }, []);

  // [2025-01-27 22:00:00] 计算总数量
  const totalQuantity = useMemo(() => {
    return Object.values(sizeQuantities).reduce((sum, qty) => sum + (qty || 0), 0);
  }, [sizeQuantities]);

  // [2025-01-27 23:45:00] 计算价格
  useEffect(() => {
    const totalQty = totalQuantity || 1;
    let basePrice = 32.25;

    // 根据数量计算折扣
    if (totalQty >= 20) {
      basePrice = 13.65;
    } else if (totalQty >= 10) {
      basePrice = 19.45;
    }

    setPricePerItem(basePrice);
    setCalculatedPrice(basePrice * totalQty);
  }, [totalQuantity]);

  // [2025-01-27 22:00:00] 处理尺寸数量变化
  const handleSizeQuantityChange = (size: string, value: number) => {
    setSizeQuantities(prev => ({ ...prev, [size]: Math.max(0, value) }));
  };

  const handleSubmitOrder = useCallback(async () => {
    if (!draft) {
      return;
    }
    try {
      const response = await designLabApi.submitOrder(draft.id, {
        quantity,
      });
      patchDraft((response as any).data.design);
      alert('设计已锁定并生成下单草稿，请前往购物车继续结账。');
    } catch (err: any) {
      setError(err.message || '提交订单失败，需登录才能继续');
    }
  }, [draft, patchDraft, quantity]);

  const textTargets = useMemo(() => {
    if (!fabricCanvasRef.current) {
      return [];
    }
    return fabricCanvasRef.current
      .getObjects('textbox')
      .map((obj: any) => obj as (any & { id?: string }))
      .map((textbox: any) => ({
        id: textbox.id || uuidv4(),
        text: textbox.text || '',
      }));
  }, []);

  const handleQuickEditChange = useCallback((id: string, value: string) => {
    if (!fabricCanvasRef.current) {
      return;
    }
    const target = fabricCanvasRef.current
      .getObjects()
      .find((obj: any) => (obj as { id?: string }).id === id) as { id?: string; text?: string } | undefined;
    if (target) {
      target.text = value;
      fabricCanvasRef.current.renderAll();
      handleCanvasChange();
    }
  }, [handleCanvasChange]);

  const handleProductColorSelect = useCallback((colorKey: string) => {
    // [2025-11-15 16:07:58] Inspector 色板切换
    setSelectedProductColor(colorKey);
  }, []);

  const handleAddProductsClick = useCallback(() => {
    router.push('/products');
  }, [router]);

  const handleGuideToggle = useCallback(() => {
    setGuideCollapsed((prev) => !prev);
  }, []);

  // [2025-01-27 21:10:00] 批量命名功能
  const handleBatchNames = useCallback(() => {
    setShowBatchNames(true);
  }, []);

  // [2025-01-27 21:10:00] 应用批量命名
  const handleApplyBatchNames = useCallback(() => {
    if (!fabricCanvasRef.current || !batchNames.trim()) {
      return;
    }

    const namesArray = batchNames
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (namesArray.length === 0) {
      setError('请输入至少一个名字');
      return;
    }

    const textObjects = fabricCanvasRef.current.getObjects('textbox') as Array<any & { id?: string; text?: string }>;

    if (textObjects.length === 0) {
      setError('画布上没有文字对象。请先添加文字。');
      setShowBatchNames(false);
      return;
    }

    // 将名字循环应用到所有文本框
    textObjects.forEach((textObj, index) => {
      const nameIndex = index % namesArray.length;
      textObj.set('text', namesArray[nameIndex]);
    });

    fabricCanvasRef.current.renderAll();
    handleCanvasChange();
    setShowBatchNames(false);
    setBatchNames('');
    setError(null);
  }, [batchNames, handleCanvasChange]);

  // [2025-01-27 21:15:00] 导出功能
  const handleExport = useCallback(async (format: 'png' | 'pdf' | 'svg') => {
    if (!fabricCanvasRef.current) {
      setError('无法导出：画布未初始化');
      return;
    }

    setExporting(true);
    try {
      const canvasInstance = fabricCanvasRef.current;

      if (format === 'png') {
        // 导出为 PNG
        const dataURL = canvasInstance.toDataURL({
          format: 'png',
          quality: 1.0,
          multiplier: 2, // 2x resolution for better quality
        });

        const link = document.createElement('a');
        link.download = `${designName || 'design'}-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
      } else if (format === 'svg') {
        // 导出为 SVG
        const svgData = canvasInstance.toSVG();
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = `${designName || 'design'}-${Date.now()}.svg`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // [2025-01-27 21:15:00] 导出为 PDF（使用 canvas toDataURL + jsPDF）
        try {
          // [2025-01-27 21:25:00] 动态导入 jsPDF，如果未安装则提示用户
          // @ts-ignore - jsPDF may not be installed
          const jsPDFModule = await import('jspdf').catch(() => null);
          if (!jsPDFModule) {
            setError('PDF 导出需要安装 jsPDF 库。请使用 PNG 或 SVG 格式。');
            return;
          }

          // @ts-ignore - jsPDF types may not be available
          const { default: jsPDF } = jsPDFModule;
          const dataURL = canvasInstance.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 2,
          });

          const pdf = new jsPDF({
            orientation: canvasInstance.width > canvasInstance.height ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [canvasInstance.width * 0.264583, canvasInstance.height * 0.264583], // Convert pixels to mm
          });

          const imgWidth = pdf.internal.pageSize.getWidth();
          const imgHeight = (canvasInstance.height * imgWidth) / canvasInstance.width;

          pdf.addImage(dataURL, 'PNG', 0, 0, imgWidth, imgHeight);
          pdf.save(`${designName || 'design'}-${Date.now()}.pdf`);
        } catch (err: any) {
          setError('PDF 导出失败：' + (err.message || '未知错误'));
        }
      }
    } catch (err: any) {
      setError(err.message || '导出失败');
    } finally {
      setExporting(false);
    }
  }, [designName]);

  // [2025-01-27 21:20:00] 分享设计功能
  const handleShareDesign = useCallback(async () => {
    if (!draft) {
      setError('无法分享：设计稿不存在');
      return;
    }

    try {
      // 生成分享链接
      const shareUrl = `${window.location.origin}/design-lab?designId=${draft.id}&view=shared`;

      // 尝试使用 Web Share API（如果支持）
      if (navigator.share) {
        await navigator.share({
          title: `${designName || '我的设计'}`,
          text: '查看我的定制设计',
          url: shareUrl,
        });
      } else {
        // 回退：复制到剪贴板
        await navigator.clipboard.writeText(shareUrl);
        alert('分享链接已复制到剪贴板！');
      }
    } catch (err: any) {
      // 用户取消分享或出错，静默处理
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  }, [draft, designName]);

  // [2025-01-27 21:55:00] 打开模板库
  const handleOpenTemplates = useCallback(async () => {
    if (showTemplates) {
      setShowTemplates(false);
      return;
    }

    setShowTemplates(true);
    setLoadingTemplates(true);

    try {
      const response = await templateApi.list({ limit: 20, featured: true });
      setTemplates(response.data || []);
    } catch (err: any) {
      setError('加载模板失败：' + (err.message || '未知错误'));
    } finally {
      setLoadingTemplates(false);
    }
  }, [showTemplates]);

  // [2025-01-27 21:55:00] 应用模板
  const handleApplyTemplate = useCallback(async (template: DesignTemplate) => {
    if (!fabricCanvasRef.current || !template.designData) {
      return;
    }

    try {
      const fabric = await ensureFabric();

      // 清空当前画布
      fabricCanvasRef.current.clear();

      // 加载模板数据
      await applySnapshotToCanvas(template.designData);

      // 增加模板使用次数
      await templateApi.like(template.id);

      setShowTemplates(false);
      setError(null);
    } catch (err: any) {
      setError('应用模板失败：' + (err.message || '未知错误'));
    }
  }, [ensureFabric, applySnapshotToCanvas]);

  // [2025-01-27 21:55:00] 打开评论面板
  const handleOpenComments = useCallback(async () => {
    if (!draft) {
      setError('无法加载评论：设计稿不存在');
      return;
    }

    if (showComments) {
      setShowComments(false);
      return;
    }

    setShowComments(true);
    setLoadingComments(true);

    try {
      const response = await designCommentApi.list(draft.id, { limit: 50 });
      setComments(response.data || []);
    } catch (err: any) {
      setError('加载评论失败：' + (err.message || '未知错误'));
    } finally {
      setLoadingComments(false);
    }
  }, [draft, showComments]);

  // [2025-01-27 21:55:00] 提交评论
  const handleSubmitComment = useCallback(async () => {
    if (!draft || !newComment.trim()) {
      return;
    }

    setSubmittingComment(true);
    try {
      await designCommentApi.create(draft.id, {
        content: newComment.trim(),
        authorName: user ? undefined : (newCommentAuthor.trim() || 'Anonymous'),
      });

      // 重新加载评论
      const response = await designCommentApi.list(draft.id, { limit: 50 });
      setComments(response.data || []);

      setNewComment('');
      setNewCommentAuthor('');
      setError(null);
    } catch (err: any) {
      setError('提交评论失败：' + (err.message || '未知错误'));
    } finally {
      setSubmittingComment(false);
    }
  }, [draft, newComment, newCommentAuthor, user]);

  // [2025-01-27 21:55:00] 点赞评论
  const handleLikeComment = useCallback(async (commentId: string) => {
    try {
      await designCommentApi.like(commentId);

      // 更新本地评论数据
      setComments(comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, likesCount: comment.likesCount + 1 }
          : comment
      ));
    } catch (err: any) {
      console.error('Failed to like comment:', err);
    }
  }, [comments]);

  // [2025-01-28 00:00:00] 文件输入框 - 必须在所有条件渲染之前，确保始终在 DOM 中
  const fileInputElement = (
    <input 
      id="design-lab-file-input"
      key="design-lab-file-input-key"
      ref={(el) => {
        const timestamp = new Date().toISOString();
        console.log('[Upload] ===== FILE INPUT REF CALLBACK (UNIVERSAL) =====', {
          timestamp,
          elementExists: !!el,
          previousRefExists: !!fileInputRef.current,
          elementId: el?.id || 'no-id',
          elementType: el?.type || 'no-type',
          isInDOM: el ? (document.body.contains(el) || el.isConnected) : false
        });
        
        fileInputRef.current = el;
        
        if (el) {
          // 立即验证元素
          setTimeout(() => {
            const foundById = document.getElementById('design-lab-file-input');
            console.log('[Upload] File input verification:', {
              timestamp: new Date().toISOString(),
              foundById: !!foundById,
              refMatchesId: fileInputRef.current?.id === 'design-lab-file-input',
              refId: fileInputRef.current?.id || 'no-id'
            });
          }, 100);
        }
      }}
      type="file" 
      accept="image/*" 
      style={{ 
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: 0,
        height: 0,
        opacity: 0,
        pointerEvents: 'none',
        visibility: 'hidden',
        zIndex: -1
      }} 
      onChange={(e) => {
        const timestamp = new Date().toISOString();
        console.log('[Upload] ========================================');
        console.log('[Upload] ===== FILE INPUT onChange (UNIVERSAL) =====');
        console.log('[Upload] Timestamp:', timestamp);
        console.log('[Upload] Files count:', e.target.files?.length || 0);
        console.log('[Upload] File name:', e.target.files?.[0]?.name || 'no file');
        console.log('[Upload] handleFileChange type:', typeof handleFileChange);
        console.log('[Upload] ========================================');
        
        if (typeof handleFileChange === 'function') {
          console.log('[Upload] 📋 Calling handleFileChange...', { timestamp });
          handleFileChange(e);
        } else {
          console.error('[Upload] ❌ handleFileChange is not a function!', {
            handleFileChangeType: typeof handleFileChange,
            timestamp
          });
        }
      }}
      onClick={(e) => {
        console.log('[Upload] 📋 File input clicked', {
          timestamp: new Date().toISOString()
        });
      }}
    />
  );

  // [2025-01-27 20:00:00] 切换可展开部分
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // [2025-01-27 20:00:00] 推荐产品数据
  const recommendedProducts = RECOMMENDED_PRODUCTS;

  // [2025-01-27 20:00:00] 产品图片轮播数据
  const productImages = PRODUCT_IMAGES;

  // [2025-01-27 23:55:00] 组件初始化日志 - 确保在组件挂载时执行
  // [2025-01-28 03:50:00] 必须在条件返回之前调用，遵守 React Hooks 规则
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log('[Upload] ========================================');
    console.log('[Upload] ===== useEffect HOOK EXECUTED =====');
    console.log('[Upload] Timestamp:', timestamp);
    console.log('[Upload] Component mounted:', true);
    console.log('[Upload] fileInputRef exists:', !!fileInputRef.current);
    console.log('[Upload] triggerToolAction type:', typeof triggerToolAction);
    console.log('[Upload] handleFileChange type:', typeof handleFileChange);
    console.log('[Upload] showUploadModal:', showUploadModal);
    console.log('[Upload] selectedTool:', selectedTool);
    console.log('[Upload] ========================================');
    
    // 立即检查 fileInputRef
    console.log('[Upload] Immediate fileInputRef check:', {
      refExists: !!fileInputRef.current,
      refId: fileInputRef.current?.id || 'no-id',
      timestamp
    });
    
    // 延迟检查 fileInputRef（等待 DOM 渲染）
    setTimeout(() => {
      const inputElement = document.getElementById('design-lab-file-input');
      const inputElementLoading = document.getElementById('design-lab-file-input-loading');
      console.log('[Upload] ===== FILE INPUT ELEMENT CHECK (1s delay) =====', {
        timestamp: new Date().toISOString(),
        foundById: !!inputElement,
        foundByRef: !!fileInputRef.current,
        foundLoadingInput: !!inputElementLoading,
        refMatchesId: fileInputRef.current?.id === 'design-lab-file-input',
        refId: fileInputRef.current?.id || 'no-id',
        inputElementDetails: inputElement ? {
          type: inputElement.type,
          accept: inputElement.accept,
          display: window.getComputedStyle(inputElement).display,
          id: inputElement.id
        } : 'not found',
        loadingInputDetails: inputElementLoading ? {
          type: inputElementLoading.type,
          accept: inputElementLoading.accept,
          display: window.getComputedStyle(inputElementLoading).display,
          id: inputElementLoading.id
        } : 'not found'
      });
    }, 1000);
    
    // [2025-01-27 23:55:00] 再次延迟检查（3秒后）
    setTimeout(() => {
      const inputElement = document.getElementById('design-lab-file-input');
      console.log('[Upload] ===== FILE INPUT ELEMENT CHECK (3s delay) =====', {
        timestamp: new Date().toISOString(),
        foundById: !!inputElement,
        foundByRef: !!fileInputRef.current
      });
    }, 3000);
  }, [triggerToolAction, handleFileChange, showUploadModal, selectedTool]);

  // [2025-01-27 23:55:00] 组件渲染前日志
  console.log('[Upload] ===== Component about to render =====', {
    timestamp: new Date().toISOString(),
    loading,
    error,
    hasDraft: !!draft,
    fileInputRefExists: !!fileInputRef.current
  });

  // [2025-01-28 03:50:00] 条件返回 - 必须在所有 hooks 之后
  // [2025-01-27 23:45:00] 加载状态
  if (loading) {
    console.log('[Upload] ⚠️ Component is in loading state', {
      timestamp: new Date().toISOString(),
      fileInputRefExists: !!fileInputRef.current
    });
    return (
      <>
        {fileInputElement}
        <section className="lab__loading">
          <p>正在加载 Design Lab...</p>
        </section>
      </>
    );
  }

  // [2025-01-27 20:00:00] If no draft, we should still show the UI for a new design
  // instead of showing an error. The loadDraft effect will handle creating a draft.
  // Only show error if we really have a persistent error.
  if (error && !draft) {
    console.log('[Upload] ⚠️ Component is in error state', {
      timestamp: new Date().toISOString(),
      error,
      fileInputRefExists: !!fileInputRef.current
    });
    return (
      <>
        {fileInputElement}
        <section className="lab__error">
          <h1>Design Lab</h1>
          <p>{error}</p>
        </section>
      </>
    );
  }

  return (
    <>
      {/* [2025-01-28 00:00:00] 文件输入框 - 放在最外层，确保始终在 DOM 中 */}
      {fileInputElement}
      
      <div className="design-lab-new">
        {/* [2025-01-27 20:00:00] 顶部深蓝色导航栏 - 完全匹配参考设计 */}
        <header className="dl-header">
          <div className="dl-header__content">
            <div className="dl-header__left">
              <Link href="/" className="dl-header__logo">CUSTOM INK</Link>
              <Link href="/account/designs" className="dl-header__link">My Designs</Link>
              <span className="dl-header__design-name">{designName || 'Untitled design'}</span>
            </div>
            <div className="dl-header__right">
              <div className="dl-header__contact">
                <span className="dl-header__contact-text">Talk to a Real Person</span>
                <a href="tel:8552712660" className="dl-header__phone">855-271-2660</a>
              </div>
              <Link href="/chat" className="dl-header__chat">
                Chat with a Real Person
                <button className="dl-header__chat-btn">Chat Now</button>
              </Link>
              <Link href="/account" className="dl-header__icon-btn" title="Sign In">
                <span>👤</span>
              </Link>
              <Link href="/cart" className="dl-header__icon-btn" title="Cart">
                <span>🛒</span>
              </Link>
            </div>
          </div>
        </header>

        {/* [2025-01-27 20:00:00] 主内容区域 */}
        <div className="dl-main">
          <div className={`dl-main__grid ${showOrderOptionsPanel ? 'has-order-panel' : ''} ${showEditPanel ? 'has-edit-panel' : ''} ${showEditPanel && layers.length > 0 ? 'has-layers-panel' : ''}`}>
            {/* 左侧深灰色垂直导航栏 */}
            <nav className="dl-sidebar" aria-label="编辑工具">
              <button
                type="button"
                className={`dl-sidebar__btn ${selectedTool === 'upload' ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const timestamp = new Date().toISOString();
                  console.log('[Upload] ===== SIDEBAR UPLOAD BUTTON CLICKED =====', {
                    timestamp,
                    triggerToolActionExists: typeof triggerToolAction === 'function',
                    selectedTool
                  });
                  try {
                    triggerToolAction('upload');
                    console.log('[Upload] ✅ triggerToolAction("upload") called successfully', { timestamp });
                  } catch (err: any) {
                    console.error('[Upload] ❌ Error calling triggerToolAction:', {
                      error: err.message,
                      stack: err.stack,
                      timestamp
                    });
                  }
                }}
              >
                <span className="dl-sidebar__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                <span className="dl-sidebar__label">Upload</span>
              </button>
              <button
                type="button"
                className={`dl-sidebar__btn ${selectedTool === 'text' ? 'is-active' : ''}`}
                onClick={() => triggerToolAction('text')}
              >
                <span className="dl-sidebar__icon dl-sidebar__icon--text">T</span>
                <span className="dl-sidebar__label">Add Text</span>
              </button>
              <button
                type="button"
                className={`dl-sidebar__btn ${selectedTool === 'art' ? 'is-active' : ''}`}
                onClick={() => triggerToolAction('art')}
              >
                <span className="dl-sidebar__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </span>
                <span className="dl-sidebar__label">Add Art</span>
              </button>
              <button
                type="button"
                className={`dl-sidebar__btn ${selectedTool === 'colors' ? 'is-active' : ''}`}
                onClick={() => triggerToolAction('colors')}
              >
                <span className="dl-sidebar__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                </span>
                <span className="dl-sidebar__label">Product Colors</span>
              </button>
              <button
                type="button"
                className={`dl-sidebar__btn ${selectedTool === 'names' ? 'is-active' : ''}`}
                onClick={() => triggerToolAction('names')}
              >
                <span className="dl-sidebar__icon dl-sidebar__icon--names">
                  <span className="dl-sidebar__names-top">SMITH</span>
                  <span className="dl-sidebar__names-bottom">00</span>
                </span>
                <span className="dl-sidebar__label">Add Names</span>
              </button>
              {/* [2025-01-28 00:05:00] 文件输入框已移到组件最外层（fileInputElement），这里不再需要 */}
              {/* [2025-01-27 23:20:00] 拖拽上传支持 - 全页面拖拽区域 */}
              <div
                className="dl-drag-drop-zone"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 9999,
                  pointerEvents: 'none',
                  backgroundColor: 'transparent'
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // [2025-01-27 23:20:00] 显示拖拽提示
                  const zone = e.currentTarget;
                  zone.style.pointerEvents = 'auto';
                  zone.style.backgroundColor = 'rgba(0, 102, 204, 0.1)';
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const timestamp = new Date().toISOString();
                  console.log('[Upload] ===== DRAG ENTER =====', {
                    timestamp,
                    dataTransferTypes: Array.from(e.dataTransfer.types),
                    filesCount: e.dataTransfer.files.length
                  });
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const timestamp = new Date().toISOString();
                  console.log('[Upload] ===== DRAG LEAVE =====', { timestamp });
                  // [2025-01-27 23:20:00] 隐藏拖拽提示
                  const zone = e.currentTarget;
                  zone.style.pointerEvents = 'none';
                  zone.style.backgroundColor = 'transparent';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const timestamp = new Date().toISOString();
                  const zone = e.currentTarget;
                  zone.style.pointerEvents = 'none';
                  zone.style.backgroundColor = 'transparent';
                  
                  console.log('[Upload] ===== FILE DROPPED =====', {
                    timestamp,
                    filesCount: e.dataTransfer.files.length,
                    types: Array.from(e.dataTransfer.types)
                  });
                  
                  const files = Array.from(e.dataTransfer.files);
                  const imageFiles = files.filter(file => file.type.startsWith('image/'));
                  
                  console.log('[Upload] File filtering:', {
                    totalFiles: files.length,
                    imageFiles: imageFiles.length,
                    files: files.map(f => ({
                      name: f.name,
                      type: f.type,
                      size: f.size,
                      isImage: f.type.startsWith('image/')
                    })),
                    timestamp
                  });
                  
                  if (imageFiles.length > 0) {
                    console.log('[Upload] Processing dropped image files:', {
                      count: imageFiles.length,
                      files: imageFiles.map(f => ({
                        name: f.name,
                        size: `${(f.size / 1024 / 1024).toFixed(2)}MB`,
                        type: f.type,
                        lastModified: new Date(f.lastModified).toISOString()
                      })),
                      timestamp
                    });
                    
                    // 创建模拟的 change 事件
                    const syntheticEvent = {
                      target: {
                        files: imageFiles.slice(0, 1), // 只处理第一个文件
                        value: ''
                      }
                    } as any;
                    
                    console.log('[Upload] Calling handleFileChange with dropped file', { timestamp });
                    handleFileChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
                  } else {
                    const errorMsg = '请拖拽图片文件（PNG、JPG、GIF、SVG等）';
                    console.warn('[Upload] No image files in dropped files', {
                      totalFiles: files.length,
                      fileTypes: files.map(f => f.type),
                      timestamp
                    });
                    setError(errorMsg);
                  }
                }}
              />
            </nav>

            {/* 左侧设计工具区域 */}
            <aside className="dl-tools">
              {/* 警告提示 */}
              {showOrderOptionsPanel && (
                <div className="dl-tools-alert">
                  <span className="dl-tools-alert__icon">⚠</span>
                  <p className="dl-tools-alert__text">Your design is blank! Create a design first for a more accurate price quote.</p>
                </div>
              )}

              {/* "What's next for you?" 卡片 */}
              {!guideCollapsed && (
                <div className="dl-whats-next">
                  <h2 className="dl-whats-next__title">What&apos;s next for you?</h2>
                  <div className="dl-whats-next__grid">
                    <button
                      type="button"
                      className="dl-whats-next__card"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const timestamp = new Date().toISOString();
                        console.log('[Upload] ===== WHATS-NEXT UPLOAD BUTTON CLICKED =====', {
                          timestamp,
                          triggerToolActionExists: typeof triggerToolAction === 'function'
                        });
                        try {
                          triggerToolAction('upload');
                          console.log('[Upload] ✅ triggerToolAction("upload") called successfully', { timestamp });
                        } catch (err: any) {
                          console.error('[Upload] ❌ Error calling triggerToolAction:', {
                            error: err.message,
                            stack: err.stack,
                            timestamp
                          });
                        }
                      }}
                    >
                      <span className="dl-whats-next__icon">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#0066cc" strokeWidth="2">
                          <path d="M24 8v32M8 24h32" />
                          <path d="M24 8l-8 8h16l-8-8z" />
                          <path d="M24 8l8 8h-16l8-8z" />
                          <ellipse cx="24" cy="20" rx="12" ry="8" />
                        </svg>
                      </span>
                      <span className="dl-whats-next__label">Upload</span>
                    </button>
                    <button
                      type="button"
                      className="dl-whats-next__card"
                      onClick={() => triggerToolAction('text')}
                    >
                      <span className="dl-whats-next__icon dl-whats-next__icon--text">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#0066cc" strokeWidth="2">
                          <rect x="12" y="12" width="24" height="24" rx="2" />
                          <line x1="18" y1="24" x2="30" y2="24" />
                          <line x1="18" y1="28" x2="26" y2="28" />
                          <line x1="24" y1="20" x2="24" y2="32" strokeWidth="1.5" />
                        </svg>
                      </span>
                      <span className="dl-whats-next__label">Add Text</span>
                    </button>
                    <button
                      type="button"
                      className="dl-whats-next__card"
                      onClick={() => triggerToolAction('art')}
                    >
                      <span className="dl-whats-next__icon">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#0066cc" strokeWidth="2">
                          <rect x="8" y="8" width="32" height="32" rx="2" />
                          <path d="M8 24 L16 16 L24 20 L32 12 L40 20" />
                          <circle cx="12" cy="28" r="2" />
                          <circle cx="36" cy="28" r="2" />
                        </svg>
                      </span>
                      <span className="dl-whats-next__label">Add Art</span>
                    </button>
                    <button
                      type="button"
                      className="dl-whats-next__card"
                      onClick={() => triggerToolAction('products')}
                    >
                      <span className="dl-whats-next__icon">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#0066cc" strokeWidth="2">
                          <path d="M16 12 L12 16 L12 36 L36 36 L36 16 L32 12 Z" />
                          <path d="M16 12 L24 8 L32 12" />
                          <circle cx="18" cy="24" r="1.5" />
                          <circle cx="24" cy="24" r="1.5" />
                          <circle cx="30" cy="24" r="1.5" />
                          <path d="M20 32 L20 28 L28 28 L28 32" />
                          <circle cx="24" cy="36" r="2" />
                          <circle cx="32" cy="36" r="2" />
                          <circle cx="36" cy="36" r="2" />
                          <circle cx="40" cy="36" r="2" />
                          <circle cx="44" cy="36" r="2" />
                        </svg>
                      </span>
                      <span className="dl-whats-next__label">Change Products</span>
                    </button>
                  </div>
                  <p className="dl-whats-next__hint">
                    <span className="dl-whats-next__hint-icon">💡</span>
                    Drag & drop a file anywhere to upload.
                  </p>
                  <p className="dl-whats-next__help">
                    Need help? We&apos;re here for you. <Link href="/chat" className="dl-whats-next__help-link">Chat Now</Link>
                  </p>
                </div>
              )}

              {/* 产品选择栏 */}
              <div className="dl-product-selector">
                <button type="button" className="dl-product-selector__add-btn">+ Add Products</button>
                <div className="dl-product-selector__current">
                  <Image
                    src={currentVariant?.image || currentVariant?.baseImages?.front || currentVariant?.gallery?.[0] || "/assets/categories/cat-tshirt.png"}
                    alt={currentProduct?.name || "Current product"}
                    width={48}
                    height={48}
                    className="dl-product-selector__thumb"
                  />
                  <div className="dl-product-selector__info">
                    <div className="dl-product-selector__name">
                      {currentProduct?.name || 'Gildan Softstyle Jersey T-shirt'}
                      <Link href="#change-product" className="dl-product-selector__change">Change Product</Link>
                    </div>
                    <div className="dl-product-selector__color">
                      {currentVariant?.color || 'Heather Dark Grey'}
                      <Link href="#change-color" className="dl-product-selector__change">Change Color</Link>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* 中间产品可视化区域 */}
            <section className="dl-visualization">
              <div className="dl-visualization__main">
                {/* 撤销/重做按钮 */}
                <div className="dl-undo-redo">
                  <button
                    type="button"
                    className="dl-undo-redo__btn"
                    onClick={() => {
                      const currentHistory = useDesignLabStore.getState().history;
                      if (currentHistory.length > 0) {
                        undo();
                        setTimeout(() => {
                          const newCanvas = useDesignLabStore.getState().canvas;
                          applySnapshotToCanvas(newCanvas);
                        }, 0);
                      }
                    }}
                    disabled={history.length === 0}
                    title="Undo (Ctrl+Z)"
                  >
                    ↶ Undo
                  </button>
                  <button
                    type="button"
                    className="dl-undo-redo__btn"
                    onClick={() => {
                      const currentFuture = useDesignLabStore.getState().future;
                      if (currentFuture.length > 0) {
                        redo();
                        setTimeout(() => {
                          const newCanvas = useDesignLabStore.getState().canvas;
                          applySnapshotToCanvas(newCanvas);
                        }, 0);
                      }
                    }}
                    disabled={future.length === 0}
                    title="Redo (Ctrl+Shift+Z)"
                  >
                    ↷ Redo
                  </button>
                </div>

                {/* 产品大图 */}
                {/* [2025-01-27 21:55:00] 调整图片尺寸为 1000x1200px，响应式布局 */}
                <div className="dl-visualization__image" style={{ position: 'relative' }}>
                  {/* [2025-11-21 11:15:00] 产品图片 - 确保显示在最底层 */}
                  <Image
                    src={currentVariant?.image || currentVariant?.baseImages?.front || currentVariant?.gallery?.[0] || "/assets/categories/cat-tshirt.png"}
                    alt={currentProduct?.name || "Product visualization"}
                    width={1000}
                    height={1200}
                    className="dl-visualization__img"
                    priority
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      const actualWidth = img.naturalWidth;
                      const actualHeight = img.naturalHeight;
                      const displayWidth = img.offsetWidth;
                      const displayHeight = img.offsetHeight;
                      console.log('[Design Lab] Product image loaded:', {
                        src: currentVariant?.image || currentVariant?.baseImages?.front,
                        naturalSize: `${actualWidth}x${actualHeight}`,
                        displaySize: `${displayWidth}x${displayHeight}`,
                        aspectRatio: (actualWidth / actualHeight).toFixed(2),
                        timestamp: new Date().toISOString()
                      });
                    }}
                    onError={(e) => {
                      console.error('[Design Lab] Failed to load product image:', {
                        error: e,
                        src: currentVariant?.image || currentVariant?.baseImages?.front,
                        fallback: "/assets/categories/cat-tshirt.png",
                        timestamp: new Date().toISOString()
                      });
                    }}
                    style={{
                      zIndex: 1,
                      position: 'relative',
                      display: 'block',
                      width: '1000px', /* [2025-01-27 22:17:00] 强制设置宽度为 1000px */
                      height: '1200px', /* [2025-01-27 22:17:00] 强制设置高度为 1200px */
                      minWidth: '1000px', /* 防止缩小 */
                      minHeight: '1200px', /* 防止缩小 */
                      maxWidth: '1000px',
                      maxHeight: '1200px',
                      objectFit: 'contain', /* 保持宽高比 */
                      flexShrink: 0, /* 防止 flex 容器缩小 */
                      boxSizing: 'border-box' /* 确保尺寸计算正确 */
                    } as React.CSSProperties}
                  />
                  {/* [2025-11-21 11:15:00] 画布覆盖层 - 透明背景，不遮挡产品图片 */}
                  <div className="dl-visualization__canvas-wrapper" style={{
                    position: 'absolute',
                    top: '20%', // Adjust based on product print area
                    left: '25%', // Adjust based on product print area
                    width: '50%', // Adjust based on product print area
                    height: '60%', // Adjust based on product print area
                    border: showPrintArea ? '1px dashed rgba(0,0,0,0.2)' : 'none',
                    pointerEvents: 'auto', // Ensure canvas receives events
                    backgroundColor: 'transparent', // [2025-11-21 11:15:00] 确保背景透明，不遮挡产品图片
                    zIndex: 2 // [2025-11-21 11:15:00] 画布在图片上方，但背景透明
                  }}>
                    <canvas
                      ref={canvasElementRef}
                      className="dl-visualization__canvas"
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'transparent' // [2025-11-21 11:15:00] 确保画布背景透明
                      }}
                    />
                  </div>
                </div>

                {/* 右侧垂直按钮栏 */}
                <div className="dl-view-buttons">
                  <button
                    type="button"
                    className={`dl-view-btn ${selectedView === 'front' ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedView('front');
                      handleViewSwitch('front');
                    }}
                  >
                    <div className="dl-view-btn__thumb">
                      <Image src="/assets/categories/cat-tshirt.png" alt="Front" width={40} height={40} />
                    </div>
                    <span className="dl-view-btn__label">Front</span>
                  </button>
                  <button
                    type="button"
                    className={`dl-view-btn ${selectedView === 'back' ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedView('back');
                      handleViewSwitch('back');
                    }}
                  >
                    <div className="dl-view-btn__thumb">
                      <Image src="/assets/categories/cat-tshirt.png" alt="Back" width={40} height={40} />
                    </div>
                    <span className="dl-view-btn__label">Back</span>
                  </button>
                  <button
                    type="button"
                    className={`dl-view-btn ${selectedView === 'sleeve' ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedView('sleeve');
                      handleViewSwitch('sleeve');
                    }}
                  >
                    <div className="dl-view-btn__thumb">
                      <Image src="/assets/categories/cat-tshirt.png" alt="Sleeve" width={40} height={40} />
                    </div>
                    <span className="dl-view-btn__label">Sleeve Design</span>
                  </button>
                  <button
                    type="button"
                    className={`dl-view-btn ${selectedView === 'zoom' ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedView('zoom');
                      handleViewSwitch('zoom');
                    }}
                  >
                    <div className="dl-view-btn__thumb">
                      <span className="dl-view-btn__icon">🔍</span>
                    </div>
                    <span className="dl-view-btn__label">Zoom</span>
                  </button>
                </div>

                {/* 底部操作栏 */}
                <div className="dl-actions-bar">
                  <button type="button" className="dl-actions-bar__save-share" onClick={handleShareDesign}>
                    <span>💾</span> Save | Share
                  </button>
                  <div className="dl-actions-bar__export">
                    <button
                      type="button"
                      className="dl-actions-bar__export-btn"
                      onClick={() => handleExportCanvas('png')}
                      disabled={exporting}
                      title="Export as PNG"
                    >
                      PNG
                    </button>
                    <button
                      type="button"
                      className="dl-actions-bar__export-btn"
                      onClick={() => handleExportCanvas('jpg')}
                      disabled={exporting}
                      title="Export as JPG"
                    >
                      JPG
                    </button>
                    <button
                      type="button"
                      className="dl-actions-bar__export-btn"
                      onClick={() => handleExportCanvas('svg')}
                      disabled={exporting}
                      title="Export as SVG"
                    >
                      SVG
                    </button>
                  </div>
                  <button type="button" className="dl-actions-bar__get-price" onClick={handleRequestQuote}>
                    Get Price
                  </button>
                </div>
              </div>
            </section>

            {/* [2025-01-27 23:00:00] 右侧编辑面板 */}
            {showEditPanel && (
              <aside className="dl-edit-panel">
                {selectedTextObject && (
                  <div className="dl-edit-panel__content">
                    <div className="dl-edit-panel__header">
                      <h3 className="dl-edit-panel__title">Edit Text</h3>
                      <button
                        type="button"
                        className="dl-edit-panel__close"
                        onClick={() => {
                          if (fabricCanvasRef.current) {
                            fabricCanvasRef.current.discardActiveObject();
                            fabricCanvasRef.current.renderAll();
                          }
                          setShowEditPanel(false);
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* 文本输入 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Text</label>
                      <input
                        type="text"
                        className="dl-edit-field__input"
                        value={selectedTextObject?.text || ''}
                        onChange={(e) => handleTextChange(e.target.value)}
                      />
                    </div>

                    {/* 字体选择 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Change Font</label>
                      <select
                        className="dl-edit-field__select"
                        value={selectedTextObject?.fontFamily || 'Arial'}
                        onChange={(e) => handleTextFontChange(e.target.value)}
                      >
                        <option value="Arial">Arial</option>
                        <option value="Avenir Bold Condensed">Avenir Bold Condensed</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Courier New">Courier New</option>
                      </select>
                    </div>

                    {/* 颜色选择 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Edit Color</label>
                      <div className="dl-edit-color">
                        <input
                          type="color"
                          className="dl-edit-color__input"
                          value={selectedTextObject?.fill || '#000000'}
                          onChange={(e) => handleTextColorChange(e.target.value)}
                        />
                        <span className="dl-edit-color__text">{selectedTextObject?.fill || 'White'}</span>
                        <span className="dl-edit-color__arrow">›</span>
                      </div>
                    </div>

                    {/* 旋转 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Rotation</label>
                      <div className="dl-edit-slider">
                        <input
                          type="range"
                          className="dl-edit-slider__input"
                          min="0"
                          max="360"
                          value={selectedTextObject?.angle || 0}
                          onChange={(e) => handleTextRotationChange(Number(e.target.value))}
                        />
                        <input
                          type="number"
                          className="dl-edit-slider__value"
                          value={selectedTextObject?.angle || 0}
                          onChange={(e) => handleTextRotationChange(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* 轮廓 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Outline</label>
                      <div className="dl-edit-outline">
                        <input
                          type="color"
                          className="dl-edit-outline__color"
                          value={selectedTextObject?.stroke || '#000000'}
                          onChange={(e) => {
                            if (selectedTextObject) {
                              selectedTextObject.set('stroke', e.target.value);
                              selectedTextObject.set('strokeWidth', selectedTextObject.strokeWidth || 1);
                              fabricCanvasRef.current?.renderAll();
                              handleCanvasChange();
                            }
                          }}
                        />
                        <input
                          type="number"
                          className="dl-edit-outline__width"
                          min="0"
                          max="20"
                          value={selectedTextObject?.strokeWidth || 0}
                          onChange={(e) => {
                            if (selectedTextObject) {
                              const width = Number(e.target.value);
                              selectedTextObject.set('strokeWidth', width);
                              if (width > 0 && !selectedTextObject.stroke) {
                                selectedTextObject.set('stroke', '#000000');
                              }
                              fabricCanvasRef.current?.renderAll();
                              handleCanvasChange();
                            }
                          }}
                          placeholder="Width"
                        />
                      </div>
                    </div>

                    {/* 文字形状 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Text Shape</label>
                      <button
                        type="button"
                        className="dl-edit-field__button"
                        onClick={async () => {
                          if (!selectedTextObject || !fabricCanvasRef.current) return;
                          const fabric = await ensureFabric();
                          // 创建弧形路径
                          const width = selectedTextObject.width || 200;
                          const height = 50;
                          const path = `M 0 ${height} Q ${width / 2} 0 ${width} ${height}`;
                          const pathObject = new fabric.Path(path, {
                            fill: '',
                            stroke: '',
                            strokeWidth: 0,
                            visible: false,
                          });
                          // 将文字转换为路径文字（简化实现）
                          // 实际实现需要更复杂的逻辑
                          alert('Text shape feature: This will convert text to follow a path. Advanced implementation required.');
                        }}
                      >
                        select shape ›
                      </button>
                    </div>

                    {/* 文字大小 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Text Size</label>
                      <input
                        type="number"
                        className="dl-edit-field__input"
                        value={selectedTextObject?.fontSize || 28}
                        onChange={(e) => handleTextSizeChange(Number(e.target.value))}
                      />
                    </div>

                    {/* [2025-12-02 执行 Custom Ink Plan] 底部操作区域 */}
                    {/* Center */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Center</label>
                      <button
                        type="button"
                        className="dl-edit-action-btn"
                        onClick={handleCenterObject}
                        title="Center object to canvas"
                      >
                        Center
                      </button>
                    </div>

                    {/* Layering */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Layering</label>
                      <div className="dl-edit-actions">
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={handleBringActiveToFront}
                          title="Bring to Front"
                        >
                          ↑ Front
                        </button>
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={handleSendActiveToBack}
                          title="Send to Back"
                        >
                          ↓ Back
                        </button>
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Text Alignment</label>
                      <div className="dl-edit-actions">
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={() => handleTextAlign('left')}
                          title="Left Align"
                        >
                          ⬅
                        </button>
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={() => handleTextAlign('center')}
                          title="Center Align"
                        >
                          ⚬
                        </button>
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={() => handleTextAlign('right')}
                          title="Right Align"
                        >
                          ➡
                        </button>
                      </div>
                    </div>

                    {/* Duplicate */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Duplicate</label>
                      <button
                        type="button"
                        className="dl-edit-action-btn"
                        onClick={handleDuplicateObject}
                        title="Duplicate (Ctrl+D)"
                      >
                        Duplicate
                      </button>
                    </div>

                    {/* 其他高级功能（可选） */}
                    {/* 字间距 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Character Spacing</label>
                      <div className="dl-edit-slider">
                        <input
                          type="range"
                          className="dl-edit-slider__input"
                          min="-10"
                          max="50"
                          value={selectedTextObject?.charSpacing || 0}
                          onChange={(e) => {
                            if (selectedTextObject) {
                              selectedTextObject.set('charSpacing', Number(e.target.value));
                              fabricCanvasRef.current?.renderAll();
                              handleCanvasChange();
                            }
                          }}
                        />
                        <input
                          type="number"
                          className="dl-edit-slider__value"
                          value={selectedTextObject?.charSpacing || 0}
                          onChange={(e) => {
                            if (selectedTextObject) {
                              selectedTextObject.set('charSpacing', Number(e.target.value));
                              fabricCanvasRef.current?.renderAll();
                              handleCanvasChange();
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* 行间距 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Line Height</label>
                      <div className="dl-edit-slider">
                        <input
                          type="range"
                          className="dl-edit-slider__input"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={selectedTextObject?.lineHeight || 1.2}
                          onChange={(e) => {
                            if (selectedTextObject) {
                              selectedTextObject.set('lineHeight', Number(e.target.value));
                              fabricCanvasRef.current?.renderAll();
                              handleCanvasChange();
                            }
                          }}
                        />
                        <input
                          type="number"
                          className="dl-edit-slider__value"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={selectedTextObject?.lineHeight || 1.2}
                          onChange={(e) => {
                            if (selectedTextObject) {
                              selectedTextObject.set('lineHeight', Number(e.target.value));
                              fabricCanvasRef.current?.renderAll();
                              handleCanvasChange();
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* 精确位置控制 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Position</label>
                      <div className="dl-edit-position">
                        <div className="dl-edit-position__row">
                          <label className="dl-edit-position__label">X:</label>
                          <input
                            type="number"
                            className="dl-edit-position__input"
                            value={Math.round(selectedTextObject?.left || 0)}
                            onChange={(e) => {
                              if (selectedTextObject) {
                                selectedTextObject.set('left', Number(e.target.value));
                                fabricCanvasRef.current?.renderAll();
                                handleCanvasChange();
                              }
                            }}
                          />
                          <label className="dl-edit-position__label">Y:</label>
                          <input
                            type="number"
                            className="dl-edit-position__input"
                            value={Math.round(selectedTextObject?.top || 0)}
                            onChange={(e) => {
                              if (selectedTextObject) {
                                selectedTextObject.set('top', Number(e.target.value));
                                fabricCanvasRef.current?.renderAll();
                                handleCanvasChange();
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="dl-edit-actions">
                      <button
                        type="button"
                        className="dl-edit-action-btn dl-edit-action-btn--danger"
                        onClick={handleDeleteObject}
                        title="Delete (Del)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {selectedImageObject && !selectedImageObject.isArt && (
                  <div className="dl-edit-panel__content">
                    <div className="dl-edit-panel__header">
                      <h3 className="dl-edit-panel__title">Edit Upload</h3>
                      <button
                        type="button"
                        className="dl-edit-panel__close"
                        onClick={() => {
                          if (fabricCanvasRef.current) {
                            fabricCanvasRef.current.discardActiveObject();
                            fabricCanvasRef.current.renderAll();
                          }
                          setShowEditPanel(false);
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* [2025-12-02 执行 Custom Ink Plan] Edit Upload 面板 - 按 Custom Ink 顺序排列 */}
                    {/* 1. Size (宽×高，单位 in) */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Size</label>
                      <div className="dl-edit-position">
                        <div className="dl-edit-position__row">
                          <label className="dl-edit-position__label">W:</label>
                          <input
                            type="number"
                            step="0.01"
                            className="dl-edit-position__input"
                            value={pixelsToInches((selectedImageObject?.width || 0) * (selectedImageObject?.scaleX || 1)).toFixed(2)}
                            onChange={(e) => {
                              if (selectedImageObject) {
                                const inches = Number(e.target.value);
                                const pixels = inchesToPixels(inches);
                                const newScale = pixels / (selectedImageObject.width || 1);
                                selectedImageObject.set('scaleX', newScale);
                                fabricCanvasRef.current?.renderAll();
                                handleCanvasChange();
                              }
                            }}
                          />
                          <span className="dl-edit-position__unit">in</span>
                          <label className="dl-edit-position__label">H:</label>
                          <input
                            type="number"
                            step="0.01"
                            className="dl-edit-position__input"
                            value={pixelsToInches((selectedImageObject?.height || 0) * (selectedImageObject?.scaleY || 1)).toFixed(2)}
                            onChange={(e) => {
                              if (selectedImageObject) {
                                const inches = Number(e.target.value);
                                const pixels = inchesToPixels(inches);
                                const newScale = pixels / (selectedImageObject.height || 1);
                                selectedImageObject.set('scaleY', newScale);
                                fabricCanvasRef.current?.renderAll();
                                handleCanvasChange();
                              }
                            }}
                          />
                          <span className="dl-edit-position__unit">in</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Center */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Center</label>
                      <button
                        type="button"
                        className="dl-edit-action-btn"
                        onClick={handleCenterObject}
                        title="Center object to canvas"
                      >
                        Center
                      </button>
                    </div>

                    {/* 3. Layering */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Layering</label>
                      <div className="dl-edit-actions">
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={handleBringActiveToFront}
                          title="Bring to Front"
                        >
                          ↑ Front
                        </button>
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={handleSendActiveToBack}
                          title="Send to Back"
                        >
                          ↓ Back
                        </button>
                      </div>
                    </div>

                    {/* 4. Flip */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Flip</label>
                      <div className="dl-edit-actions">
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={() => {
                            if (selectedImageObject) {
                              selectedImageObject.set('flipX', !selectedImageObject.flipX);
                              fabricCanvasRef.current?.renderAll();
                              handleCanvasChange();
                            }
                          }}
                          title="Flip Horizontal"
                        >
                          ↔
                        </button>
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={() => {
                            if (selectedImageObject) {
                              selectedImageObject.set('flipY', !selectedImageObject.flipY);
                              fabricCanvasRef.current?.renderAll();
                              handleCanvasChange();
                            }
                          }}
                          title="Flip Vertical"
                        >
                          ↕
                        </button>
                      </div>
                    </div>

                    {/* 5. Duplicate */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Duplicate</label>
                      <button
                        type="button"
                        className="dl-edit-action-btn"
                        onClick={handleDuplicateObject}
                        title="Duplicate (Ctrl+D)"
                      >
                        Duplicate
                      </button>
                    </div>

                    {/* 6. Crop */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Crop</label>
                      <button
                        type="button"
                        className="dl-edit-action-btn"
                        onClick={() => {
                          if (selectedImageObject && fabricCanvasRef.current) {
                            // 启用裁剪模式
                            selectedImageObject.set('selectable', true);
                            selectedImageObject.set('hasControls', true);
                            selectedImageObject.set('hasBorders', true);
                            fabricCanvasRef.current.setActiveObject(selectedImageObject);
                            fabricCanvasRef.current.renderAll();
                            // 提示用户可以通过调整控制点来裁剪
                            alert('Use the corner handles to crop the image. The image will be cropped when you finish adjusting.');
                          }
                        }}
                        title="Enable Crop Mode"
                      >
                        Enable Crop Mode
                      </button>
                    </div>

                    {/* 7. Rotation slider */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Rotation</label>
                      <div className="dl-edit-slider">
                        <input
                          type="range"
                          className="dl-edit-slider__input"
                          min="0"
                          max="360"
                          value={selectedImageObject?.angle || 0}
                          onChange={(e) => handleImageRotationChange(Number(e.target.value))}
                        />
                        <input
                          type="number"
                          className="dl-edit-slider__value"
                          value={selectedImageObject?.angle || 0}
                          onChange={(e) => handleImageRotationChange(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* [2025-12-02 执行 Custom Ink Plan] 其他高级功能（可选） */}
                    {/* 精确位置控制 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Position</label>
                      <div className="dl-edit-position">
                        <div className="dl-edit-position__row">
                          <label className="dl-edit-position__label">X:</label>
                          <input
                            type="number"
                            className="dl-edit-position__input"
                            value={Math.round(selectedImageObject?.left || 0)}
                            onChange={(e) => {
                              if (selectedImageObject) {
                                selectedImageObject.set('left', Number(e.target.value));
                                fabricCanvasRef.current?.renderAll();
                                handleCanvasChange();
                              }
                            }}
                          />
                          <label className="dl-edit-position__label">Y:</label>
                          <input
                            type="number"
                            className="dl-edit-position__input"
                            value={Math.round(selectedImageObject?.top || 0)}
                            onChange={(e) => {
                              if (selectedImageObject) {
                                selectedImageObject.set('top', Number(e.target.value));
                                fabricCanvasRef.current?.renderAll();
                                handleCanvasChange();
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 透明度 */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Opacity</label>
                      <div className="dl-edit-slider">
                        <input
                          type="range"
                          className="dl-edit-slider__input"
                          min="0"
                          max="100"
                          value={(selectedImageObject?.opacity || 1) * 100}
                          onChange={(e) => handleImageOpacityChange(Number(e.target.value))}
                        />
                        <input
                          type="number"
                          className="dl-edit-slider__value"
                          value={Math.round((selectedImageObject?.opacity || 1) * 100)}
                          onChange={(e) => handleImageOpacityChange(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="dl-edit-actions">
                      {fabricCanvasRef.current?.getActiveObject()?.type === 'group' && (
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={handleUngroup}
                          title="Ungroup"
                        >
                          📦
                        </button>
                      )}
                      <button
                        type="button"
                        className="dl-edit-action-btn dl-edit-action-btn--danger"
                        onClick={handleDeleteObject}
                        title="Delete (Del)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* [2025-12-02 执行 Custom Ink Plan] Edit Art 面板 */}
                {selectedImageObject && selectedImageObject.isArt && (
                  <div className="dl-edit-panel__content">
                    <div className="dl-edit-panel__header">
                      <h3 className="dl-edit-panel__title">Edit Art</h3>
                      <button
                        type="button"
                        className="dl-edit-panel__close"
                        onClick={() => {
                          if (fabricCanvasRef.current) {
                            fabricCanvasRef.current.discardActiveObject();
                            fabricCanvasRef.current.renderAll();
                          }
                          setShowEditPanel(false);
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* [2025-12-02 执行 Custom Ink Plan] Edit Art 面板 - 按 Custom Ink 顺序排列 */}
                    {/* 1. Art Size */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Art Size</label>
                      <div className="dl-edit-position">
                        <div className="dl-edit-position__row">
                          <label className="dl-edit-position__label">W:</label>
                          <input
                            type="number"
                            step="0.01"
                            className="dl-edit-position__input"
                            value={pixelsToInches((selectedImageObject?.width || 0) * (selectedImageObject?.scaleX || 1)).toFixed(2)}
                            onChange={(e) => {
                              if (selectedImageObject) {
                                const inches = Number(e.target.value);
                                const pixels = inchesToPixels(inches);
                                const newScale = pixels / (selectedImageObject.width || 1);
                                selectedImageObject.set('scaleX', newScale);
                                fabricCanvasRef.current?.renderAll();
                                handleCanvasChange();
                              }
                            }}
                          />
                          <span className="dl-edit-position__unit">in</span>
                          <label className="dl-edit-position__label">H:</label>
                          <input
                            type="number"
                            step="0.01"
                            className="dl-edit-position__input"
                            value={pixelsToInches((selectedImageObject?.height || 0) * (selectedImageObject?.scaleY || 1)).toFixed(2)}
                            onChange={(e) => {
                              if (selectedImageObject) {
                                const inches = Number(e.target.value);
                                const pixels = inchesToPixels(inches);
                                const newScale = pixels / (selectedImageObject.height || 1);
                                selectedImageObject.set('scaleY', newScale);
                                fabricCanvasRef.current?.renderAll();
                                handleCanvasChange();
                              }
                            }}
                          />
                          <span className="dl-edit-position__unit">in</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Center */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Center</label>
                      <button
                        type="button"
                        className="dl-edit-action-btn"
                        onClick={handleCenterObject}
                        title="Center object to canvas"
                      >
                        Center
                      </button>
                    </div>

                    {/* 3. Layering */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Layering</label>
                      <div className="dl-edit-actions">
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={handleBringActiveToFront}
                          title="Bring to Front"
                        >
                          ↑ Front
                        </button>
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={handleSendActiveToBack}
                          title="Send to Back"
                        >
                          ↓ Back
                        </button>
                      </div>
                    </div>

                    {/* 4. Flip */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Flip</label>
                      <div className="dl-edit-actions">
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={() => {
                            if (selectedImageObject) {
                              selectedImageObject.set('flipX', !selectedImageObject.flipX);
                              fabricCanvasRef.current?.renderAll();
                              handleCanvasChange();
                            }
                          }}
                          title="Flip Horizontal"
                        >
                          ↔
                        </button>
                        <button
                          type="button"
                          className="dl-edit-action-btn"
                          onClick={() => {
                            if (selectedImageObject) {
                              selectedImageObject.set('flipY', !selectedImageObject.flipY);
                              fabricCanvasRef.current?.renderAll();
                              handleCanvasChange();
                            }
                          }}
                          title="Flip Vertical"
                        >
                          ↕
                        </button>
                      </div>
                    </div>

                    {/* 5. Duplicate */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Duplicate</label>
                      <button
                        type="button"
                        className="dl-edit-action-btn"
                        onClick={handleDuplicateObject}
                        title="Duplicate (Ctrl+D)"
                      >
                        Duplicate
                      </button>
                    </div>

                    {/* 6. Rotation slider */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Rotation</label>
                      <div className="dl-edit-slider">
                        <input
                          type="range"
                          className="dl-edit-slider__input"
                          min="0"
                          max="360"
                          value={selectedImageObject?.angle || 0}
                          onChange={(e) => handleImageRotationChange(Number(e.target.value))}
                        />
                        <input
                          type="number"
                          className="dl-edit-slider__value"
                          value={selectedImageObject?.angle || 0}
                          onChange={(e) => handleImageRotationChange(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* 7. Make One Color */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Make One Color</label>
                      <button
                        type="button"
                        className="dl-edit-action-btn"
                        onClick={async () => {
                          if (!selectedImageObject) return;
                          // [2025-12-02 执行 Custom Ink Plan] Make One Color 功能占位
                          alert('Make One Color feature: This will convert the art to a single color. Advanced implementation required.');
                        }}
                        title="Make One Color"
                      >
                        Make One Color
                      </button>
                    </div>

                    {/* 8. Edit Colors */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Edit Colors</label>
                      <button
                        type="button"
                        className="dl-edit-action-btn"
                        onClick={async () => {
                          if (!selectedImageObject) return;
                          // [2025-12-02 执行 Custom Ink Plan] Edit Colors 功能占位
                          alert('Edit Colors feature: This will allow editing individual colors in the art. Advanced implementation required.');
                        }}
                        title="Edit Colors"
                      >
                        Edit Colors
                      </button>
                    </div>

                    {/* 9. Change Art */}
                    <div className="dl-edit-field">
                      <label className="dl-edit-field__label">Change Art</label>
                      <button
                        type="button"
                        className="dl-edit-action-btn"
                        onClick={() => {
                          setShowAddArtModal(true);
                          setShowEditPanel(false);
                        }}
                        title="Change Art"
                      >
                        Change Art
                      </button>
                    </div>

                    {/* 操作按钮 */}
                    <div className="dl-edit-actions">
                      <button
                        type="button"
                        className="dl-edit-action-btn dl-edit-action-btn--danger"
                        onClick={handleDeleteObject}
                        title="Delete (Del)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </aside>
            )}

            {/* [2025-01-27 23:00:00] 右侧图层列表面板 */}
            <aside className="dl-layers-panel">
              <div className="dl-layers-panel__header">
                <h3 className="dl-layers-panel__title">Layers</h3>
                <div className="dl-layers-panel__actions">
                  <button
                    type="button"
                    className={`dl-layers-panel__action-btn ${isMultiSelectMode ? 'is-active' : ''}`}
                    onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                    title="Multi-select mode"
                  >
                    ☑
                  </button>
                  {selectedLayerIds.size > 0 && (
                    <>
                      {selectedLayerIds.size >= 2 && (
                        <button
                          type="button"
                          className="dl-layers-panel__action-btn"
                          onClick={handleCreateGroup}
                          title="Group selected"
                        >
                          📦
                        </button>
                      )}
                      <button
                        type="button"
                        className="dl-layers-panel__action-btn"
                        onClick={handleBatchDelete}
                        title="Delete selected"
                      >
                        🗑️
                      </button>
                      <button
                        type="button"
                        className="dl-layers-panel__action-btn"
                        onClick={handleBatchLock}
                        title="Lock/Unlock selected"
                      >
                        🔒
                      </button>
                      <button
                        type="button"
                        className="dl-layers-panel__action-btn"
                        onClick={handleBatchVisibility}
                        title="Show/Hide selected"
                      >
                        👁️
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="dl-layers-panel__list">
                {layers.length === 0 ? (
                  <div className="dl-layers-panel__empty">No layers yet</div>
                ) : (
                  layers.map((layer) => {
                    const isActive = layer.id === activeObjectId;
                    const isSelected = selectedLayerIds.has(layer.id);
                    return (
                      <div
                        key={layer.id}
                        className={`dl-layer-item ${isActive ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''}`}
                        onClick={(e) => handleLayerMultiSelect(layer.id, e)}
                      >
                        {isMultiSelectMode && (
                          <input
                            type="checkbox"
                            className="dl-layer-item__checkbox"
                            checked={isSelected}
                            onChange={() => handleLayerMultiSelect(layer.id, { ctrlKey: true } as any)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="dl-layer-item__icon">
                          {layer.type === 'group' ? '📦' : layer.type === 'textbox' || layer.type === 'i-text' || layer.type === 'text' ? 'T' : '🖼️'}
                        </div>
                        <div className="dl-layer-item__info">
                          <div className="dl-layer-item__name">{layer.name}</div>
                          <div className="dl-layer-item__type">{layer.type}</div>
                        </div>
                        <div className="dl-layer-item__actions">
                          <button
                            type="button"
                            className="dl-layer-item__action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveLayerUp(layer.id);
                            }}
                            title="Move Up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="dl-layer-item__action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveLayerDown(layer.id);
                            }}
                            title="Move Down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="dl-layer-item__action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLayerVisibilityToggle(layer.id);
                            }}
                            title={layer.visible ? 'Hide' : 'Show'}
                          >
                            {layer.visible ? '👁️' : '👁️‍🗨️'}
                          </button>
                          <button
                            type="button"
                            className="dl-layer-item__action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLayerLockToggle(layer.id);
                            }}
                            title={layer.locked ? 'Unlock' : 'Lock'}
                          >
                            {layer.locked ? '🔒' : '🔓'}
                          </button>
                          {layer.type === 'group' && (
                            <button
                              type="button"
                              className="dl-layer-item__action"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLayerSelect(layer.id);
                                handleUngroup();
                              }}
                              title="Ungroup"
                            >
                              📦
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {/* 产品详情部分 */}
            <section className="dl-product-details">
              <div className="dl-product-details__content">
                <h1 className="dl-product-details__title">Gildan Softstyle Jersey T-shirt</h1>
                <p className="dl-product-details__description">
                  Trendy and budget-friendly - what&apos;s not to love about this style? Try this on for size: a lightweight and comfortable fabric with an exciting color palette, all at an affordable price. An excellent choice for your next event!
                </p>

                {/* Size & Fit Guide */}
                <div className="dl-product-details__section">
                  <div className="dl-product-details__section-header" onClick={() => toggleSection('sizeFit')}>
                    <h3 className="dl-product-details__section-title">Size & Fit Guide</h3>
                    <button
                      type="button"
                      className="dl-product-details__toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection('sizeFit');
                      }}
                    >
                      {expandedSections.sizeFit ? '×' : '+'}
                    </button>
                  </div>
                  {expandedSections.sizeFit && (
                    <div className="dl-product-details__section-content">
                      <p className="dl-product-details__sizes">Adult Sizes: XS | S | M | L | XL | 2XL | 3XL | 5XL</p>
                      <p className="dl-product-details__fit">Fit: Semi-fitted: closer fit; skims body, chest, & arms</p>
                      <Link href="/size-guide" className="dl-product-details__link">
                        <span>👥</span> View Sizing Guide
                      </Link>
                    </div>
                  )}
                </div>

                {/* 额外产品视图 */}
                <div className="dl-product-details__views">
                  <div className="dl-product-details__main-view">
                    <Image
                      src={productImages[productImageIndex]}
                      alt="Product view"
                      width={600}
                      height={800}
                      className="dl-product-details__main-image"
                    />
                  </div>
                  <div className="dl-product-details__thumbnails">
                    <button
                      type="button"
                      className="dl-product-details__thumb-nav dl-product-details__thumb-nav--prev"
                      onClick={() => setProductImageIndex(Math.max(0, productImageIndex - 1))}
                    >
                      ‹
                    </button>
                    <div className="dl-product-details__thumb-grid">
                      {productImages.map((img, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`dl-product-details__thumb ${index === productImageIndex ? 'is-active' : ''}`}
                          onClick={() => setProductImageIndex(index)}
                        >
                          <Image src={img} alt={`View ${index + 1}`} width={80} height={100} />
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="dl-product-details__thumb-nav dl-product-details__thumb-nav--next"
                      onClick={() => setProductImageIndex(Math.min(productImages.length - 1, productImageIndex + 1))}
                    >
                      ›
                    </button>
                  </div>
                </div>

                {/* 可展开部分 */}
                <div className="dl-product-details__expandable">
                  <div className="dl-product-details__expandable-item">
                    <div className="dl-product-details__expandable-header" onClick={() => toggleSection('shipping')}>
                      <h4 className="dl-product-details__expandable-title">Shipping</h4>
                      <span className="dl-product-details__expandable-icon">{expandedSections.shipping ? '−' : '+'}</span>
                    </div>
                    {expandedSections.shipping && (
                      <div className="dl-product-details__expandable-content">
                        <p>Shipping information and delivery options...</p>
                      </div>
                    )}
                  </div>
                  <div className="dl-product-details__expandable-item">
                    <div className="dl-product-details__expandable-header" onClick={() => toggleSection('moreDetails')}>
                      <h4 className="dl-product-details__expandable-title">More Details</h4>
                      <span className="dl-product-details__expandable-icon">{expandedSections.moreDetails ? '−' : '+'}</span>
                    </div>
                    {expandedSections.moreDetails && (
                      <div className="dl-product-details__expandable-content">
                        <p>Additional product details...</p>
                      </div>
                    )}
                  </div>
                  <div className="dl-product-details__expandable-item">
                    <div className="dl-product-details__expandable-header" onClick={() => toggleSection('printAreas')}>
                      <h4 className="dl-product-details__expandable-title">Special Print Areas</h4>
                      <span className="dl-product-details__expandable-icon">{expandedSections.printAreas ? '−' : '+'}</span>
                    </div>
                    {expandedSections.printAreas && (
                      <div className="dl-product-details__expandable-content">
                        <p>Information about special print areas...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* [2025-01-27 20:00:00] Buy more, save more 部分 */}
        <section className="dl-buy-more">
          <div className="container">
            <h2 className="dl-buy-more__title">Buy more, save more</h2>
            <p className="dl-buy-more__description">Add your design to more styles and colors that work for everyone and boost your volume discount.</p>

            <div className="dl-buy-more__grid">
              {recommendedProducts.map((product) => (
                <div key={product.id} className="dl-buy-more__card">
                  <Image src={product.image} alt={product.name} width={200} height={250} className="dl-buy-more__card-image" />
                  <h3 className="dl-buy-more__card-title">{product.name}</h3>
                  <p className="dl-buy-more__card-color">{product.color}</p>
                  <button type="button" className="dl-buy-more__card-btn">{product.action}</button>
                </div>
              ))}
              {/* "More products that your group will love" 卡片 */}
              <div className="dl-buy-more__special-card">
                <div className="dl-buy-more__special-icons">
                  <span className="dl-buy-more__special-icon">👕</span>
                  <span className="dl-buy-more__special-icon">🧥</span>
                  <span className="dl-buy-more__special-icon">👔</span>
                </div>
                <button type="button" className="dl-buy-more__special-btn">Browse More</button>
              </div>
            </div>
          </div>
        </section>

        {/* [2025-01-27 20:00:00] 底部行动号召 */}
        <section className="dl-footer-cta">
          <div className="container">
            <p className="dl-footer-cta__text">We&apos;ve got even more styles to suit your group and your budget.</p>
            <button type="button" className="dl-footer-cta__btn">Browse more styles</button>
          </div>
        </section>

        {/* [2025-01-27 21:00:00] 上传文件模态框 */}
        {showUploadModal && (
          <div className="dl-modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="dl-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dl-modal__header">
                <button type="button" className="dl-modal__back" onClick={() => setShowUploadModal(false)}>←</button>
                <h2 className="dl-modal__title">Choose File To Upload</h2>
                <button type="button" className="dl-modal__close" onClick={() => setShowUploadModal(false)}>×</button>
              </div>
              <div className="dl-modal__body">
                <div className="dl-upload-area">
                  <button 
                    type="button" 
                    className="dl-upload-btn" 
                    onClick={() => {
                      const timestamp = new Date().toISOString();
                      console.log('[Upload] ===== BROWSE BUTTON CLICKED =====', {
                        timestamp,
                        fileInputRefExists: !!fileInputRef.current,
                        fileInputElement: fileInputRef.current ? {
                          type: fileInputRef.current.type,
                          accept: fileInputRef.current.accept,
                          style: fileInputRef.current.style.display
                        } : 'null'
                      });
                      
                      if (fileInputRef.current) {
                        console.log('[Upload] 📋 Calling fileInputRef.current.click()...', { timestamp });
                        fileInputRef.current.click();
                        console.log('[Upload] ✅ fileInputRef.current.click() called', { timestamp });
                      } else {
                        console.error('[Upload] ❌ fileInputRef.current is null!', { timestamp });
                        setError('文件输入框未初始化，请刷新页面重试');
                      }
                    }}
                  >
                    Browse Your Computer
                  </button>
                  <div className="dl-upload-divider">
                    <span>or</span>
                  </div>
                  <p className="dl-upload-drag">Drag & Drop Anywhere</p>
                </div>
                <div className="dl-upload-info">
                  <span className="dl-upload-info__icon">💡</span>
                  <p className="dl-upload-info__text">Vector or high resolution artwork of 300 DPI or more will look the best. Max size of 20 MB.</p>
                  <span className="dl-upload-info__info">ℹ</span>
                </div>
                <div className="dl-upload-help">
                  <p>Need help with your upload?</p>
                  <p>
                    <Link href="/chat" className="dl-upload-help__link">Chat now</Link> or email <Link href="mailto:service@customink.com" className="dl-upload-help__link">service@customink.com</Link>
                  </p>
                </div>
                <div className="dl-upload-feedback">
                  <p>How would you <Link href="#" className="dl-upload-feedback__link">rate our upload experience?</Link></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* [2025-01-28] 改进的文本模态框，添加字体、颜色、大小、旋转选项（参考 native 版本） */}
        {showAddTextModal && (
          <div className="dl-modal-overlay" onClick={() => setShowAddTextModal(false)}>
            <div className="dl-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dl-modal__header">
                <h2 className="dl-modal__title">Add Text</h2>
                <button type="button" className="dl-modal__close" onClick={() => setShowAddTextModal(false)}>×</button>
              </div>
              <div className="dl-modal__body">
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    className="dl-text-input"
                    placeholder="Enter text here"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    autoFocus
                    style={{ width: '100%', padding: '8px', marginBottom: '12px' }}
                  />
                  <button
                    type="button"
                    className="dl-add-btn"
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    onClick={() => {
                      handleAddText(textInput.trim() || 'Your Text', {
                        fontFamily: textFont,
                        fill: textColor,
                        fontSize: textSize,
                        rotation: textRotation,
                      });
                      setShowAddTextModal(false);
                      setTextInput('Your Text');
                    }}
                  >
                    Add To Design
                  </button>
                </div>
                
                {/* [2025-01-28] 字体选择 */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Change Font</label>
                  <select
                    value={textFont}
                    onChange={(e) => setTextFont(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  >
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                </div>
                
                {/* [2025-01-28] 颜色选择器（默认白色） */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Edit Color</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    style={{ width: '100%', height: '40px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                  />
                </div>
                
                {/* [2025-01-28] 字体大小滑块 */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Text Size: <span style={{ fontWeight: 'bold' }}>{textSize}</span>
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="200"
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                
                {/* [2025-01-28] 旋转滑块 */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Rotation: <span style={{ fontWeight: 'bold' }}>{textRotation}°</span>
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={textRotation}
                    onChange={(e) => setTextRotation(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* [2025-01-27 21:00:00] 添加艺术模态框 */}
        {showAddArtModal && (
          <div className="dl-modal-overlay" onClick={() => setShowAddArtModal(false)}>
            <div className="dl-modal dl-modal--large" onClick={(e) => e.stopPropagation()}>
              <div className="dl-modal__header">
                <h2 className="dl-modal__title">Artwork Categories</h2>
                <button type="button" className="dl-modal__close" onClick={() => setShowAddArtModal(false)}>×</button>
              </div>
              <div className="dl-modal__body">
                {selectedArtCategory ? (
                  <div>
                    <button
                      className="dl-back-btn"
                      onClick={() => setSelectedArtCategory(null)}
                      style={{ marginBottom: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                    >
                      ← Back to Categories
                    </button>
                    <h3 style={{ marginBottom: '12px' }}>{selectedArtCategory}</h3>
                    {loadingArtAssets && (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        Loading art assets...
                      </div>
                    )}
                    <div className="dl-art-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                      {mergedArtAssets[selectedArtCategory]?.map((art, index) => (
                        <button
                          key={art.id || index}
                          type="button"
                          className="dl-art-item"
                          style={{
                            fontSize: art.type === 'emoji' ? '32px' : '14px',
                            padding: '12px',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            background: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: art.type === 'image' ? '80px' : 'auto',
                            position: 'relative'
                          }}
                          onClick={async () => {
                            if (art.type === 'emoji') {
                              handleAddText(art.content);
                            } else if (art.type === 'image' && art.imageUrl) {
                              // [2025-12-02 执行 Custom Ink Plan] 标记为 Art 来源
                              await addImageFromUrl(art.imageUrl, true);
                            }
                            setShowAddArtModal(false);
                            setSelectedArtCategory(null);
                          }}
                        >
                          {art.type === 'emoji' ? (
                            art.content
                          ) : (
                            <Image
                              src={art.imageUrl || ''}
                              alt={art.content}
                              width={60}
                              height={60}
                              style={{ objectFit: 'contain' }}
                            />
                          )}
                        </button>
                      ))}
                      {(!mergedArtAssets[selectedArtCategory] || mergedArtAssets[selectedArtCategory].length === 0) && !loadingArtAssets && (
                        <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: '#666' }}>
                          No art assets in this category
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* [2025-01-28] 基本形状网格（参考 native 版本） */}
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Basic Shapes</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => handleAddArt('star')}
                          style={{
                            padding: '12px',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            background: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '60px',
                          }}
                          aria-label="Star"
                        >
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#3b82f6' }}>
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddArt('heart')}
                          style={{
                            padding: '12px',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            background: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '60px',
                          }}
                          aria-label="Heart"
                        >
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#ff1f3d' }}>
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddArt('circle')}
                          style={{
                            padding: '12px',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            background: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '60px',
                          }}
                          aria-label="Circle"
                        >
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#3b82f6' }}>
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddArt('triangle')}
                          style={{
                            padding: '12px',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            background: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '60px',
                          }}
                          aria-label="Triangle"
                        >
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#3b82f6' }}>
                            <path d="M12 2L2 22h20L12 2z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddArt('square')}
                          style={{
                            padding: '12px',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            background: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '60px',
                          }}
                          aria-label="Square"
                        >
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#3b82f6' }}>
                            <rect x="3" y="3" width="18" height="18" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="dl-search-box">
                      <span className="dl-search-box__icon">🔍</span>
                      <input type="text" className="dl-search-box__input" placeholder="Search For Artwork" />
                    </div>
                    <div className="dl-artwork-categories">
                      {Object.keys(mergedArtAssets).map((category) => {
                        const categoryAssets = mergedArtAssets[category] || [];
                        const emojiCount = categoryAssets.filter(a => a.type === 'emoji').length;
                        const imageCount = categoryAssets.filter(a => a.type === 'image').length;
                        return (
                          <button
                            key={category}
                            type="button"
                            className="dl-artwork-category"
                            onClick={() => setSelectedArtCategory(category)}
                          >
                            <span className="dl-artwork-category__icon">
                              {category === 'Emojis' ? '😊' : category === 'Shapes & Symbols' ? '⭐' : category === 'Sports & Games' ? '⚽' : category === 'Letters & Numbers' ? 'ABC' : category === 'Animals' ? '🐱' : category === 'Mascots' ? '🐾' : category === 'Nature' ? '🌲' : '🇺🇸'}
                            </span>
                            <span className="dl-artwork-category__name">
                              {category}
                              {imageCount > 0 && (
                                <span style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>
                                  ({emojiCount} emojis, {imageCount} images)
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* [2025-01-27 21:00:00] 产品颜色选择模态框 */}
        {showProductColorsModal && (
          <div className="dl-modal-overlay" onClick={() => setShowProductColorsModal(false)}>
            <div className="dl-modal dl-modal--large" onClick={(e) => e.stopPropagation()}>
              <div className="dl-modal__header">
                <h2 className="dl-modal__title">Choose Your Product Color</h2>
                <button type="button" className="dl-modal__close" onClick={() => setShowProductColorsModal(false)}>×</button>
              </div>
              <div className="dl-modal__body">
                <div className="dl-colors-section">
                  <div className="dl-colors-section__header">
                    <h3 className="dl-colors-section__title">Colors:</h3>
                    <div className="dl-colors-section__toggle">
                      <span>Ordering fewer than 6?</span>
                      <label className="dl-toggle">
                        <input type="checkbox" checked={orderFewerThan6} onChange={(e) => setOrderFewerThan6(e.target.checked)} />
                        <span className="dl-toggle__slider"></span>
                      </label>
                      <span className="dl-info-icon">ℹ</span>
                    </div>
                  </div>
                  <div className="dl-colors-grid">
                    {['#FFFFFF', '#F5F5DC', '#C0C0C0', '#808080', '#000000', '#000080', '#4169E1', '#00CED1', '#800080', '#800020', '#FFC0CB', '#FF0000', '#FFA500', '#FFFF00', '#808000', '#008000', '#8B4513'].map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`dl-color-swatch ${selectedColor === color ? 'is-selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColor(color)}
                      >
                        {selectedColor === color && <span className="dl-color-swatch__check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="dl-sizes-section">
                  <h3 className="dl-sizes-section__title">Sizes Available in:</h3>
                  <div className="dl-sizes-section__color">
                    <div className="dl-sizes-section__swatch" style={{ backgroundColor: '#808080' }}></div>
                    <span>Heather Dark Grey</span>
                  </div>
                  <div className="dl-sizes-list">
                    {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'].map((size) => (
                      <span key={size} className={`dl-size ${size === '4XL' ? 'is-unavailable' : ''}`}>
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="dl-add-color-section">
                  <span className="dl-add-color-section__icon">👕</span>
                  <div>
                    <p className="dl-add-color-section__text">Add this product in another color</p>
                    <Link href="#" className="dl-add-color-section__link">Pick another color</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* [2025-01-27 21:00:00] 添加名称模态框 */}
        {showAddNamesModal && (
          <div className="dl-modal-overlay" onClick={() => setShowAddNamesModal(false)}>
            <div className="dl-modal dl-modal--large" onClick={(e) => e.stopPropagation()}>
              <div className="dl-modal__header">
                <h2 className="dl-modal__title">Names and Numbers</h2>
                <button type="button" className="dl-modal__close" onClick={() => setShowAddNamesModal(false)}>×</button>
              </div>
              <div className="dl-modal__body">
                <div className="dl-names-image">
                  <Image src="/assets/categories/cat-tshirt.png" alt="Team jerseys" width={600} height={400} />
                </div>
                <p className="dl-names-description">
                  Use personalized Names & Numbers for projects like team jerseys where you need a unique name and/or number for each item.
                </p>
                <button
                  type="button"
                  className="dl-add-btn"
                  onClick={() => {
                    setShowAddNamesModal(false);
                    setShowNamesToolsModal(true);
                  }}
                >
                  Add Names and Numbers
                </button>
              </div>
            </div>
          </div>
        )}

        {/* [2025-01-27 21:00:00] 名称和数字工具模态框 */}
        {showNamesToolsModal && (
          <div className="dl-modal-overlay" onClick={() => setShowNamesToolsModal(false)}>
            <div className="dl-modal dl-modal--large" onClick={(e) => e.stopPropagation()}>
              <div className="dl-modal__header">
                <h2 className="dl-modal__title">Names and Numbers Tools</h2>
                <button type="button" className="dl-modal__close" onClick={() => setShowNamesToolsModal(false)}>×</button>
              </div>
              <div className="dl-modal__body">
                <div className="dl-names-tools-step">
                  <h3 className="dl-names-tools-step__title">Step 1:</h3>
                  <div className="dl-names-tools-options">
                    <label className="dl-checkbox">
                      <input type="checkbox" checked={addNames} onChange={(e) => setAddNames(e.target.checked)} />
                      <span>Add Names</span>
                    </label>
                    <label className="dl-checkbox">
                      <input type="checkbox" checked={addNumbers} onChange={(e) => setAddNumbers(e.target.checked)} />
                      <span>Add Numbers</span>
                    </label>
                  </div>
                  <div className="dl-names-tools-row">
                    <label className="dl-names-tools-label">Side:</label>
                    <select className="dl-select" value={nameSide} onChange={(e) => setNameSide(e.target.value)}>
                      <option>Front</option>
                      <option>Back</option>
                    </select>
                    <select className="dl-select" value={numberSide} onChange={(e) => setNumberSide(e.target.value)}>
                      <option>Front</option>
                      <option>Back</option>
                    </select>
                  </div>
                  <div className="dl-names-tools-row">
                    <label className="dl-names-tools-label">Height:</label>
                    <select className="dl-select" value={nameHeight} onChange={(e) => setNameHeight(e.target.value)}>
                      <option>2 In</option>
                      <option>3 In</option>
                      <option>4 In</option>
                    </select>
                    <select className="dl-select" value={numberHeight} onChange={(e) => setNumberHeight(e.target.value)}>
                      <option>6 In</option>
                      <option>8 In</option>
                      <option>10 In</option>
                    </select>
                  </div>
                  <div className="dl-names-tools-row">
                    <label className="dl-names-tools-label">Color:</label>
                    <div className="dl-color-selector">
                      <span>{nameColor}</span>
                      <div className="dl-color-selector__swatch" style={{ backgroundColor: '#000000' }}></div>
                    </div>
                    <div className="dl-color-selector">
                      <span>{numberColor}</span>
                      <div className="dl-color-selector__swatch" style={{ backgroundColor: '#000000' }}></div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="dl-add-btn dl-add-btn--full"
                  onClick={() => {
                    // [2025-12-02 执行 Custom Ink Plan] 进入 Step 2: Enter Names/Numbers 列表页
                    setShowNamesToolsModal(false);
                    setShowNamesListModal(true);
                  }}
                >
                  Step 2: Enter Names/Numbers
                </button>
                <div className="dl-pricing-info">
                  <p className="dl-pricing-info__title">Full list required for accurate pricing</p>
                  <p>Names: $5.50 each item</p>
                  <p>Numbers: $3.50 each item</p>
                </div>
                <div className="dl-pricing-notes">
                  <p>• &apos;EXAMPLE&apos; and &apos;00&apos; are sample placeholders</p>
                  <p>• Our artists will expertly place each name/number from your list</p>
                  <p>• Names/numbers may be printed or vinyl</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* [2025-01-27 22:00:00] "What do you want to do with your design?" 模态框 */}
        {showDesignActionModal && (
          <div className="dl-modal-overlay" onClick={() => setShowDesignActionModal(false)}>
            <div className="dl-modal dl-modal--medium" onClick={(e) => e.stopPropagation()}>
              <div className="dl-modal__header">
                <button type="button" className="dl-modal__back" onClick={() => setShowDesignActionModal(false)}>←</button>
                <h2 className="dl-modal__title">What do you want to do with your design?</h2>
                <button type="button" className="dl-modal__close" onClick={() => setShowDesignActionModal(false)}>×</button>
              </div>
              <div className="dl-modal__body">
                <div className="dl-design-action-options">
                  <button
                    type="button"
                    className={`dl-design-action-card ${designAction === 'buy-ship' ? 'is-selected' : ''}`}
                    onClick={() => setDesignAction('buy-ship')}
                  >
                    {designAction === 'buy-ship' && (
                      <span className="dl-design-action-card__check">✓</span>
                    )}
                    <h3 className="dl-design-action-card__title">Buy & Ship</h3>
                    <p className="dl-design-action-card__description">
                      Enter your order details and ship to one or multiple addresses right away. You can also collect sizes, addresses, and payments from your group.
                    </p>
                  </button>
                  <button
                    type="button"
                    className={`dl-design-action-card ${designAction === 'fundraiser' ? 'is-selected' : ''}`}
                    onClick={() => setDesignAction('fundraiser')}
                  >
                    {designAction === 'fundraiser' && (
                      <span className="dl-design-action-card__check">✓</span>
                    )}
                    <h3 className="dl-design-action-card__title">Start a Fundraiser</h3>
                    <p className="dl-design-action-card__description">
                      Sell your designs online to raise money and spread awareness for your cause. You can build your own campaign page and even accept donations.
                    </p>
                  </button>
                </div>
                <div className="dl-modal__footer">
                  <button
                    type="button"
                    className="dl-continue-btn"
                    onClick={() => {
                      setShowDesignActionModal(false);
                      setShowOrderingOptionsModal(true);
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* [2025-01-27 22:00:00] "Ordering Options" 模态框 */}
        {showOrderingOptionsModal && (
          <div className="dl-modal-overlay" onClick={() => setShowOrderingOptionsModal(false)}>
            <div className="dl-modal dl-modal--large" onClick={(e) => e.stopPropagation()}>
              <div className="dl-modal__header">
                <button type="button" className="dl-modal__back" onClick={() => {
                  setShowOrderingOptionsModal(false);
                  setShowDesignActionModal(true);
                }}>←</button>
                <h2 className="dl-modal__title">Ordering Options</h2>
                <button type="button" className="dl-modal__close" onClick={() => setShowOrderingOptionsModal(false)}>×</button>
              </div>
              <div className="dl-modal__body">
                {/* 1. Shipping */}
                <div className="dl-ordering-section">
                  <h3 className="dl-ordering-section__number">1.</h3>
                  <div className="dl-ordering-section__content">
                    <h4 className="dl-ordering-section__title">Shipping:</h4>
                    <div className="dl-ordering-options">
                      <button
                        type="button"
                        className={`dl-ordering-option ${shippingOption === 'single' ? 'is-selected' : ''}`}
                        onClick={() => setShippingOption('single')}
                      >
                        {shippingOption === 'single' && <span className="dl-ordering-option__check">✓</span>}
                        <span className="dl-ordering-option__text">Ship to single address</span>
                      </button>
                      <button
                        type="button"
                        className={`dl-ordering-option ${shippingOption === 'multiple' ? 'is-selected' : ''}`}
                        onClick={() => setShippingOption('multiple')}
                      >
                        {shippingOption === 'multiple' && <span className="dl-ordering-option__check">✓</span>}
                        <span className="dl-ordering-option__text">Ship to multiple addresses</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Sizes and Quantities */}
                <div className="dl-ordering-section">
                  <h3 className="dl-ordering-section__number">2.</h3>
                  <div className="dl-ordering-section__content">
                    <h4 className="dl-ordering-section__title">Sizes and Quantities:</h4>
                    <div className="dl-ordering-options">
                      <button
                        type="button"
                        className={`dl-ordering-option ${sizesOption === 'know' ? 'is-selected' : ''}`}
                        onClick={() => setSizesOption('know')}
                      >
                        {sizesOption === 'know' && <span className="dl-ordering-option__check">✓</span>}
                        <span className="dl-ordering-option__text">I know the sizes I need</span>
                      </button>
                      <button
                        type="button"
                        className={`dl-ordering-option ${sizesOption === 'invite' ? 'is-selected' : ''}`}
                        onClick={() => setSizesOption('invite')}
                      >
                        {sizesOption === 'invite' && <span className="dl-ordering-option__check">✓</span>}
                        <span className="dl-ordering-option__text">Invite my group to choose their sizes</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Payment */}
                <div className="dl-ordering-section">
                  <h3 className="dl-ordering-section__number">3.</h3>
                  <div className="dl-ordering-section__content">
                    <h4 className="dl-ordering-section__title">Payment:</h4>
                    <div className="dl-ordering-options">
                      <button
                        type="button"
                        className={`dl-ordering-option ${paymentOption === 'pay-all' ? 'is-selected' : ''}`}
                        onClick={() => setPaymentOption('pay-all')}
                      >
                        {paymentOption === 'pay-all' && <span className="dl-ordering-option__check">✓</span>}
                        <span className="dl-ordering-option__text">I will pay for the entire order</span>
                      </button>
                      <button
                        type="button"
                        className={`dl-ordering-option ${paymentOption === 'invite-pay' ? 'is-selected' : ''}`}
                        onClick={() => setPaymentOption('invite-pay')}
                      >
                        {paymentOption === 'invite-pay' && <span className="dl-ordering-option__check">✓</span>}
                        <span className="dl-ordering-option__text">Invite my group to pay for their order</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="dl-delivery-info">
                  <p className="dl-delivery-info__text">
                    Get it by <strong>Tue, Dec. 2nd</strong> with <strong>FREE delivery</strong>
                  </p>
                  <p className="dl-delivery-info__text">
                    or as soon as <strong>Thursday, Nov. 20th</strong> with <strong>Super Rush delivery</strong> (select options in cart)
                  </p>
                </div>

                <div className="dl-modal__footer">
                  <button
                    type="button"
                    className="dl-continue-btn"
                    onClick={() => {
                      setShowOrderingOptionsModal(false);
                      setShowQuantityModal(true);
                    }}
                  >
                    Continue to Sizes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* [2025-01-27 22:00:00] "Quantity" 模态框 */}
        {showQuantityModal && (
          <div className="dl-modal-overlay" onClick={() => setShowQuantityModal(false)}>
            <div className="dl-modal dl-modal--extra-large" onClick={(e) => e.stopPropagation()}>
              <div className="dl-modal__header">
                <button type="button" className="dl-modal__back" onClick={() => {
                  setShowQuantityModal(false);
                  setShowOrderingOptionsModal(true);
                }}>←</button>
                <h2 className="dl-modal__title">{showBuyMoreView ? 'Buy more, save more' : 'Quantity'}</h2>
                <button type="button" className="dl-modal__close" onClick={() => {
                  setShowQuantityModal(false);
                  setShowBuyMoreView(false);
                }}>×</button>
              </div>
              <div className="dl-modal__body">
                {!showBuyMoreView ? (
                  <>
                    <h3 className="dl-quantity-title">How many do you need?</h3>
                    <p className="dl-quantity-description">
                      Don&apos;t know exact sizes yet? Estimate a total quantity for a more accurate price.
                    </p>

                    {/* 产品详情 */}
                    <div className="dl-quantity-product">
                      <Image src="/assets/categories/cat-tshirt.png" alt="Product" width={64} height={80} className="dl-quantity-product__image" />
                      <div className="dl-quantity-product__info">
                        <h4 className="dl-quantity-product__name">Gildan Softstyle Jersey T-shirt</h4>
                        <p className="dl-quantity-product__color">Color: Heather Dark Grey <Link href="#" className="dl-quantity-product__link">Add another color</Link></p>
                        <Link href="#" className="dl-quantity-product__link">View Sizing Guide</Link>
                      </div>
                    </div>

                    {/* 尺寸选择 */}
                    <div className="dl-quantity-sizes">
                      <h4 className="dl-quantity-sizes__label">ADULT</h4>
                      <div className="dl-quantity-sizes__grid">
                        {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'].map((size) => (
                          <div key={size} className="dl-quantity-size-item">
                            <label className="dl-quantity-size-item__label">{size}</label>
                            <input
                              type="number"
                              className="dl-quantity-size-item__input"
                              min="0"
                              value={sizeQuantities[size] || 0}
                              onChange={(e) => handleSizeQuantityChange(size, parseInt(e.target.value) || 0)}
                            />
                            {size === 'XL' && <span className="dl-quantity-size-item__upcharge">+$2.50</span>}
                            {size === '2XL' && <span className="dl-quantity-size-item__upcharge">+$3.50</span>}
                            {size === '3XL' && <span className="dl-quantity-size-item__upcharge">+$4.50</span>}
                            {size === '4XL' && <span className="dl-quantity-size-item__upcharge">+$5.50</span>}
                            {size === '5XL' && <span className="dl-quantity-size-item__upcharge">+$5.50</span>}
                          </div>
                        ))}
                      </div>
                      <button type="button" className="dl-add-womens-btn">+ Add Women&apos;s</button>
                    </div>

                    {/* Buy more, save more */}
                    <div className="dl-quantity-buy-more">
                      <h4 className="dl-quantity-buy-more__title">Buy more, save more</h4>
                      <p className="dl-quantity-buy-more__description">
                        Add your design to more styles and colors that work for everyone and boost your volume discount.
                      </p>
                      <button
                        type="button"
                        className="dl-quantity-buy-more__toggle"
                        onClick={() => setShowBuyMoreView(true)}
                      >
                        View recommended products
                      </button>
                    </div>

                    {/* Total and Continue */}
                    <div className="dl-quantity-footer">
                      <span className="dl-quantity-footer__total">Total Quantity: {totalQuantity}</span>
                      <button
                        type="button"
                        className="dl-continue-btn"
                        onClick={() => {
                          setShowQuantityModal(false);
                          setShowOrderOptionsPanel(true);
                        }}
                      >
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="dl-quantity-title">Buy more, save more</h3>
                    <p className="dl-quantity-description">
                      Add your design to more styles and colors that work for everyone and boost your volume discount.
                    </p>

                    <div className="dl-quantity-recommended">
                      {[
                        { name: "Gildan Women's Midweight Softstyle Jersey T-shirt", colors: "10 Colors Available", image: '/assets/categories/cat-tshirt.png', action: 'Add style', badge: 'WOMEN\'S' },
                        { name: 'Gildan Midweight 50/50 Pullover Hoodie', colors: '42 Colors Available', image: '/assets/categories/cat-sweatshirt.png', action: 'Add style', badge: 'RECOMMENDED' },
                        { name: 'Gildan Midweight 50/50 Crewneck Sweatshirt', colors: '37 Colors Available', image: '/assets/categories/cat-sweatshirt.png', action: 'Add style', badge: 'RECOMMENDED' },
                        { name: 'Gildan Softstyle Jersey T-shirt', colors: '63 Colors Available', image: '/assets/categories/cat-tshirt.png', action: 'Add another color', badge: '' },
                      ].map((product, index) => (
                        <div key={index} className="dl-quantity-recommended-item">
                          <Image src={product.image} alt={product.name} width={80} height={100} className="dl-quantity-recommended-item__image" />
                          <div className="dl-quantity-recommended-item__info">
                            {product.badge && (
                              <span className="dl-quantity-recommended-item__badge">
                                {product.badge}
                              </span>
                            )}
                            <h4 className="dl-quantity-recommended-item__name">{product.name}</h4>
                            <p className="dl-quantity-recommended-item__colors">{product.colors}</p>
                            <button type="button" className="dl-quantity-recommended-item__btn">{product.action}</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="dl-quantity-footer">
                      <button
                        type="button"
                        className="dl-quantity-buy-more__toggle"
                        onClick={() => setShowBuyMoreView(false)}
                      >
                        ← Back to sizes
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span className="dl-quantity-footer__total">Total Quantity: {totalQuantity}</span>
                        <button
                          type="button"
                          className="dl-continue-btn"
                          onClick={() => {
                            setShowQuantityModal(false);
                            setShowBuyMoreView(false);
                            setShowOrderOptionsPanel(true);
                          }}
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* [2025-01-27 22:00:00] "Order Options" 面板 */}
        {showOrderOptionsPanel && (
          <div className="dl-order-options-panel">
            <div className="dl-order-options-panel__header">
              <button type="button" className="dl-order-options-panel__back" onClick={() => {
                setShowOrderOptionsPanel(false);
                setShowQuantityModal(true);
              }}>←</button>
              <h2 className="dl-order-options-panel__title">Order Options</h2>
              <button type="button" className="dl-order-options-panel__close" onClick={() => setShowOrderOptionsPanel(false)}>×</button>
            </div>
            <div className="dl-order-options-panel__body">
              {/* 价格摘要 */}
              <div className="dl-price-summary">
                <div className="dl-price-summary__main">
                  <span className="dl-price-summary__amount">${calculatedPrice.toFixed(2)}</span>
                </div>
                <p className="dl-price-summary__total">${calculatedPrice.toFixed(2)} total</p>
                <div className="dl-price-summary__badges">
                  <span className="dl-price-badge">1 color front</span>
                  <span className="dl-price-badge">1 design area</span>
                  <span className="dl-price-badge">{totalQuantity || 1} total items</span>
                </div>
              </div>

              {/* 批量折扣信息 */}
              <div className="dl-bulk-discount">
                <h4 className="dl-bulk-discount__title">BUY MORE, SAVE MORE!</h4>
                <p className="dl-bulk-discount__text">Get 10 items for $19.45 each, or 20 items for $13.65 each.</p>
                <Link href="#" className="dl-bulk-discount__link">Money Saving Tips</Link>
              </div>

              {/* 配送选项 */}
              <div className="dl-delivery-section">
                <div className="dl-delivery-standard">
                  <h4 className="dl-delivery-standard__title">FREE Standard Delivery</h4>
                  <p className="dl-delivery-standard__date">Get it by Tuesday, Dec. 2nd</p>
                  <div className="dl-delivery-zip">
                    <span className="dl-delivery-zip__icon">📍</span>
                    <span className={`dl-delivery-zip__text ${zipCodeError ? 'has-error' : ''}`}>
                      {zipCodeError ? 'Unrecognized ZIP Code' : zipCode || 'Enter ZIP Code'}
                    </span>
                    <button
                      type="button"
                      className="dl-delivery-zip__edit"
                      onClick={() => {
                        const zip = prompt('Enter ZIP Code:');
                        if (zip) {
                          setZipCode(zip);
                          setZipCodeError(zip.length !== 5);
                        }
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="dl-delivery-faster">
                  <h4 className="dl-delivery-faster__title">Faster delivery options available at checkout</h4>
                  <div className="dl-delivery-options">
                    <div className="dl-delivery-option">
                      <span className="dl-delivery-option__icon">⚡</span>
                      <span className="dl-delivery-option__text">Super Rush - get it by Thu., Nov. 20th</span>
                    </div>
                    <div className="dl-delivery-option">
                      <span className="dl-delivery-option__icon">🚚</span>
                      <span className="dl-delivery-option__text">Rush - get it by Mon., Nov. 24th</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 满意度保证 */}
              <div className="dl-satisfaction-guarantee">
                <div className="dl-satisfaction-guarantee__icon">🌸</div>
                <div className="dl-satisfaction-guarantee__content">
                  <h4 className="dl-satisfaction-guarantee__title">100% SATISFACTION GUARANTEED</h4>
                  <p className="dl-satisfaction-guarantee__text">We&apos;ll make it right or we&apos;ll make it right.</p>
                </div>
              </div>

              {/* 订单详情 */}
              <div className="dl-order-summary">
                <h3 className="dl-order-summary__title">YOUR ORDER - 1 product</h3>
                <div className="dl-order-summary__product">
                  <div className="dl-order-summary__thumbnails">
                    {[1, 2, 3, 4].map((i) => (
                      <Image key={i} src="/assets/categories/cat-tshirt.png" alt={`View ${i}`} width={60} height={75} className="dl-order-summary__thumb" />
                    ))}
                  </div>
                  <div className="dl-order-summary__details">
                    <h4 className="dl-order-summary__name">Gildan Softstyle Jersey T-shirt</h4>
                    <p className="dl-order-summary__specs">Heather Dark Grey | Qty: {totalQuantity || 1}</p>
                    <p className="dl-order-summary__size">
                      {totalQuantity > 0
                        ? Object.entries(sizeQuantities)
                          .filter(([_, qty]) => qty > 0)
                          .map(([size, qty]) => `${qty}${size}`)
                          .join(', ')
                        : '1 XS'}
                      {' '}
                      <Link href="#" className="dl-order-summary__edit" onClick={(e) => {
                        e.preventDefault();
                        setShowOrderOptionsPanel(false);
                        setShowQuantityModal(true);
                      }}>Edit</Link>
                    </p>
                    <p className="dl-order-summary__price">${pricePerItem.toFixed(2)} each</p>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="dl-order-actions">
                <button
                  type="button"
                  className="dl-order-actions__change"
                  onClick={() => {
                    setShowOrderOptionsPanel(false);
                    setShowOrderingOptionsModal(true);
                  }}
                >
                  ← Change your order options
                </button>
                <div className="dl-order-actions__main">
                  <button
                    type="button"
                    className="dl-order-actions__save"
                    onClick={() => {
                      setShowOrderOptionsPanel(false);
                      setShowSaveCartModal(true);
                    }}
                  >
                    Save & Continue Designing
                  </button>
                  <button
                    type="button"
                    className="dl-order-actions__add-cart"
                    onClick={() => {
                      setShowOrderOptionsPanel(false);
                      setShowSaveCartModal(true);
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* [2025-01-27 23:45:00] Save & Add to Cart 模态框 */}
        {showSaveCartModal && (
          <div className="dl-modal-overlay" onClick={() => setShowSaveCartModal(false)}>
            <div className="dl-modal dl-modal--large" onClick={(e) => e.stopPropagation()}>
              <div className="dl-modal__header">
                <button type="button" className="dl-modal__back" onClick={() => {
                  setShowSaveCartModal(false);
                  setShowOrderOptionsPanel(true);
                }}>←</button>
                <h2 className="dl-modal__title">Save & Add to Cart</h2>
                <button type="button" className="dl-modal__close" onClick={() => setShowSaveCartModal(false)}>×</button>
              </div>
              <div className="dl-modal__body">
                <div className="dl-save-cart-content">
                  {/* 左侧：表单 */}
                  <div className="dl-save-cart-form">
                    <h3 className="dl-save-cart-form__title">Save & Add to Cart</h3>
                    <p className="dl-save-cart-form__subtitle">Save a final version of your design before you add to cart.</p>

                    <div className="dl-save-cart-field">
                      <label className="dl-save-cart-field__label">Design Name</label>
                      <input
                        type="text"
                        className="dl-save-cart-field__input"
                        placeholder="Design Name"
                        value={saveDesignName}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 25) {
                            setSaveDesignName(value);
                          }
                        }}
                        maxLength={25}
                      />
                      <p className="dl-save-cart-field__hint">
                        25 characters max including @ # $ % & - _ [ ] ( )
                      </p>
                    </div>

                    <div className="dl-save-cart-field">
                      <label className="dl-save-cart-field__label">Email</label>
                      <input
                        type="email"
                        className="dl-save-cart-field__input"
                        placeholder="Email"
                        value={saveEmail}
                        onChange={(e) => setSaveEmail(e.target.value)}
                      />
                    </div>

                    <p className="dl-save-cart-terms">
                      By clicking &apos;Save Design&apos;, I agree to the{' '}
                      <Link href="/terms" className="dl-save-cart-terms__link">terms of service</Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="dl-save-cart-terms__link">Privacy Policy</Link>.
                    </p>

                    <button
                      type="button"
                      className="dl-save-cart-btn"
                      onClick={async () => {
                        if (!saveDesignName.trim() || !saveEmail.trim()) {
                          setError('Please fill in all required fields');
                          return;
                        }
                        if (!draft?.id) {
                          setError('Design draft not found. Please create a design first.');
                          return;
                        }
                        if (!draft.productVariantId) {
                          setError('Product variant not found. Please select a product.');
                          return;
                        }
                        try {
                          setSaving(true);
                          setError(null);

                          // 1. 更新设计草稿（保存名称和状态）
                          await designLabApi.updateDraft(draft.id, {
                            name: saveDesignName.trim(),
                            // status: 'saved', // Removed as it's not in the type definition
                            summary: `Design saved by ${saveEmail}`,
                          });

                          // 2. 添加到购物车（使用 designId 和 variantId）
                          const { cartApi } = await import('@/lib/api');
                          await cartApi.addItem(draft.productVariantId, quantity, draft.id);

                          setShowSaveCartModal(false);
                          // 跳转到购物车页面
                          router.push('/cart');
                        } catch (err: any) {
                          console.error('Error saving design and adding to cart:', err);
                          setError(err.message || '保存失败，请重试');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving || !saveDesignName.trim() || !saveEmail.trim() || !draft?.id}
                    >
                      {saving ? 'Saving...' : 'Save & Add to Cart'}
                    </button>
                  </div>

                  {/* 右侧：Ship to Everyone */}
                  <div className="dl-ship-everyone">
                    <div className="dl-ship-everyone__badge">SHIP TO EVERYONE</div>
                    <div className="dl-ship-everyone__logo">
                      <Image src="/assets/custom-ink-logo.png" alt="Custom Ink" width={120} height={120} />
                    </div>
                    <h3 className="dl-ship-everyone__title">Get your gear where it needs to go</h3>
                    <p className="dl-ship-everyone__text">
                      Ship to several locations or directly to everyone in your group. Just choose ship to multiple addresses in your cart.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 保留原有的inspector面板用于功能 */}
        <aside className="lab__inspector" aria-label="产品信息" style={{ display: 'none' }}>
          <div className="inspector__card">
            <div className="inspector__product">
              <Image src="/assets/categories/cat-sweatshirt.png" alt="当前产品" width={56} height={56} />
              <div>
                <strong>Gildan Softstyle Jersey T-shirt</strong>
                <p className="lab__hint">支持数码直喷、丝网印、刺绣</p>
              </div>
            </div>
            <div id="lab-color-section" className="lab__color-swatches">
              {productColors.map((color) => (
                <button
                  key={color.key}
                  type="button"
                  className={`lab__color-swatch ${selectedProductColor === color.key ? 'selected' : ''}`}
                  style={{ backgroundColor: color.swatch }}
                  onClick={() => handleProductColorSelect(color.key)}
                >
                  <span className="sr-only">{color.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="inspector__section">
            <h3>艺术素材库</h3>
            <div className="lab__art-grid">
              {artPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="lab__art-card"
                  onClick={() => handleInsertPresetArt(preset.id)}
                >
                  <div className="lab__art-thumb" aria-hidden="true">
                    {preset.type === 'image' ? (
                      <Image
                        src={preset.src}
                        alt={preset.label}
                        width={72}
                        height={72}
                        loading="lazy"
                        unoptimized
                        style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                    ) : (
                      <span>{preset.type === 'text' ? preset.text : '★'}</span>
                    )}
                  </div>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* [2025-01-27 21:55:00] 设计模板库 */}
          <div className="inspector__section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3>设计模板库</h3>
              <button
                type="button"
                onClick={handleOpenTemplates}
                className="lab__ghost-btn"
                style={{ padding: '6px 12px', fontSize: '14px' }}
              >
                {showTemplates ? '隐藏' : '浏览'}
              </button>
            </div>
            {showTemplates && (
              <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                {loadingTemplates ? (
                  <p className="lab__hint">加载模板中...</p>
                ) : templates.length === 0 ? (
                  <p className="lab__hint">暂无模板</p>
                ) : (
                  <div className="lab__template-grid" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className="lab__template-card"
                        onClick={() => handleApplyTemplate(template)}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px',
                          background: 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#ff1f3d';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {template.thumbnailUrl ? (
                          <Image
                            src={template.thumbnailUrl}
                            alt={template.name}
                            width={200}
                            height={120}
                            loading="lazy"
                            unoptimized
                            style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '80px', background: '#f3f4f6', borderRadius: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#9ca3af' }}>📐</span>
                          </div>
                        )}
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{template.name}</div>
                        {template.category && (
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>{template.category}</div>
                        )}
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                          👍 {template.likesCount} · 📊 {template.usageCount}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="inspector__section">
            <h3>快速编辑</h3>
            {mode === 'preview' && (
              <p className="lab__hint">登录后可在移动端修改文字，或前往桌面端体验完整功能。</p>
            )}
            {selectedTextObject && mode !== 'preview' && (
              <div className="lab__text-tools">
                <h4>文字样式</h4>
                <label className="lab__field">
                  <span>字体大小</span>
                  <input
                    type="number"
                    min="8"
                    max="200"
                    value={selectedTextObject.fontSize || 28}
                    onChange={(e) => handleTextFontSizeChange(parseInt(e.target.value, 10) || 28)}
                    disabled={mobileLocked}
                  />
                </label>
                <div className="lab__text-format-buttons">
                  <button
                    type="button"
                    className={`lab__format-btn ${selectedTextObject.fontWeight === 'bold' ? 'active' : ''}`}
                    onClick={handleTextBoldToggle}
                    disabled={mobileLocked}
                    title="粗体"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    className={`lab__format-btn ${selectedTextObject.fontStyle === 'italic' ? 'active' : ''}`}
                    onClick={handleTextItalicToggle}
                    disabled={mobileLocked}
                    title="斜体"
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    className={`lab__format-btn ${selectedTextObject.underline ? 'active' : ''}`}
                    onClick={handleTextUnderlineToggle}
                    disabled={mobileLocked}
                    title="下划线"
                  >
                    <u>U</u>
                  </button>
                </div>
                <div className="lab__text-align-buttons">
                  <span className="lab__field-label">对齐方式</span>
                  <div className="lab__align-buttons">
                    <button
                      type="button"
                      className={`lab__align-btn ${selectedTextObject.textAlign === 'left' ? 'active' : ''}`}
                      onClick={() => handleTextAlign('left')}
                      disabled={mobileLocked}
                      title="左对齐"
                    >
                      ⬅️
                    </button>
                    <button
                      type="button"
                      className={`lab__align-btn ${selectedTextObject.textAlign === 'center' ? 'active' : ''}`}
                      onClick={() => handleTextAlign('center')}
                      disabled={mobileLocked}
                      title="居中"
                    >
                      ⬌
                    </button>
                    <button
                      type="button"
                      className={`lab__align-btn ${selectedTextObject.textAlign === 'right' ? 'active' : ''}`}
                      onClick={() => handleTextAlign('right')}
                      disabled={mobileLocked}
                      title="右对齐"
                    >
                      ➡️
                    </button>
                    <button
                      type="button"
                      className={`lab__align-btn ${selectedTextObject.textAlign === 'justify' ? 'active' : ''}`}
                      onClick={() => handleTextAlign('justify')}
                      disabled={mobileLocked}
                      title="两端对齐"
                    >
                      ⬌⬌
                    </button>
                  </div>
                </div>
                <label className="lab__field">
                  <span>文字颜色</span>
                  <div className="lab__color-input-wrapper">
                    <input
                      type="color"
                      value={selectedTextObject.fill || '#111111'}
                      onChange={(e) => handleTextColorChange(e.target.value)}
                      disabled={mobileLocked}
                      className="lab__color-input"
                    />
                    <input
                      type="text"
                      value={selectedTextObject.fill || '#111111'}
                      onChange={(e) => handleTextColorChange(e.target.value)}
                      disabled={mobileLocked}
                      className="lab__color-text-input"
                      placeholder="#111111"
                    />
                  </div>
                </label>
                <label className="lab__field">
                  <span>文字内容</span>
                  <textarea
                    value={selectedTextObject.text || ''}
                    onChange={(e) => {
                      if (selectedTextObject) {
                        selectedTextObject.set('text', e.target.value);
                        fabricCanvasRef.current?.renderAll();
                        handleCanvasChange();
                        setSelectedTextObject({ ...selectedTextObject, text: e.target.value });
                      }
                    }}
                    disabled={mobileLocked}
                    rows={3}
                  />
                </label>
              </div>
            )}
            {!selectedTextObject && mode !== 'preview' && textTargets.length === 0 && (
              <p className="lab__hint">暂无可编辑文字对象，点击左侧“Add Text”开始创作，或选择一个对象。</p>
            )}
            {!selectedTextObject &&
              mode !== 'preview' &&
              textTargets.map((target: any) => (
                <label key={target.id} className="lab__field">
                  <span>文字块</span>
                  <textarea
                    value={target.text}
                    onChange={(event) => handleQuickEditChange(target.id, event.target.value)}
                    disabled={mobileLocked}
                  />
                </label>
              ))}
          </div>
          <div className="inspector__section">
            <h3>图层管理</h3>
            {layers.length === 0 ? (
              <p className="lab__hint">暂无图层，添加文字或图片后会自动显示在这里。</p>
            ) : (
              <div className="lab__layers-list">
                {layers.map((layer, index) => (
                  <div
                    key={layer.id}
                    className={`lab__layer-item ${activeObjectId === layer.id ? 'active' : ''} ${!layer.visible ? 'hidden' : ''}`}
                    onClick={() => handleLayerSelect(layer.id)}
                  >
                    <div className="lab__layer-info">
                      <span className="lab__layer-icon">
                        {layer.type === 'textbox' || layer.type === 'i-text' || layer.type === 'text' ? 'T' : '🖼️'}
                      </span>
                      <span className="lab__layer-name" title={layer.name}>
                        {layer.name}
                      </span>
                    </div>
                    <div className="lab__layer-actions">
                      <button
                        type="button"
                        className="lab__layer-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLayerVisibilityToggle(layer.id);
                        }}
                        title={layer.visible ? '隐藏' : '显示'}
                      >
                        {layer.visible ? '👁️' : '👁️‍🗨️'}
                      </button>
                      <button
                        type="button"
                        className="lab__layer-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLayerLockToggle(layer.id);
                        }}
                        title={layer.locked ? '解锁' : '锁定'}
                      >
                        {layer.locked ? '🔒' : '🔓'}
                      </button>
                      {index > 0 && (
                        <button
                          type="button"
                          className="lab__layer-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBringToFront(layer.id);
                          }}
                          title="置顶"
                        >
                          ⬆️
                        </button>
                      )}
                      {index < layers.length - 1 && (
                        <button
                          type="button"
                          className="lab__layer-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendToBack(layer.id);
                          }}
                          title="置底"
                        >
                          ⬇️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* [2025-01-27 21:55:00] 设计评论面板 */}
          {draft && (
            <div className="inspector__section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3>评论与反馈</h3>
                <button
                  type="button"
                  onClick={handleOpenComments}
                  className="lab__ghost-btn"
                  style={{ padding: '6px 12px', fontSize: '14px' }}
                >
                  {showComments ? '隐藏' : '查看'}
                </button>
              </div>
              {showComments && (
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                  {loadingComments ? (
                    <p className="lab__hint">加载评论中...</p>
                  ) : (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        {comments.length === 0 ? (
                          <p className="lab__hint">暂无评论</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {comments.map((comment) => (
                              <div
                                key={comment.id}
                                style={{
                                  borderBottom: '1px solid #e5e7eb',
                                  paddingBottom: '12px',
                                  paddingTop: comment.parentId ? '8px' : '0',
                                  marginLeft: comment.parentId ? '24px' : '0',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                  <div>
                                    <strong style={{ fontSize: '13px' }}>
                                      {comment.authorName || (comment.userId ? 'User' : 'Anonymous')}
                                    </strong>
                                    <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleLikeComment(comment.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#6b7280',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      padding: '4px 8px',
                                    }}
                                  >
                                    👍 {comment.likesCount}
                                  </button>
                                </div>
                                <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>{comment.content}</p>
                                {/* 显示回复 */}
                                {comment.replies && comment.replies.length > 0 && (
                                  <div style={{ marginTop: '8px', paddingLeft: '16px', borderLeft: '2px solid #e5e7eb' }}>
                                    {comment.replies.map((reply) => (
                                      <div key={reply.id} style={{ marginBottom: '8px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                                          {reply.authorName || 'Anonymous'}
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>{reply.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* [2025-01-27 21:55:00] 评论输入框 */}
                      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                        {!user && (
                          <input
                            type="text"
                            placeholder="您的姓名（可选）"
                            value={newCommentAuthor}
                            onChange={(e) => setNewCommentAuthor(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '13px',
                              marginBottom: '8px',
                            }}
                          />
                        )}
                        <textarea
                          placeholder="写下您的评论..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px',
                            marginBottom: '8px',
                            resize: 'vertical',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim() || submittingComment}
                          className="lab__primary-btn"
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '13px',
                            opacity: (!newComment.trim() || submittingComment) ? 0.5 : 1,
                          }}
                        >
                          {submittingComment ? '提交中...' : '提交评论'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <details open>
            <summary>尺码 & 版型</summary>
            <div className="panel">
              <p>成人：S - 5XL · 青少年：YXS - YL</p>
              <a href="/size-guide" className="lab__link">
                查看尺码表
              </a>
            </div>
          </details>
          <details>
            <summary>运输与时效</summary>
            <div className="panel">
              <p>免费 2 周送达，可加购 3 天加急。</p>
            </div>
          </details>
          <details>
            <summary>特殊印刷区域</summary>
            <div className="panel">
              <p>支持正面 / 背面 / 左右袖，衣摆 10cm 内建议使用安全区。</p>
            </div>
          </details>
        </aside>
      </div>

      <div className="lab__bottom-bar">
        <div className="lab__bottom-left">
          <button type="button" className="lab__ghost-btn" onClick={handleAddProductsClick}>
            添加产品
          </button>
          <div className="lab__product-pill">
            <Image src="/assets/categories/cat-tshirt.png" alt="当前产品" width={48} height={48} />
            <div>
              <p>Softstyle Jersey Tee</p>
              <small>颜色：{productColors.find((c) => c.key === selectedProductColor)?.label}</small>
            </div>
          </div>
        </div>
        <div className="lab__bottom-right">
          <label className="lab__quantity-field">
            <span>订购数量</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(parseInt(event.target.value, 10) || 1, 1))}
            />
          </label>
          {quote && (
            <p className="lab__quote">
              每件 {quote.currency} {quote.unitPrice.toFixed(2)} · 总计 {quote.currency} {quote.total.toFixed(2)}
            </p>
          )}
          <div className="lab__bottom-actions">
            {/* [2025-01-27 21:15:00] 导出菜单 */}
            <div className="lab__export-menu" style={{ position: 'relative' }}>
              <button
                type="button"
                className="lab__ghost-btn"
                onClick={() => {
                  const menu = document.getElementById('export-dropdown');
                  if (menu) {
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                  }
                }}
                disabled={exporting}
              >
                {exporting ? '导出中...' : '导出'}
              </button>
              <div
                id="export-dropdown"
                style={{
                  display: 'none',
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: '8px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '8px',
                  minWidth: '120px',
                  zIndex: 1000,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleExport('png');
                    document.getElementById('export-dropdown')!.style.display = 'none';
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport('svg');
                    document.getElementById('export-dropdown')!.style.display = 'none';
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  SVG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport('pdf');
                    document.getElementById('export-dropdown')!.style.display = 'none';
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  PDF
                </button>
              </div>
            </div>
            <button type="button" className="lab__ghost-btn" onClick={handleShareDesign}>
              分享
            </button>
            <button type="button" className="lab__ghost-btn" onClick={handleRequestQuote}>
              获取报价
            </button>
            <button type="button" className="lab__primary-btn" onClick={handleSubmitOrder} disabled={!user}>
              保存并生成订单草稿
            </button>
          </div>
        </div>
      </div>

      {/* [2025-01-27 21:10:00] 批量命名对话框 */}
      {showBatchNames && (
        <div
          className="lab__modal-overlay"
          onClick={() => setShowBatchNames(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            className="lab__modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <h2 style={{ marginTop: 0 }}>批量添加名字</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              每行输入一个名字，系统会将名字循环应用到画布上的所有文本框。
            </p>
            <textarea
              value={batchNames}
              onChange={(e) => setBatchNames(e.target.value)}
              placeholder="例如：&#10;John&#10;Jane&#10;Mike&#10;Sarah"
              rows={8}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowBatchNames(false);
                  setBatchNames('');
                }}
                className="lab__ghost-btn"
              >
                取消
              </button>
              <button type="button" onClick={handleApplyBatchNames} className="lab__primary-btn">
                应用
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="lab__recos" aria-label="推荐产品">
        <div className="lab__recos-grid">
          {recommendations.map((item) => (
            <article key={item.id} className="lab__reco-card">
              <Image
                src={item.image}
                alt={item.title}
                width={220}
                height={160}
                loading="lazy"
                unoptimized
                style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px' }}
              />
              <div>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <button type="button" className="lab__ghost-btn" onClick={handleAddProductsClick}>
                  添加到方案
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <style jsx>{`
        /* [2025-11-15 16:08:50] Design Lab 5 区域布局样式 */
        .lab__container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #f5f5f5;
        }
        .lab__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          background: #ffffff;
          border-bottom: 1px solid #e5e5e5;
        }
        .lab__header-actions {
          display: flex;
          gap: 12px;
        }
        .lab__name-input {
          font-size: 20px;
          font-weight: 600;
          border: none;
          background: transparent;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background-color 0.2s ease;
        }
        .lab__name-input:focus {
          outline: none;
          background: rgba(0, 0, 0, 0.05);
        }
        .lab__meta {
          margin-top: 4px;
          font-size: 12px;
          color: #777;
        }
        .lab__grid {
          flex: 1;
          display: grid;
          min-height: 0;
        }
        .lab__grid--five {
          grid-template-columns: 140px minmax(520px, 1fr) 160px 340px;
          grid-template-rows: 1fr;
        }
        .lab__rail {
          background: #1f2937;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 24px 12px;
        }
        .lab__rail-btn {
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
          transition: background 0.2s ease, border 0.2s ease;
        }
        .lab__rail-btn span:first-child {
          font-size: 18px;
        }
        .lab__rail-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.18);
        }
        .lab__rail-btn.active {
          background: rgba(255, 31, 61, 0.2);
          border: 1px solid rgba(255, 31, 61, 0.5);
        }
        .lab__stage-wrap {
          position: relative;
          background: #f8fafc;
          padding: 32px;
        }
        .lab__stage {
          position: relative;
          background: #f1f5f9;
          border: 1px dashed #e2e8f0;
          border-radius: 16px;
          min-height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lab__overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px;
          font-size: 16px;
          color: #555;
          z-index: 2;
          border-radius: 16px;
        }
        .lab__guide-panel {
          position: absolute;
          top: 32px;
          left: 32px;
          right: 32px;
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
          z-index: 11;
          display: grid;
          gap: 16px;
        }
        .lab__guide-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 11px;
          color: #9ca3af;
          margin: 0;
        }
        .lab__guide-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
        .lab__guide-action {
          display: flex;
          gap: 12px;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 12px;
          background: #f9fafb;
          cursor: pointer;
          text-align: left;
        }
        .lab__guide-action strong {
          display: block;
          margin-bottom: 4px;
        }
        .lab__guide-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #fff1f2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #ff1f3d;
        }
        .lab__view-controls {
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          gap: 8px;
          background: rgba(255, 255, 255, 0.94);
          padding: 4px;
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
          z-index: 10;
        }
        .lab__view-btn {
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          background: transparent;
          color: #475569;
          cursor: pointer;
        }
        .lab__view-btn.active {
          background: #fff5f5;
          color: #ff1f3d;
        }
        .lab__zoom-controls {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.94);
          padding: 8px 12px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
        }
        .lab__zoom-btn,
        .lab__zoom-reset {
          border: none;
          background: transparent;
          font-size: 18px;
          cursor: pointer;
        }
        .lab__zoom-slider {
          width: 140px;
        }
        .lab__view-rail {
          background: #ffffff;
          border-left: 1px solid #e5e5e5;
          padding: 24px 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .lab__view-grid {
          display: grid;
          gap: 12px;
        }
        .lab__view-thumb {
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 8px;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
        }
        .lab__view-thumb img {
          width: 100%;
          border-radius: 8px;
          object-fit: cover;
        }
        .lab__inspector {
          background: #ffffff;
          border-left: 1px solid #e5e5e5;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .inspector__card,
        .inspector__section {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 16px;
          padding: 16px;
        }
        .inspector__product {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .inspector__product img {
          border-radius: 12px;
        }
        .lab__color-swatches {
          margin-top: 16px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .lab__color-swatch {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
        }
        .lab__color-swatch.selected {
          border-color: #ff1f3d;
        }
        .lab__art-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }
        .lab__art-card {
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 12px;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
        }
        .lab__art-thumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .lab__text-tools {
          border-bottom: 1px solid #e5e5e5;
          padding-bottom: 16px;
          margin-bottom: 16px;
        }
        .lab__text-format-buttons,
        .lab__align-buttons {
          display: flex;
          gap: 8px;
        }
        .lab__format-btn,
        .lab__align-btn {
          flex: 1;
          border: 1px solid #e2e8f0;
          background: #fff;
          border-radius: 8px;
          cursor: pointer;
          padding: 6px;
        }
        .lab__format-btn.active,
        .lab__align-btn.active {
          border-color: #ff1f3d;
          background: #fff5f5;
        }
        .lab__layers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .lab__layer-item {
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
        }
        .lab__layer-item.active {
          border-color: #ff1f3d;
          background: #fff5f5;
        }
        .lab__layer-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        .lab__layer-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lab__layer-actions {
          display: flex;
          gap: 4px;
        }
        .lab__layer-action-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        .lab__hint {
          font-size: 13px;
          color: #6b7280;
        }
        .panel {
          margin-top: 10px;
          border-top: 1px solid #e5e5e5;
          padding-top: 10px;
          font-size: 14px;
        }
        .lab__link {
          display: inline-block;
          margin-top: 6px;
          color: #2563eb;
        }
        .lab__bottom-bar {
          background: #ffffff;
          border-top: 1px solid #e5e5e5;
          padding: 20px 32px;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }
        .lab__product-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #e5e5e5;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f9fafb;
        }
        .lab__product-pill img {
          border-radius: 50%;
        }
        .lab__quantity-field {
          display: flex;
          flex-direction: column;
          font-size: 14px;
        }
        .lab__quantity-field input {
          width: 120px;
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
        }
        .lab__bottom-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .lab__ghost-btn {
          background: transparent;
          border: 1px solid #d0d0d0;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
        }
        .lab__ghost-btn:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.05);
        }
        .lab__primary-btn {
          border: none;
          background: #0066cc;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .lab__primary-btn:hover:not(:disabled) {
          background: #0055aa;
        }
        .lab__recos {
          padding: 24px 32px 48px;
        }
        .lab__recos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .lab__reco-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .lab__reco-card img {
          width: 72px;
          height: 72px;
          border-radius: 12px;
          object-fit: cover;
        }
        .lab__quote {
          font-size: 14px;
          color: #1f2937;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
        .lab__loading,
        .lab__error {
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 32px;
          text-align: center;
        }
        @media (max-width: 991px) {
          .lab__grid--five {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto;
          }
          .lab__rail {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }
          .lab__stage-wrap,
          .lab__view-rail,
          .lab__inspector {
            padding: 16px;
          }
          .lab__view-controls {
            position: static;
            transform: none;
            box-shadow: none;
            margin-bottom: 12px;
          }
          .lab__zoom-controls {
            position: static;
            transform: none;
            margin-top: 12px;
          }
          .lab__bottom-bar {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
};

export default DesignLabClient;


