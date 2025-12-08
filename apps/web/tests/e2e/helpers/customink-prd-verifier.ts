/**
 * Custom Ink Design Lab PRD 3.0 验证辅助函数
 * [2025-12-07 19:40:00] 提供各功能模块的验证逻辑
 */
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface VerificationResult {
  feature: string; // 功能点名称
  prdDescription: string; // PRD 描述
  status: 'matched' | 'mismatched' | 'not_found' | 'partial'; // 验证状态
  actualImplementation?: string; // 实际实现情况
  screenshot?: string; // 截图路径
  notes?: string; // 备注
}

/**
 * 尝试查找元素（使用多种选择器策略）
 */
async function findElement(
  page: Page,
  selectors: string[],
  timeout = 5000
): Promise<{ found: boolean; selector?: string; element?: any }> {
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout });
      if (isVisible) {
        return { found: true, selector, element };
      }
    } catch (e) {
      // 继续尝试下一个选择器
    }
  }
  return { found: false };
}

/**
 * 验证文本是否存在（不区分大小写）
 */
async function verifyTextExists(
  page: Page,
  textPattern: string | RegExp,
  timeout = 5000
): Promise<boolean> {
  try {
    const pattern = typeof textPattern === 'string' 
      ? new RegExp(textPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : textPattern;
    const locator = page.locator(`text=/${pattern.source || pattern}/i`).first();
    return await locator.isVisible({ timeout }).catch(() => false);
  } catch (e) {
    return false;
  }
}

/**
 * 第3章：验证全局布局
 */
export async function verifyLayout(
  page: Page,
  screenshotsDir: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. 顶部栏验证
  const headerSelectors = [
    'header',
    '[class*="header"]',
    '[class*="Header"]',
    '[data-testid*="header"]',
  ];
  const headerResult = await findElement(page, headerSelectors);
  results.push({
    feature: '顶部栏（Header）',
    prdDescription: '品牌Logo、面包屑（My Designs > [Design Name]）、客服入口（Talk to a Real Person、Chat Now）、Sign In',
    status: headerResult.found ? 'matched' : 'not_found',
    actualImplementation: headerResult.found ? '找到顶部栏' : '未找到顶部栏',
  });

  // 2. Logo 验证
  const logoSelectors = [
    '[class*="logo"]',
    '[class*="Logo"]',
    'img[alt*="logo" i]',
    'img[alt*="customink" i]',
  ];
  const logoResult = await findElement(page, logoSelectors);
  results.push({
    feature: '品牌Logo',
    prdDescription: '顶部栏显示品牌Logo',
    status: logoResult.found ? 'matched' : 'not_found',
  });

  // 3. 面包屑验证
  const breadcrumbResult = await verifyTextExists(page, /My Designs/i);
  results.push({
    feature: '面包屑（My Designs）',
    prdDescription: 'My Designs > [Design Name]',
    status: breadcrumbResult ? 'matched' : 'not_found',
  });

  // 4. 客服入口验证
  const supportSelectors = [
    'text=/Talk to a Real Person/i',
    'text=/Chat Now/i',
    'text=/Chat with a Real Person/i',
    '[aria-label*="chat" i]',
    '[aria-label*="support" i]',
  ];
  let supportFound = false;
  for (const selector of supportSelectors) {
    const result = await findElement(page, [selector]);
    if (result.found) {
      supportFound = true;
      break;
    }
  }
  results.push({
    feature: '客服入口',
    prdDescription: 'Talk to a Real Person、Chat Now',
    status: supportFound ? 'matched' : 'not_found',
  });

  // 5. Sign In 验证
  const signInResult = await verifyTextExists(page, /Sign In|Log In/i);
  results.push({
    feature: 'Sign In',
    prdDescription: '顶部栏显示 Sign In',
    status: signInResult ? 'matched' : 'not_found',
  });

  // 6. 左侧功能栏验证
  const railSelectors = [
    '[class*="rail"]',
    '[class*="Rail"]',
    '[class*="toolbar"]',
    '[class*="Toolbar"]',
    '[data-testid*="rail"]',
  ];
  const railResult = await findElement(page, railSelectors);
  results.push({
    feature: '左侧功能栏（Rail）',
    prdDescription: 'Upload、Add Text、Add Art、Product Colors、Add Names',
    status: railResult.found ? 'matched' : 'not_found',
  });

  // 7. Upload 按钮验证
  const uploadButtonResult = await findElement(page, [
    'button:has-text("Upload")',
    '[aria-label*="upload" i]',
    'text=/Upload/i',
  ]);
  results.push({
    feature: '左侧功能栏 - Upload',
    prdDescription: 'Upload 按钮',
    status: uploadButtonResult.found ? 'matched' : 'not_found',
  });

  // 8. Add Text 按钮验证
  const addTextButtonResult = await findElement(page, [
    'button:has-text("Text")',
    'button:has-text("Add Text")',
    '[aria-label*="text" i]',
  ]);
  results.push({
    feature: '左侧功能栏 - Add Text',
    prdDescription: 'Add Text 按钮',
    status: addTextButtonResult.found ? 'matched' : 'not_found',
  });

  // 9. Add Art 按钮验证
  const addArtButtonResult = await findElement(page, [
    'button:has-text("Art")',
    'button:has-text("Add Art")',
    '[aria-label*="art" i]',
  ]);
  results.push({
    feature: '左侧功能栏 - Add Art',
    prdDescription: 'Add Art 按钮',
    status: addArtButtonResult.found ? 'matched' : 'not_found',
  });

  // 10. Product Colors 按钮验证
  const productColorsButtonResult = await findElement(page, [
    'button:has-text("Color")',
    'button:has-text("Product Color")',
    '[aria-label*="color" i]',
  ]);
  results.push({
    feature: '左侧功能栏 - Product Colors',
    prdDescription: 'Product Colors 按钮',
    status: productColorsButtonResult.found ? 'matched' : 'not_found',
  });

  // 11. Add Names 按钮验证
  const addNamesButtonResult = await findElement(page, [
    'button:has-text("Name")',
    'button:has-text("Names")',
    'button:has-text("Numbers")',
    '[aria-label*="name" i]',
  ]);
  results.push({
    feature: '左侧功能栏 - Add Names',
    prdDescription: 'Add Names（Names & Numbers）按钮',
    status: addNamesButtonResult.found ? 'matched' : 'not_found',
  });

  // 12. 中央画布验证
  const canvasSelectors = [
    'canvas',
    '[class*="canvas"]',
    '[class*="Canvas"]',
    '[class*="preview"]',
    '[class*="Preview"]',
    '[data-testid*="canvas"]',
  ];
  const canvasResult = await findElement(page, canvasSelectors);
  results.push({
    feature: '中央画布区域',
    prdDescription: '画布（默认Front），显示产品预览与可编辑对象',
    status: canvasResult.found ? 'matched' : 'not_found',
  });

  // 13. 右侧视图切换验证
  const viewSelectors = [
    'button:has-text("Front")',
    'button:has-text("Back")',
    'button:has-text("Sleeve")',
    '[aria-label*="front" i]',
    '[aria-label*="back" i]',
  ];
  let viewFound = false;
  for (const selector of viewSelectors) {
    const result = await findElement(page, [selector]);
    if (result.found) {
      viewFound = true;
      break;
    }
  }
  results.push({
    feature: '右侧视图切换',
    prdDescription: 'Front / Back / Sleeve Design / Zoom',
    status: viewFound ? 'matched' : 'not_found',
  });

  // 14. Zoom 验证
  const zoomResult = await findElement(page, [
    'button:has-text("Zoom")',
    '[aria-label*="zoom" i]',
    '[class*="zoom"]',
  ]);
  results.push({
    feature: 'Zoom 功能',
    prdDescription: '放大/缩小/拖拽/重置视图',
    status: zoomResult.found ? 'matched' : 'not_found',
  });

  // 15. Undo/Redo 验证
  const undoResult = await findElement(page, [
    'button:has-text("Undo")',
    '[aria-label*="undo" i]',
    '[title*="undo" i]',
  ]);
  const redoResult = await findElement(page, [
    'button:has-text("Redo")',
    '[aria-label*="redo" i]',
    '[title*="redo" i]',
  ]);
  results.push({
    feature: '左上浮层 - Undo/Redo',
    prdDescription: 'Undo / Redo 按钮',
    status: undoResult.found && redoResult.found ? 'matched' : undoResult.found || redoResult.found ? 'partial' : 'not_found',
    actualImplementation: `Undo: ${undoResult.found ? '找到' : '未找到'}, Redo: ${redoResult.found ? '找到' : '未找到'}`,
  });

  // 16. 底部栏验证
  const bottomBarSelectors = [
    '[class*="bottom"]',
    '[class*="Bottom"]',
    '[class*="footer"]',
    '[data-testid*="bottom"]',
  ];
  const bottomBarResult = await findElement(page, bottomBarSelectors);
  results.push({
    feature: '底部栏（Bottom Bar）',
    prdDescription: 'Add Products、当前产品卡、Save | Share、Get Price',
    status: bottomBarResult.found ? 'matched' : 'not_found',
  });

  // 17. Add Products 按钮验证
  const addProductsResult = await verifyTextExists(page, /Add Products|Add Product/i);
  results.push({
    feature: '底部栏 - Add Products',
    prdDescription: 'Add Products 按钮',
    status: addProductsResult ? 'matched' : 'not_found',
  });

  // 18. Save | Share 验证
  const saveShareResult = await verifyTextExists(page, /Save|Share/i);
  results.push({
    feature: '底部栏 - Save | Share',
    prdDescription: 'Save | Share 按钮',
    status: saveShareResult ? 'matched' : 'not_found',
  });

  // 19. Get Price 验证
  const getPriceResult = await verifyTextExists(page, /Get Price|Get a Price/i);
  results.push({
    feature: '底部栏 - Get Price',
    prdDescription: 'Get Price 按钮',
    status: getPriceResult ? 'matched' : 'not_found',
  });

  return results;
}

/**
 * 第4.1章：验证 Upload 面板
 */
export async function verifyUploadPanel(
  page: Page,
  screenshotsDir: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. 打开 Upload 面板
  const uploadButton = await findElement(page, [
    'button:has-text("Upload")',
    '[aria-label*="upload" i]',
    'text=/Upload/i',
  ]);

  if (!uploadButton.found) {
    results.push({
      feature: 'Upload 按钮',
      prdDescription: 'Upload 功能入口',
      status: 'not_found',
    });
    return results;
  }

  try {
    await uploadButton.element!.click();
    await page.waitForTimeout(2000);
    
    // 截图
    const screenshotPath = path.join(screenshotsDir, 'upload-panel.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // 2. Choose File To Upload 面板
    const panelResult = await verifyTextExists(page, /Choose File|Upload File|Select File/i);
    results.push({
      feature: 'Choose File To Upload 面板',
      prdDescription: 'Choose File To Upload 面板存在',
      status: panelResult ? 'matched' : 'not_found',
      screenshot: screenshotPath,
    });

    // 3. Browse Your Computer 按钮
    const browseResult = await verifyTextExists(page, /Browse|Choose File|Select File/i);
    results.push({
      feature: 'Browse Your Computer',
      prdDescription: 'Browse Your Computer：调起系统文件选择',
      status: browseResult ? 'matched' : 'not_found',
    });

    // 4. Drag & Drop 提示
    const dragDropResult = await verifyTextExists(page, /Drag|Drop|Drag and Drop/i);
    results.push({
      feature: 'Drag & Drop Anywhere',
      prdDescription: 'Drag & Drop Anywhere：全画布拖拽上传',
      status: dragDropResult ? 'matched' : 'not_found',
    });

    // 5. 文件限制提示（≥300DPI、最大20MB）
    const limitResult = await verifyTextExists(page, /300.*DPI|20.*MB|max.*size|file.*size/i);
    results.push({
      feature: '文件限制提示',
      prdDescription: '推荐≥300DPI、最大20MB',
      status: limitResult ? 'matched' : 'not_found',
    });

    // 6. Recent Uploads（需要登录）
    const recentUploadsResult = await verifyTextExists(page, /Recent Uploads|Recent Files/i);
    results.push({
      feature: 'Recent Uploads',
      prdDescription: '登录可显示"Recent Uploads"并复用',
      status: recentUploadsResult ? 'matched' : 'partial',
      notes: '可能需要登录才能看到',
    });

  } catch (e) {
    results.push({
      feature: 'Upload 面板打开',
      prdDescription: '点击 Upload 按钮打开面板',
      status: 'not_found',
      notes: `错误: ${e}`,
    });
  }

  // 7. Edit Upload 面板功能（需要先上传文件才能看到）
  // 这里只验证功能描述，实际验证需要先上传文件
  const editUploadFeatures = [
    'Upload Size（Width × Height + 比例锁）',
    'Edit Colors',
    'Make One Color',
    'Remove Background Color',
    'Center',
    'Layering',
    'Flip',
    'Duplicate',
    'Crop',
    'Rotation',
    'Reset To Original',
    'Save Design',
  ];

  for (const feature of editUploadFeatures) {
    results.push({
      feature: `Edit Upload - ${feature}`,
      prdDescription: feature,
      status: 'partial',
      notes: '需要先上传文件才能验证此功能',
    });
  }

  // 8. 上传体验评分
  const ratingResult = await verifyTextExists(page, /Rate|Rating|Experience|Feedback/i);
  results.push({
    feature: '上传体验评分',
    prdDescription: '底部"Rate our upload experience"',
    status: ratingResult ? 'matched' : 'not_found',
    notes: '可能需要上传文件后才能看到',
  });

  return results;
}

/**
 * 第4.2章：验证 Add Text 面板
 */
export async function verifyAddTextPanel(
  page: Page,
  screenshotsDir: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. 打开 Add Text 面板
  const addTextButton = await findElement(page, [
    'button:has-text("Text")',
    'button:has-text("Add Text")',
    '[aria-label*="text" i]',
  ]);

  if (!addTextButton.found) {
    results.push({
      feature: 'Add Text 按钮',
      prdDescription: 'Add Text 功能入口',
      status: 'not_found',
    });
    return results;
  }

  try {
    await addTextButton.element!.click();
    await page.waitForTimeout(2000);
    
    const screenshotPath = path.join(screenshotsDir, 'add-text-panel.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // 2. Add Text 面板
    const panelResult = await verifyTextExists(page, /Enter text|Add Text|Text here/i);
    results.push({
      feature: 'Add Text 面板',
      prdDescription: '输入框：Enter text here',
      status: panelResult ? 'matched' : 'not_found',
      screenshot: screenshotPath,
    });

    // 3. Add To Design 按钮
    const addToDesignResult = await verifyTextExists(page, /Add To Design|Add to Design/i);
    results.push({
      feature: 'Add To Design 按钮',
      prdDescription: 'Add To Design：创建文字对象、选中并打开"Edit Text"面板',
      status: addToDesignResult ? 'matched' : 'not_found',
    });

    // 4. Edit Text 面板功能（需要先添加文本才能看到）
    const editTextFeatures = [
      'Change Font',
      'Edit Color',
      'Rotation',
      'Outline',
      'Text Shape',
      'Text Size',
      'Text Alignment',
      'Center',
      'Layering',
      'Duplicate',
    ];

    for (const feature of editTextFeatures) {
      results.push({
        feature: `Edit Text - ${feature}`,
        prdDescription: feature,
        status: 'partial',
        notes: '需要先添加文本对象才能验证此功能',
      });
    }

    // 5. 安全区警示
    results.push({
      feature: '安全区警示',
      prdDescription: '超出安全区时警示并引导调整',
      status: 'partial',
      notes: '需要添加文本并移动到安全区外才能验证',
    });

  } catch (e) {
    results.push({
      feature: 'Add Text 面板打开',
      prdDescription: '点击 Add Text 按钮打开面板',
      status: 'not_found',
      notes: `错误: ${e}`,
    });
  }

  return results;
}

/**
 * 第4.3章：验证 Add Art 面板
 */
export async function verifyAddArtPanel(
  page: Page,
  screenshotsDir: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. 打开 Add Art 面板
  const addArtButton = await findElement(page, [
    'button:has-text("Art")',
    'button:has-text("Add Art")',
    '[aria-label*="art" i]',
  ]);

  if (!addArtButton.found) {
    results.push({
      feature: 'Add Art 按钮',
      prdDescription: 'Add Art 功能入口',
      status: 'not_found',
    });
    return results;
  }

  try {
    await addArtButton.element!.click();
    await page.waitForTimeout(2000);
    
    const screenshotPath = path.join(screenshotsDir, 'add-art-panel.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // 2. Artwork Categories 面板
    const categoriesResult = await verifyTextExists(page, /Artwork|Categories|Search For Artwork/i);
    results.push({
      feature: 'Artwork Categories 面板',
      prdDescription: 'Artwork Categories面板：Search For Artwork',
      status: categoriesResult ? 'matched' : 'not_found',
      screenshot: screenshotPath,
    });

    // 3. 分类网格验证
    const categories = [
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

    let foundCategories = 0;
    for (const category of categories) {
      const result = await verifyTextExists(page, new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      if (result) foundCategories++;
    }

    results.push({
      feature: '分类网格',
      prdDescription: `分类网格：${categories.join('、')}等`,
      status: foundCategories > 0 ? (foundCategories === categories.length ? 'matched' : 'partial') : 'not_found',
      actualImplementation: `找到 ${foundCategories}/${categories.length} 个分类`,
    });

    // 4. 子分类验证（以 Emojis 为例）
    const subcategories = [
      'Animals',
      'Food & Drink',
      'Hands',
      'Nature & Weather',
      'Objects & Symbols',
      'Smileys',
      'View All',
    ];

    // 尝试点击 Emojis 分类
    const emojisButton = await findElement(page, ['text=/Emojis/i']);
    if (emojisButton.found) {
      try {
        await emojisButton.element!.click();
        await page.waitForTimeout(2000);
        
        let foundSubcategories = 0;
        for (const subcategory of subcategories) {
          const result = await verifyTextExists(page, new RegExp(subcategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
          if (result) foundSubcategories++;
        }

        results.push({
          feature: '子分类（Emojis）',
          prdDescription: `Animals、Food & Drink、Hands、Nature & Weather、Objects & Symbols、Smileys、View All`,
          status: foundSubcategories > 0 ? (foundSubcategories === subcategories.length ? 'matched' : 'partial') : 'not_found',
          actualImplementation: `找到 ${foundSubcategories}/${subcategories.length} 个子分类`,
        });
      } catch (e) {
        results.push({
          feature: '子分类',
          prdDescription: '子分类导航',
          status: 'partial',
          notes: `无法点击分类: ${e}`,
        });
      }
    }

    // 5. 素材列表网格
    const artworkGridResult = await findElement(page, [
      '[class*="grid"]',
      '[class*="Grid"]',
      '[class*="artwork"]',
      '[class*="Artwork"]',
    ]);
    results.push({
      feature: '素材列表网格',
      prdDescription: '网格；点击生成艺术对象并打开Edit Art',
      status: artworkGridResult.found ? 'matched' : 'not_found',
    });

    // 6. Edit Art 面板功能（需要先添加素材才能看到）
    const editArtFeatures = [
      'Center',
      'Layering',
      'Flip',
      'Duplicate',
      'Rotation',
      'Make One Color',
      'Edit Colors',
      'Change Art',
      'Art Size',
      'Reset To Original',
      'Save Design',
    ];

    for (const feature of editArtFeatures) {
      results.push({
        feature: `Edit Art - ${feature}`,
        prdDescription: feature,
        status: 'partial',
        notes: '需要先添加素材对象才能验证此功能',
      });
    }

  } catch (e) {
    results.push({
      feature: 'Add Art 面板打开',
      prdDescription: '点击 Add Art 按钮打开面板',
      status: 'not_found',
      notes: `错误: ${e}`,
    });
  }

  return results;
}

/**
 * 第4.4章：验证 Product Colors
 */
export async function verifyProductColors(
  page: Page,
  screenshotsDir: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. 打开 Product Colors 面板
  const productColorsButton = await findElement(page, [
    'button:has-text("Color")',
    'button:has-text("Product Color")',
    '[aria-label*="color" i]',
  ]);

  if (!productColorsButton.found) {
    results.push({
      feature: 'Product Colors 按钮',
      prdDescription: 'Product Colors 功能入口',
      status: 'not_found',
    });
    return results;
  }

  try {
    await productColorsButton.element!.click();
    await page.waitForTimeout(2000);
    
    const screenshotPath = path.join(screenshotsDir, 'product-colors-panel.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // 2. Choose Your Product Color 面板
    const panelResult = await verifyTextExists(page, /Choose.*Product Color|Select.*Color/i);
    results.push({
      feature: 'Choose Your Product Color 面板',
      prdDescription: '面板：Choose Your Product Color',
      status: panelResult ? 'matched' : 'not_found',
      screenshot: screenshotPath,
    });

    // 3. 颜色格子
    const colorGridResult = await findElement(page, [
      '[class*="color"]',
      '[class*="Color"]',
      '[class*="swatch"]',
      '[class*="Swatch"]',
    ]);
    results.push({
      feature: '颜色格子',
      prdDescription: 'Colors格子：点击即应用产品颜色',
      status: colorGridResult.found ? 'matched' : 'not_found',
    });

    // 4. Sizes Available in
    const sizesResult = await verifyTextExists(page, /Sizes Available|Available Sizes|Size/i);
    results.push({
      feature: 'Sizes Available in',
      prdDescription: '显示该颜色支持的尺码（YS/YM/YL/S/M/L/XL/2XL/3XL/4XL）',
      status: sizesResult ? 'matched' : 'not_found',
    });

    // 5. Pick another color
    const pickAnotherResult = await verifyTextExists(page, /Pick another color|Add another color/i);
    results.push({
      feature: 'Pick another color',
      prdDescription: '将同款添加为另一颜色的订单项',
      status: pickAnotherResult ? 'matched' : 'not_found',
    });

  } catch (e) {
    results.push({
      feature: 'Product Colors 面板打开',
      prdDescription: '点击 Product Colors 按钮打开面板',
      status: 'not_found',
      notes: `错误: ${e}`,
    });
  }

  return results;
}

/**
 * 第4.5章：验证 Names & Numbers
 */
export async function verifyNamesAndNumbers(
  page: Page,
  screenshotsDir: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. 打开 Add Names 面板
  const addNamesButton = await findElement(page, [
    'button:has-text("Name")',
    'button:has-text("Names")',
    'button:has-text("Numbers")',
    '[aria-label*="name" i]',
  ]);

  if (!addNamesButton.found) {
    results.push({
      feature: 'Add Names 按钮',
      prdDescription: 'Add Names（Names & Numbers）功能入口',
      status: 'not_found',
    });
    return results;
  }

  try {
    await addNamesButton.element!.click();
    await page.waitForTimeout(2000);
    
    const screenshotPath = path.join(screenshotsDir, 'names-numbers-panel.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // 2. Names and Numbers 面板
    const panelResult = await verifyTextExists(page, /Names.*Numbers|Names and Numbers/i);
    results.push({
      feature: 'Names and Numbers 面板',
      prdDescription: '面板：Names and Numbers（说明+按钮"Add Names and Numbers"）',
      status: panelResult ? 'matched' : 'not_found',
      screenshot: screenshotPath,
    });

    // 3. Tools 面板 - Step 1
    const toolsResult = await verifyTextExists(page, /Tools|Step 1/i);
    if (toolsResult) {
      // 尝试进入 Tools 页面
      const toolsButton = await findElement(page, ['text=/Add Names and Numbers|Enter Tools/i']);
      if (toolsButton.found) {
        try {
          await toolsButton.element!.click();
          await page.waitForTimeout(2000);
          
          // Step 1 功能验证
          const step1Features = [
            { name: 'Add Names', pattern: /Add Names/i },
            { name: 'Add Numbers', pattern: /Add Numbers/i },
            { name: 'Side', pattern: /Side|Front|Back/i },
            { name: 'Height', pattern: /Height|2in|8in/i },
            { name: 'Color', pattern: /Color|Black/i },
          ];

          for (const feature of step1Features) {
            const found = await verifyTextExists(page, feature.pattern);
            results.push({
              feature: `Tools Step 1 - ${feature.name}`,
              prdDescription: feature.name,
              status: found ? 'matched' : 'not_found',
            });
          }

          // 价格说明文案
          const pricingResult = await verifyTextExists(page, /\$5\.50|\$3\.50|each item/i);
          results.push({
            feature: '价格说明文案',
            prdDescription: 'Names $5.50 each item、Numbers $3.50 each item',
            status: pricingResult ? 'matched' : 'not_found',
          });

        } catch (e) {
          results.push({
            feature: 'Tools 面板',
            prdDescription: 'Tools面板（Names and Numbers Tools）',
            status: 'partial',
            notes: `无法进入 Tools 页面: ${e}`,
          });
        }
      }
    }

    // 4. My List 弹窗（需要先完成 Step 1 和 Step 2）
    results.push({
      feature: 'My List 弹窗',
      prdDescription: '列：Name、#（号码）、Size（下拉）、+ Add More、Manage List、Totals、Done',
      status: 'partial',
      notes: '需要先完成 Tools 配置才能看到 My List',
    });

    // 5. My Quantities 弹窗
    results.push({
      feature: 'My Quantities 弹窗',
      prdDescription: 'Items receiving names or numbers [size][qty]、额外不带N&N选项、Totals、Done',
      status: 'partial',
      notes: '需要先完成 My List 才能看到 My Quantities',
    });

  } catch (e) {
    results.push({
      feature: 'Names & Numbers 面板打开',
      prdDescription: '点击 Add Names 按钮打开面板',
      status: 'not_found',
      notes: `错误: ${e}`,
    });
  }

  return results;
}

/**
 * 第5章：验证画布视图与对象编辑
 */
export async function verifyCanvas(
  page: Page,
  screenshotsDir: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. Front/Back/Sleeve Design 切换
  const frontResult = await verifyTextExists(page, /Front/i);
  const backResult = await verifyTextExists(page, /Back/i);
  const sleeveResult = await verifyTextExists(page, /Sleeve/i);
  
  results.push({
    feature: '视图切换按钮',
    prdDescription: 'Front / Back / Sleeve Design（切换当前面；各面独立图层）',
    status: frontResult && backResult ? (sleeveResult ? 'matched' : 'partial') : 'not_found',
    actualImplementation: `Front: ${frontResult ? '找到' : '未找到'}, Back: ${backResult ? '找到' : '未找到'}, Sleeve: ${sleeveResult ? '找到' : '未找到'}`,
  });

  // 2. Zoom 功能
  const zoomResult = await findElement(page, [
    'button:has-text("Zoom")',
    '[aria-label*="zoom" i]',
    '[class*="zoom"]',
  ]);
  results.push({
    feature: 'Zoom 功能',
    prdDescription: '放大/缩小/拖拽/重置视图',
    status: zoomResult.found ? 'matched' : 'not_found',
  });

  // 3. 对象选中功能（需要先添加对象）
  results.push({
    feature: '对象选中',
    prdDescription: '右上角X：删除、角点缩放、旋转控制、拖拽移动、吸附对齐线、显示打印安全区边界',
    status: 'partial',
    notes: '需要先添加对象（文本/图片/素材）才能验证',
  });

  // 4. Layering 面板
  const layeringFeatures = [
    'Bring to Front',
    'Send to Back',
    'Forward',
    'Backward',
  ];

  for (const feature of layeringFeatures) {
    const result = await verifyTextExists(page, new RegExp(feature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    results.push({
      feature: `Layering - ${feature}`,
      prdDescription: feature,
      status: result ? 'matched' : 'partial',
      notes: '可能需要先选中对象才能看到',
    });
  }

  // 5. Center 功能
  const centerResult = await verifyTextExists(page, /Center/i);
  results.push({
    feature: 'Center 功能',
    prdDescription: '居中（水平+垂直）；若超出安全区提示',
    status: centerResult ? 'matched' : 'partial',
    notes: '可能需要先选中对象才能看到',
  });

  // 6. 安全区显示
  results.push({
    feature: '安全区显示',
    prdDescription: '打印安全边界展示；越界警示与阻断提交',
    status: 'partial',
    notes: '需要视觉检查画布上的安全区边界',
  });

  return results;
}

/**
 * 第8章：验证报价流程
 */
export async function verifyPricingFlow(
  page: Page,
  screenshotsDir: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. Get Price 按钮
  const getPriceButton = await findElement(page, [
    'button:has-text("Get Price")',
    'button:has-text("Get a Price")',
    'text=/Get Price/i',
  ]);

  if (!getPriceButton.found) {
    results.push({
      feature: 'Get Price 按钮',
      prdDescription: 'Get Price 按钮',
      status: 'not_found',
    });
    return results;
  }

  try {
    await getPriceButton.element!.click();
    await page.waitForTimeout(3000);
    
    const screenshotPath = path.join(screenshotsDir, 'get-price-start.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // 2. Get Price 起始页
    const buyShipResult = await verifyTextExists(page, /Buy.*Ship/i);
    const fundraiserResult = await verifyTextExists(page, /Fundraiser|Start a Fundraiser/i);
    
    results.push({
      feature: 'Get Price 起始页',
      prdDescription: 'Buy & Ship（默认选中）/ Start a Fundraiser',
      status: buyShipResult ? (fundraiserResult ? 'matched' : 'partial') : 'not_found',
      screenshot: screenshotPath,
      actualImplementation: `Buy & Ship: ${buyShipResult ? '找到' : '未找到'}, Fundraiser: ${fundraiserResult ? '找到' : '未找到'}`,
    });

    // 3. Continue 按钮
    const continueResult = await verifyTextExists(page, /Continue/i);
    results.push({
      feature: 'Continue 按钮',
      prdDescription: 'Continue：进入"Ordering Options"',
      status: continueResult ? 'matched' : 'not_found',
    });

    // 如果找到 Continue，尝试点击进入下一步
    if (continueResult && buyShipResult) {
      try {
        const continueButton = await findElement(page, ['button:has-text("Continue")', 'text=/Continue/i']);
        if (continueButton.found) {
          await continueButton.element!.click();
          await page.waitForTimeout(3000);
          
          const orderingOptionsPath = path.join(screenshotsDir, 'ordering-options.png');
          await page.screenshot({ path: orderingOptionsPath, fullPage: true });

          // 4. Ordering Options
          const shippingResult = await verifyTextExists(page, /Shipping|Ship to/i);
          const sizesQuantitiesResult = await verifyTextExists(page, /Sizes|Quantities|I know the sizes/i);
          const paymentResult = await verifyTextExists(page, /Payment|I will pay/i);
          
          results.push({
            feature: 'Ordering Options',
            prdDescription: 'Shipping、Sizes & Quantities、Payment',
            status: shippingResult && sizesQuantitiesResult && paymentResult ? 'matched' : 'partial',
            screenshot: orderingOptionsPath,
            actualImplementation: `Shipping: ${shippingResult ? '找到' : '未找到'}, Sizes & Quantities: ${sizesQuantitiesResult ? '找到' : '未找到'}, Payment: ${paymentResult ? '找到' : '未找到'}`,
          });

          // 5. Ship to single/multiple addresses
          const singleAddressResult = await verifyTextExists(page, /single address|Ship to single/i);
          const multipleAddressResult = await verifyTextExists(page, /multiple addresses|Ship to multiple/i);
          
          results.push({
            feature: 'Shipping 选项',
            prdDescription: 'Ship to single address / Ship to multiple addresses',
            status: singleAddressResult ? (multipleAddressResult ? 'matched' : 'partial') : 'not_found',
            actualImplementation: `Single: ${singleAddressResult ? '找到' : '未找到'}, Multiple: ${multipleAddressResult ? '找到' : '未找到'}`,
          });

          // 6. I know the sizes / Invite my group
          const knowSizesResult = await verifyTextExists(page, /I know the sizes|know.*sizes/i);
          const inviteGroupResult = await verifyTextExists(page, /Invite.*group|Invite my group/i);
          
          results.push({
            feature: 'Sizes and Quantities 选项',
            prdDescription: 'I know the sizes I need / Invite my group to choose their sizes',
            status: knowSizesResult ? (inviteGroupResult ? 'matched' : 'partial') : 'not_found',
            actualImplementation: `I know: ${knowSizesResult ? '找到' : '未找到'}, Invite: ${inviteGroupResult ? '找到' : '未找到'}`,
          });
        }
      } catch (e) {
        results.push({
          feature: '进入 Ordering Options',
          prdDescription: '点击 Continue 进入 Ordering Options',
          status: 'partial',
          notes: `无法继续: ${e}`,
        });
      }
    }

    // 7. Quantity 页面功能（需要完成 Ordering Options）
    results.push({
      feature: 'Quantity 页面',
      prdDescription: 'YOUTH与ADULT尺码网格、加价文案、+ Add Women\'s、Buy more save more推荐区、Total Quantity',
      status: 'partial',
      notes: '需要完成 Ordering Options 才能进入 Quantity 页面',
    });

    // 8. Order Options 报价结果页
    results.push({
      feature: 'Order Options 报价结果页',
      prdDescription: '价格、统计徽章、促销文案、配送文案、YOUR ORDER列表、底部按钮',
      status: 'partial',
      notes: '需要完成 Quantity 配置才能看到报价结果',
    });

    // 9. Content Check
    results.push({
      feature: 'Content Check',
      prdDescription: '内容合规确认：Edit Design / Agree & Continue',
      status: 'partial',
      notes: '需要上传图片并进入下单流程才能触发',
    });

    // 10. Add to Cart
    results.push({
      feature: 'Add to Cart',
      prdDescription: '加入购物车功能',
      status: 'partial',
      notes: '需要完成报价流程才能验证',
    });

    // 11. 购物车页
    results.push({
      feature: '购物车页（My Cart）',
      prdDescription: '订单项、Delivery Options、Order Summary',
      status: 'partial',
      notes: '需要先加入购物车才能验证',
    });

  } catch (e) {
    results.push({
      feature: 'Get Price 流程',
      prdDescription: '点击 Get Price 进入报价流程',
      status: 'not_found',
      notes: `错误: ${e}`,
    });
  }

  return results;
}

/**
 * 第9章：验证底部操作区
 */
export async function verifyBottomBar(
  page: Page,
  screenshotsDir: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. Add Products
  const addProductsResult = await verifyTextExists(page, /Add Products|Add Product/i);
  results.push({
    feature: 'Add Products',
    prdDescription: '打开产品选择器，添加或替换当前产品',
    status: addProductsResult ? 'matched' : 'not_found',
  });

  // 2. 产品卡
  const changeProductResult = await verifyTextExists(page, /Change Product/i);
  const changeColorResult = await verifyTextExists(page, /Change Color/i);
  
  results.push({
    feature: '产品卡',
    prdDescription: '产品名 + Change Product + Change Color',
    status: changeProductResult && changeColorResult ? 'matched' : (changeProductResult || changeColorResult ? 'partial' : 'not_found'),
    actualImplementation: `Change Product: ${changeProductResult ? '找到' : '未找到'}, Change Color: ${changeColorResult ? '找到' : '未找到'}`,
  });

  // 3. Save | Share
  const saveResult = await verifyTextExists(page, /Save/i);
  const shareResult = await verifyTextExists(page, /Share/i);
  
  results.push({
    feature: 'Save | Share',
    prdDescription: 'Save：保存设计；Share：生成只读/可评论链接',
    status: saveResult && shareResult ? 'matched' : (saveResult || shareResult ? 'partial' : 'not_found'),
    actualImplementation: `Save: ${saveResult ? '找到' : '未找到'}, Share: ${shareResult ? '找到' : '未找到'}`,
  });

  // 4. Get Price（已在报价流程中验证）
  const getPriceResult = await verifyTextExists(page, /Get Price|Get a Price/i);
  results.push({
    feature: 'Get Price（底部栏）',
    prdDescription: '进入报价主流程',
    status: getPriceResult ? 'matched' : 'not_found',
  });

  return results;
}

/**
 * 第10章：验证 Undo/Redo
 */
export async function verifyUndoRedo(
  page: Page,
  screenshotsDir: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. Undo 按钮
  const undoResult = await findElement(page, [
    'button:has-text("Undo")',
    '[aria-label*="undo" i]',
    '[title*="undo" i]',
  ]);
  
  results.push({
    feature: 'Undo 按钮',
    prdDescription: '撤销操作：记录对象创建/删除、属性变化（位置/尺寸/颜色/旋转/文本）、层级变更',
    status: undoResult.found ? 'matched' : 'not_found',
  });

  // 2. Redo 按钮
  const redoResult = await findElement(page, [
    'button:has-text("Redo")',
    '[aria-label*="redo" i]',
    '[title*="redo" i]',
  ]);
  
  results.push({
    feature: 'Redo 按钮',
    prdDescription: '重做操作',
    status: redoResult.found ? 'matched' : 'not_found',
  });

  // 3. 功能验证（需要实际操作才能验证）
  results.push({
    feature: 'Undo/Redo 功能验证',
    prdDescription: '记录对象创建/删除、属性变化、层级变更；视图切换不记录',
    status: undoResult.found && redoResult.found ? 'partial' : 'not_found',
    notes: '需要实际操作（添加/删除对象、修改属性）才能验证功能是否正常工作',
  });

  return results;
}

/**
 * 生成对比报告
 */
export async function generateComparisonReport(
  allResults: Record<string, VerificationResult[]>,
  outputDir: string
): Promise<void> {
  // 统计信息
  let totalFeatures = 0;
  let matchedCount = 0;
  let mismatchedCount = 0;
  let notFoundCount = 0;
  let partialCount = 0;

  const errors: VerificationResult[] = [];
  const missing: VerificationResult[] = [];

  // 遍历所有结果
  for (const [module, results] of Object.entries(allResults)) {
    for (const result of results) {
      totalFeatures++;
      switch (result.status) {
        case 'matched':
          matchedCount++;
          break;
        case 'mismatched':
          mismatchedCount++;
          errors.push(result);
          break;
        case 'not_found':
          notFoundCount++;
          missing.push(result);
          break;
        case 'partial':
          partialCount++;
          break;
      }
    }
  }

  // 生成 JSON 报告
  const jsonReport = {
    summary: {
      totalFeatures,
      matched: matchedCount,
      mismatched: mismatchedCount,
      notFound: notFoundCount,
      partial: partialCount,
      matchRate: totalFeatures > 0 ? ((matchedCount / totalFeatures) * 100).toFixed(2) + '%' : '0%',
    },
    modules: allResults,
    errors: errors.map(r => ({
      feature: r.feature,
      prdDescription: r.prdDescription,
      actualImplementation: r.actualImplementation,
      notes: r.notes,
    })),
    missing: missing.map(r => ({
      feature: r.feature,
      prdDescription: r.prdDescription,
      notes: r.notes,
    })),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(outputDir, 'report.json'),
    JSON.stringify(jsonReport, null, 2),
    'utf-8'
  );

  // 生成 Markdown 报告
  let mdReport = `# Custom Ink Design Lab PRD 3.0 验证报告\n\n`;
  mdReport += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
  mdReport += `## 摘要\n\n`;
  mdReport += `- **总功能点**: ${totalFeatures}\n`;
  mdReport += `- **匹配**: ${matchedCount} (${((matchedCount / totalFeatures) * 100).toFixed(2)}%)\n`;
  mdReport += `- **部分匹配**: ${partialCount} (${((partialCount / totalFeatures) * 100).toFixed(2)}%)\n`;
  mdReport += `- **不匹配**: ${mismatchedCount}\n`;
  mdReport += `- **未找到**: ${notFoundCount} (${((notFoundCount / totalFeatures) * 100).toFixed(2)}%)\n\n`;

  mdReport += `## 各模块验证结果\n\n`;
  for (const [module, results] of Object.entries(allResults)) {
    mdReport += `### ${module}\n\n`;
    mdReport += `| 功能点 | PRD 描述 | 状态 | 实际实现 | 备注 |\n`;
    mdReport += `|--------|----------|------|----------|------|\n`;
    
    for (const result of results) {
      const statusEmoji = {
        matched: '✅',
        partial: '⚠️',
        mismatched: '❌',
        not_found: '❌',
      }[result.status] || '❓';
      
      mdReport += `| ${result.feature} | ${result.prdDescription} | ${statusEmoji} ${result.status} | ${result.actualImplementation || '-'} | ${result.notes || '-'} |\n`;
    }
    mdReport += `\n`;
  }

  if (errors.length > 0) {
    mdReport += `## 错误描述列表（PRD 描述与实际不符）\n\n`;
    for (const error of errors) {
      mdReport += `### ${error.feature}\n\n`;
      mdReport += `- **PRD 描述**: ${error.prdDescription}\n`;
      mdReport += `- **实际实现**: ${error.actualImplementation || '未找到'}\n`;
      if (error.notes) {
        mdReport += `- **备注**: ${error.notes}\n`;
      }
      mdReport += `\n`;
    }
  }

  if (missing.length > 0) {
    mdReport += `## 未实现功能列表（PRD 有但 Custom Ink 未实现）\n\n`;
    for (const item of missing) {
      mdReport += `### ${item.feature}\n\n`;
      mdReport += `- **PRD 描述**: ${item.prdDescription}\n`;
      if (item.notes) {
        mdReport += `- **备注**: ${item.notes}\n`;
      }
      mdReport += `\n`;
    }
  }

  fs.writeFileSync(
    path.join(outputDir, 'report.md'),
    mdReport,
    'utf-8'
  );

  console.log(`[PRD Verification] 报告已生成:`);
  console.log(`  - JSON: ${path.join(outputDir, 'report.json')}`);
  console.log(`  - Markdown: ${path.join(outputDir, 'report.md')}`);
}

