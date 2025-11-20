# [2025-11-19 22:08:27] Custom Ink 风格商品批量上传 CSV 模板使用说明
# [2025-11-19 22:37:14] 优化中文字段说明，添加快速对照表

## 📋 概述

本模板用于后台批量上传商品数据，采用 Custom Ink 风格的商品管理逻辑，包含商品的所有属性、筛选信息、库存信息等。模板为宽表格式，每个 SKU/变体占一行。

## 📊 快速字段对照表

以下是所有字段的中英文对照，方便快速查找：

| 中文名称 | 英文字段名 | 类型 | 必填 |
|---------|-----------|------|------|
| **一、导入批次与记录类型** ||||
| 导入批次ID | `import_batch_id` | 文本 | 是 |
| 记录类型 | `record_type` | 枚举 | 是 |
| 父产品ID | `parent_product_id` | 文本 | 变体必填 |
| **二、商品标识信息** ||||
| 产品ID | `product_id` | 文本 | 是 |
| SKU编码 | `sku` | 文本 | 是 |
| 供应商SKU | `vendor_sku` | 文本 | 否 |
| UPC条码 | `upc` | 数字 | 否 |
| **三、发布状态与渠道** ||||
| 状态 | `status` | 枚举 | 是 |
| 发布到网站 | `publish_channel_web` | 布尔值 | 是 |
| 发布到设计实验室 | `publish_channel_design_lab` | 布尔值 | 是 |
| 发布到B2B门户 | `publish_channel_b2b_portal` | 布尔值 | 是 |
| **四、商品基本信息** ||||
| 产品名称 | `product_name` | 文本 | 是 |
| 产品简称 | `product_short_name` | 文本 | 否 |
| 产品URL别名 | `product_slug` | 文本 | 是 |
| 产品类型 | `product_type` | 文本 | 是 |
| **五、分类与标签** ||||
| 主分类 | `primary_category` | 文本 | 是 |
| 次分类 | `secondary_category` | 文本 | 否 |
| Custom Ink分类 | `custom_ink_category` | 文本 | 否 |
| 集合标签 | `collection_tags` | 文本 | 否 |
| 营销标签 | `marketing_tags` | 文本 | 否 |
| 场合标签 | `occasion_tags` | 文本 | 否 |
| **六、受众与适用性** ||||
| 受众性别 | `audience_gender` | 枚举 | 是 |
| 受众年龄组 | `audience_age_group` | 文本 | 否 |
| **七、商品属性（服装类）** ||||
| 版型 | `fit_type` | 文本 | 服装类必填 |
| 袖长 | `sleeve_length` | 枚举 | 服装类必填 |
| 领型 | `neckline` | 文本 | 服装类必填 |
| **八、面料与材质** ||||
| 面料类型 | `fabric_type` | 文本 | 服装类必填 |
| 材质成分 | `material_content` | 文本 | 否 |
| 面料重量(盎司) | `fabric_weight_oz` | 数字 | 否 |
| 面料弹性 | `fabric_stretch` | 文本 | 否 |
| 面料特性 | `fabric_features` | 文本 | 否 |
| **九、颜色信息** ||||
| 颜色名称 | `color_name` | 文本 | 变体必填 |
| 颜色十六进制值 | `color_hex` | 文本 | 否 |
| 颜色族 | `color_family` | 文本 | 否 |
| 颜色色板URL | `color_swatch_url` | URL | 否 |
| **十、尺码信息** ||||
| 尺码代码 | `size_code` | 文本 | 变体必填 |
| 尺码组 | `size_group` | 文本 | 否 |
| 尺码排序位置 | `size_run_position` | 数字 | 否 |
| **十一、个性化定制** ||||
| 支持个性化姓名 | `personalized_names_supported` | 布尔值 | 是 |
| 支持个性化号码 | `personalized_numbers_supported` | 布尔值 | 是 |
| 最小个性化数量 | `min_personalization_qty` | 数字 | 否 |
| **十二、装饰与定制方法** ||||
| 支持的装饰方法 | `decoration_methods_supported` | 文本 | 是 |
| 丝网印刷最大颜色数 | `decoration_max_colors_screen_print` | 数字 | 否 |
| 数码印刷最大颜色数 | `decoration_max_colors_digital_print` | 数字 | 否 |
| 最大刺绣针数 | `decoration_max_stitch_count` | 数字 | 否 |
| 定制说明 | `customization_notes` | 文本 | 否 |
| 设计稿要求 | `artwork_requirements` | 文本 | 否 |
| **十三、订购数量与价格** ||||
| 最小订购数量 | `min_order_qty` | 数字 | 是 |
| MOQ增量 | `moq_increment` | 数字 | 否 |
| 基础价格(加元) | `base_price_cad` | 数字 | 是 |
| 价格档位1数量 | `price_break_qty_1` | 数字 | 否 |
| 价格档位1价格(加元) | `price_break_price_cad_1` | 数字 | 否 |
| 价格档位2数量 | `price_break_qty_2` | 数字 | 否 |
| 价格档位2价格(加元) | `price_break_price_cad_2` | 数字 | 否 |
| 价格档位3数量 | `price_break_qty_3` | 数字 | 否 |
| 价格档位3价格(加元) | `price_break_price_cad_3` | 数字 | 否 |
| 设置费(加元) | `setup_fee_cad` | 数字 | 否 |
| **十四、交期与物流** ||||
| 支持加急 | `rush_available` | 布尔值 | 是 |
| 加急交期(天数) | `rush_lead_time_days` | 数字 | 否 |
| 标准交期(天数) | `standard_lead_time_days` | 数字 | 是 |
| 履约类型 | `fulfillment_type` | 枚举 | 是 |
| **十五、库存管理** ||||
| 仓库代码 | `warehouse_code` | 文本 | 仓库发货必填 |
| 仓库货位 | `warehouse_bin` | 文本 | 否 |
| 现有库存 | `inventory_on_hand` | 数字 | 是 |
| 安全库存 | `safety_stock` | 数字 | 否 |
| 补货点 | `reorder_point` | 数字 | 否 |
| 允许缺货预订 | `backorder_allowed` | 布尔值 | 是 |
| 补货日期 | `restock_date` | 日期 | 否 |
| **十六、代发货信息** ||||
| 代发货供应商 | `dropship_vendor` | 文本 | 代发货必填 |
| 代发货交期(天数) | `dropship_lead_time_days` | 数字 | 代发货必填 |
| **十七、物流尺寸与重量** ||||
| 发货重量(磅) | `shipping_weight_lbs` | 数字 | 是 |
| 发货长度(英寸) | `shipping_length_in` | 数字 | 是 |
| 发货宽度(英寸) | `shipping_width_in` | 数字 | 是 |
| 发货高度(英寸) | `shipping_height_in` | 数字 | 是 |
| **十八、合规与认证** ||||
| 原产国 | `country_of_origin` | 文本 | 否 |
| 护理说明 | `care_instructions` | 文本 | 否 |
| 合规认证 | `compliance_certifications` | 文本 | 否 |
| **十九、SEO与搜索** ||||
| SEO标题 | `seo_title` | 文本 | 否 |
| SEO描述 | `seo_description` | 文本 | 否 |
| 搜索关键词 | `search_keywords` | 文本 | 否 |
| **二十、商品描述** ||||
| 详细描述 | `long_description` | 文本 | 否 |
| 卖点1 | `bullet_feature_1` | 文本 | 否 |
| 卖点2 | `bullet_feature_2` | 文本 | 否 |
| 卖点3 | `bullet_feature_3` | 文本 | 否 |
| **二十一、图片与资源** ||||
| 主图URL | `hero_image_url` | URL | 是 |
| 正面视图URL | `alt_view_front_url` | URL | 否 |
| 背面视图URL | `alt_view_back_url` | URL | 否 |
| 模特图URL | `model_image_url` | URL | 否 |
| 资源版权到期日 | `asset_rights_expiry` | 日期 | 否 |
| 生活方式图库URL | `lifestyle_gallery_urls` | URL | 否 |
| 规格表URL | `spec_sheet_url` | URL | 否 |
| 洗涤说明图URL | `wash_instruction_asset_url` | URL | 否 |
| **二十二、内部管理** ||||
| 样品备注 | `sample_notes` | 文本 | 否 |
| 内部备注 | `internal_notes` | 文本 | 否 |
| QA状态 | `qa_status` | 枚举 | 否 |
| QA负责人 | `qa_owner` | 邮箱 | 否 |
| 最后审核时间 | `last_reviewed_at` | 日期时间 | 否 |

---

## 📝 详细字段说明

### 一、导入批次与记录类型

#### 导入批次ID (`import_batch_id`)
- **英文字段名**: `import_batch_id`
- **类型**: 文本
- **必填**: 是
- **说明**: 本次批量导入的唯一标识符，用于追踪和管理同一批次的所有记录
- **示例**: `CI-IMPORT-001`

#### 记录类型 (`record_type`)
- **英文字段名**: `record_type`
- **类型**: 枚举
- **必填**: 是
- **可选值**: `Product`（产品主记录）、`Variant`（变体记录）
- **说明**: 标识当前行是产品主记录还是变体记录。产品主记录包含通用信息，变体记录包含具体 SKU 的详细信息
- **示例**: `Variant`

#### 父产品ID (`parent_product_id`)
- **英文字段名**: `parent_product_id`
- **类型**: 文本
- **必填**: 变体记录必填
- **说明**: 变体记录所属的父产品ID，用于关联变体与主产品
- **示例**: `PROD-GL5000`

---

### 二、商品标识信息

#### 产品ID (`product_id`)
- **英文字段名**: `product_id`
- **类型**: 文本
- **必填**: 是
- **说明**: 产品的唯一标识符，系统内部使用
- **示例**: `PROD-GL5000-NAVY-S`

#### SKU编码 (`sku`)
- **英文字段名**: `sku`
- **类型**: 文本
- **必填**: 是
- **说明**: 库存单位编码，用于库存管理和订单处理
- **示例**: `GL5000-NVY-S`

#### 供应商SKU (`vendor_sku`)
- **英文字段名**: `vendor_sku`
- **类型**: 文本
- **必填**: 否
- **说明**: 供应商提供的SKU编码，用于采购和供应商对接
- **示例**: `G5000-78000`

#### UPC条码 (`upc`)
- **英文字段名**: `upc`
- **类型**: 数字（12位）
- **必填**: 否
- **说明**: 通用产品代码，用于零售和库存管理
- **示例**: `123456789012`

---

### 三、发布状态与渠道

#### 状态 (`status`)
- **英文字段名**: `status`
- **类型**: 枚举
- **必填**: 是
- **可选值**: `active`（激活）、`inactive`（停用）、`draft`（草稿）、`archived`（归档）
- **说明**: 商品的发布状态
- **示例**: `active`

#### 发布到网站 (`publish_channel_web`)
- **英文字段名**: `publish_channel_web`
- **类型**: 布尔值
- **必填**: 是
- **可选值**: `yes`、`no`
- **说明**: 是否在网站前台显示该商品
- **示例**: `yes`

#### 发布到设计实验室 (`publish_channel_design_lab`)
- **英文字段名**: `publish_channel_design_lab`
- **类型**: 布尔值
- **必填**: 是
- **可选值**: `yes`、`no`
- **说明**: 是否在设计实验室（Design Lab）中可用
- **示例**: `yes`

#### `publish_channel_b2b_portal` (发布到B2B门户)
- **类型**: 布尔值
- **必填**: 是
- **可选值**: `yes`、`no`
- **说明**: 是否在B2B企业门户中显示
- **示例**: `yes`

---

### 四、商品基本信息

#### 产品名称 (`product_name`)
- **英文字段名**: `product_name`
- **类型**: 文本
- **必填**: 是
- **说明**: 商品的完整名称，用于前台显示和SEO
- **示例**: `Gildan Softstyle Jersey T-Shirt`

#### 产品简称 (`product_short_name`)
- **英文字段名**: `product_short_name`
- **类型**: 文本
- **必填**: 否
- **说明**: 商品的简短名称，用于列表显示和移动端
- **示例**: `Softstyle Tee`

#### 产品URL别名 (`product_slug`)
- **英文字段名**: `product_slug`
- **类型**: 文本（小写，连字符分隔）
- **必填**: 是
- **说明**: 用于生成产品页面的URL，必须是唯一的
- **示例**: `gildan-softstyle-jersey-t-shirt`

#### 产品类型 (`product_type`)
- **英文字段名**: `product_type`
- **类型**: 文本
- **必填**: 是
- **说明**: 产品的基础类型分类
- **示例**: `t-shirt`、`hoodie`、`polo`、`bag`、`drinkware`

---

### 五、分类与标签

#### 主分类 (`primary_category`)
- **英文字段名**: `primary_category`
- **类型**: 文本（层级用 > 分隔）
- **必填**: 是
- **说明**: 商品的主要分类路径
- **示例**: `Apparel > T-Shirts`

#### 次分类 (`secondary_category`)
- **英文字段名**: `secondary_category`
- **类型**: 文本
- **必填**: 否
- **说明**: 商品的次要分类，用于更细粒度的分类
- **示例**: `Short Sleeve Tees`

#### Custom Ink分类 (`custom_ink_category`)
- **英文字段名**: `custom_ink_category`
- **类型**: 文本
- **必填**: 否
- **说明**: 参考 Custom Ink 的分类体系
- **示例**: `Custom Ink T-Shirts`

#### 集合标签 (`collection_tags`)
- **英文字段名**: `collection_tags`
- **类型**: 文本（多个用逗号分隔）
- **必填**: 否
- **说明**: 用于商品集合/系列分组，多个标签用逗号分隔
- **示例**: `core,quick-ship`

#### 营销标签 (`marketing_tags`)
- **英文字段名**: `marketing_tags`
- **类型**: 文本（多个用逗号分隔）
- **必填**: 否
- **说明**: 用于营销推广的标签，如"新品"、"热销"、"环保"等
- **示例**: `trending,eco-friendly`

#### 场合标签 (`occasion_tags`)
- **英文字段名**: `occasion_tags`
- **类型**: 文本（多个用分号分隔）
- **必填**: 否
- **说明**: 商品适用的场合，多个场合用分号分隔
- **示例**: `corporate events;fundraisers;team uniforms`

---

### 六、受众与适用性

#### 受众性别 (`audience_gender`)
- **英文字段名**: `audience_gender`
- **类型**: 枚举
- **必填**: 是
- **可选值**: `men`（男）、`women`（女）、`unisex`（中性）、`kids`（儿童）
- **说明**: 商品的目标性别群体
- **示例**: `unisex`

#### 受众年龄组 (`audience_age_group`)
- **英文字段名**: `audience_age_group`
- **类型**: 文本
- **必填**: 否
- **可选值**: `adult`（成人）、`youth`（青少年）、`toddler`（幼儿）、`infant`（婴儿）
- **说明**: 商品的目标年龄群体
- **示例**: `adult`

---

### 七、商品属性（服装类）

#### 版型 (`fit_type`)
- **英文字段名**: `fit_type`
- **类型**: 文本
- **必填**: 否（服装类必填）
- **可选值**: `slim fit`（修身）、`regular fit`（常规）、`relaxed fit`（宽松）、`modern retail`（现代零售版型）
- **说明**: 服装的版型类型
- **示例**: `modern retail`

#### 袖长 (`sleeve_length`)
- **英文字段名**: `sleeve_length`
- **类型**: 枚举
- **必填**: 否（服装类必填）
- **可选值**: `sleeveless`（无袖）、`short`（短袖）、`3/4`（七分袖）、`long`（长袖）
- **说明**: 袖子的长度
- **示例**: `short`

#### 领型 (`neckline`)
- **英文字段名**: `neckline`
- **类型**: 文本
- **必填**: 否（服装类必填）
- **可选值**: `crew`（圆领）、`v-neck`（V领）、`henley`（亨利领）、`polo`（Polo领）、`turtle`（高领）
- **说明**: 领口的样式
- **示例**: `crew`

---

### 八、面料与材质

#### 面料类型 (`fabric_type`)
- **英文字段名**: `fabric_type`
- **类型**: 文本
- **必填**: 否（服装类必填）
- **说明**: 面料的类型名称
- **示例**: `Fine Jersey`、`Fleece`、`Canvas`

#### 材质成分 (`material_content`)
- **英文字段名**: `material_content`
- **类型**: 文本
- **必填**: 否
- **说明**: 面料的材质成分，如"100% cotton"、"50% cotton, 50% polyester"
- **示例**: `100% ringspun cotton`

#### 面料重量 (`fabric_weight_oz`)
- **英文字段名**: `fabric_weight_oz`
- **类型**: 数字（盎司）
- **必填**: 否
- **说明**: 每平方码面料的重量（盎司），用于描述面料厚度
- **示例**: `4.5`

#### 面料弹性 (`fabric_stretch`)
- **英文字段名**: `fabric_stretch`
- **类型**: 文本
- **必填**: 否
- **可选值**: `none`（无弹性）、`slight`（轻微）、`medium`（中等）、`high`（高弹性）
- **说明**: 面料的弹性程度
- **示例**: `medium stretch`

#### 面料特性 (`fabric_features`)
- **英文字段名**: `fabric_features`
- **类型**: 文本（多个用分号分隔）
- **必填**: 否
- **说明**: 面料的特殊特性，多个特性用分号分隔
- **示例**: `tagless label;tear-away tag;shoulder-to-shoulder taping`

---

### 九、颜色信息

#### 颜色名称 (`color_name`)
- **英文字段名**: `color_name`
- **类型**: 文本
- **必填**: 是（变体记录必填）
- **说明**: 颜色的显示名称
- **示例**: `Navy`、`Heather Grey`、`Black`

#### 颜色十六进制值 (`color_hex`)
- **英文字段名**: `color_hex`
- **类型**: 文本（#RRGGBB格式）
- **必填**: 否
- **说明**: 颜色的十六进制代码，用于前端显示和筛选
- **示例**: `#1E2A44`

#### 颜色族 (`color_family`)
- **英文字段名**: `color_family`
- **类型**: 文本
- **必填**: 否
- **可选值**: `Red`、`Blue`、`Green`、`Yellow`、`Black`、`White`、`Grey`等
- **说明**: 颜色的主要色系，用于颜色筛选
- **示例**: `Blue`

#### 颜色色板图片URL (`color_swatch_url`)
- **英文字段名**: `color_swatch_url`
- **类型**: URL
- **必填**: 否
- **说明**: 颜色色板图片的URL地址
- **示例**: `/assets/swatches/gildan-softstyle-navy.png`

---

### 十、尺码信息

#### 尺码代码 (`size_code`)
- **英文字段名**: `size_code`
- **类型**: 文本
- **必填**: 是（变体记录必填）
- **可选值**: `XS`、`S`、`M`、`L`、`XL`、`2XL`、`3XL`、`4XL`等，或数字尺码
- **说明**: 商品的尺码代码
- **示例**: `S`

#### 尺码组 (`size_group`)
- **英文字段名**: `size_group`
- **类型**: 文本
- **必填**: 否
- **说明**: 尺码所属的组别，如"Adult Unisex"、"Youth"、"Plus Size"
- **示例**: `Adult Unisex`

#### 尺码排序位置 (`size_run_position`)
- **英文字段名**: `size_run_position`
- **类型**: 数字
- **必填**: 否
- **说明**: 尺码在尺码列表中的排序位置，数字越小越靠前
- **示例**: `4`（表示在尺码列表中排第4位）

---

### 十一、个性化定制

#### 支持个性化姓名 (`personalized_names_supported`)
- **英文字段名**: `personalized_names_supported`
- **类型**: 布尔值
- **必填**: 是
- **可选值**: `yes`、`no`
- **说明**: 是否支持在商品上添加个性化姓名
- **示例**: `yes`

#### 支持个性化号码 (`personalized_numbers_supported`)
- **英文字段名**: `personalized_numbers_supported`
- **类型**: 布尔值
- **必填**: 是
- **可选值**: `yes`、`no`
- **说明**: 是否支持在商品上添加个性化号码
- **示例**: `yes`

#### 最小个性化数量 (`min_personalization_qty`)
- **英文字段名**: `min_personalization_qty`
- **类型**: 数字
- **必填**: 否
- **说明**: 启用个性化定制所需的最小订购数量
- **示例**: `1`

---

### 十二、装饰与定制方法

#### 支持的装饰方法 (`decoration_methods_supported`)
- **英文字段名**: `decoration_methods_supported`
- **类型**: 文本（多个用竖线 | 分隔）
- **必填**: 是
- **可选值**: `Screen Print`（丝网印刷）、`Digital Print`（数码印刷）、`Embroidery`（刺绣）、`Heat Transfer`（热转印）、`Vinyl`（乙烯基贴花）
- **说明**: 该商品支持的装饰方法，多个方法用竖线分隔
- **示例**: `Screen Print|Digital Print|Embroidery`

#### 丝网印刷最大颜色数 (`decoration_max_colors_screen_print`)
- **英文字段名**: `decoration_max_colors_screen_print`
- **类型**: 数字
- **必填**: 否
- **说明**: 丝网印刷支持的最大颜色数量
- **示例**: `6`

#### 数码印刷最大颜色数 (`decoration_max_colors_digital_print`)
- **英文字段名**: `decoration_max_colors_digital_print`
- **类型**: 数字
- **必填**: 否
- **说明**: 数码印刷支持的最大颜色数量（通常为全彩）
- **示例**: `8`

#### 最大刺绣针数 (`decoration_max_stitch_count`)
- **英文字段名**: `decoration_max_stitch_count`
- **类型**: 数字
- **必填**: 否
- **说明**: 刺绣装饰支持的最大针数
- **示例**: `15000`

#### 定制说明 (`customization_notes`)
- **英文字段名**: `customization_notes`
- **类型**: 文本（多个用分号分隔）
- **必填**: 否
- **说明**: 关于定制选项的特殊说明，多个说明用分号分隔
- **示例**: `Names printed on upper back;Numbers limited to 2 digits`

#### 设计稿要求 (`artwork_requirements`)
- **英文字段名**: `artwork_requirements`
- **类型**: 文本（多个用分号分隔）
- **必填**: 否
- **说明**: 客户上传设计稿的要求和限制
- **示例**: `Upload vector art (AI, PDF) min 300 DPI;Max front art 11x11 in`

---

### 十三、订购数量与价格

#### 最小订购数量 (`min_order_qty`)
- **英文字段名**: `min_order_qty`
- **类型**: 数字
- **必填**: 是
- **说明**: 该商品/变体的最小订购数量
- **示例**: `12`

#### MOQ增量 (`moq_increment`)
- **英文字段名**: `moq_increment`
- **类型**: 数字
- **必填**: 否
- **说明**: 最小订购数量的增量单位，如12、24、36等
- **示例**: `12`

#### 基础价格-加元 (`base_price_cad`)
- **英文字段名**: `base_price_cad`
- **类型**: 数字（两位小数）
- **必填**: 是
- **说明**: 商品的基础单价（加元），通常对应最小订购数量
- **示例**: `17.50`

#### `price_break_qty_1` (价格档位1数量)
- **类型**: 数字
- **必填**: 否
- **说明**: 第一个价格档位的订购数量阈值
- **示例**: `24`

#### `price_break_price_cad_1` (价格档位1价格-加元)
- **类型**: 数字（两位小数）
- **必填**: 否
- **说明**: 达到第一个价格档位时的单价（加元）
- **示例**: `14.25`

#### `price_break_qty_2` (价格档位2数量)
- **类型**: 数字
- **必填**: 否
- **说明**: 第二个价格档位的订购数量阈值
- **示例**: `48`

#### `price_break_price_cad_2` (价格档位2价格-加元)
- **类型**: 数字（两位小数）
- **必填**: 否
- **说明**: 达到第二个价格档位时的单价（加元）
- **示例**: `11.80`

#### `price_break_qty_3` (价格档位3数量)
- **类型**: 数字
- **必填**: 否
- **说明**: 第三个价格档位的订购数量阈值
- **示例**: `72`

#### `price_break_price_cad_3` (价格档位3价格-加元)
- **类型**: 数字（两位小数）
- **必填**: 否
- **说明**: 达到第三个价格档位时的单价（加元）
- **示例**: `9.95`

#### 设置费-加元 (`setup_fee_cad`)
- **英文字段名**: `setup_fee_cad`
- **类型**: 数字（两位小数）
- **必填**: 否
- **说明**: 一次性设置费用（加元），通常用于定制订单
- **示例**: `45`

---

### 十四、交期与物流

#### 支持加急 (`rush_available`)
- **英文字段名**: `rush_available`
- **类型**: 布尔值
- **必填**: 是
- **可选值**: `yes`、`no`
- **说明**: 是否支持加急订单
- **示例**: `yes`

#### 加急交期-天数 (`rush_lead_time_days`)
- **英文字段名**: `rush_lead_time_days`
- **类型**: 数字
- **必填**: 否（如果支持加急则必填）
- **说明**: 加急订单的交期（天数）
- **示例**: `2`

#### 标准交期-天数 (`standard_lead_time_days`)
- **英文字段名**: `standard_lead_time_days`
- **类型**: 数字
- **必填**: 是
- **说明**: 标准订单的交期（天数）
- **示例**: `7`

#### 履约类型 (`fulfillment_type`)
- **英文字段名**: `fulfillment_type`
- **类型**: 枚举
- **必填**: 是
- **可选值**: `warehouse`（仓库发货）、`dropship`（代发货）、`print-on-demand`（按需印刷）
- **说明**: 商品的履约方式
- **示例**: `warehouse`

---

### 十五、库存管理

#### 仓库代码 (`warehouse_code`)
- **英文字段名**: `warehouse_code`
- **类型**: 文本
- **必填**: 否（仓库发货类型必填）
- **说明**: 商品存放的仓库代码
- **示例**: `TOR-01`（多伦多1号仓）

#### 仓库货位 (`warehouse_bin`)
- **英文字段名**: `warehouse_bin`
- **类型**: 文本
- **必填**: 否
- **说明**: 商品在仓库中的具体货位编号
- **示例**: `A3-14`

#### 现有库存 (`inventory_on_hand`)
- **英文字段名**: `inventory_on_hand`
- **类型**: 数字
- **必填**: 是
- **说明**: 当前实际库存数量
- **示例**: `250`

#### 安全库存 (`safety_stock`)
- **英文字段名**: `safety_stock`
- **类型**: 数字
- **必填**: 否
- **说明**: 保持的最低安全库存数量
- **示例**: `60`

#### 补货点 (`reorder_point`)
- **英文字段名**: `reorder_point`
- **类型**: 数字
- **必填**: 否
- **说明**: 触发补货的库存阈值
- **示例**: `120`

#### 允许缺货预订 (`backorder_allowed`)
- **英文字段名**: `backorder_allowed`
- **类型**: 布尔值
- **必填**: 是
- **可选值**: `yes`、`no`
- **说明**: 当库存不足时是否允许客户预订
- **示例**: `no`

#### 补货日期 (`restock_date`)
- **英文字段名**: `restock_date`
- **类型**: 日期（YYYY-MM-DD）
- **必填**: 否
- **说明**: 预计补货到货日期
- **示例**: `2025-12-05`

---

### 十六、代发货信息

#### 代发货供应商 (`dropship_vendor`)
- **英文字段名**: `dropship_vendor`
- **类型**: 文本
- **必填**: 否（代发货类型必填）
- **说明**: 代发货供应商的名称
- **示例**: `Alpha Apparel`

#### 代发货交期-天数 (`dropship_lead_time_days`)
- **英文字段名**: `dropship_lead_time_days`
- **类型**: 数字
- **必填**: 否（代发货类型必填）
- **说明**: 代发货供应商的交期（天数）
- **示例**: `5`

---

### 十七、物流尺寸与重量

#### 发货重量-磅 (`shipping_weight_lbs`)
- **英文字段名**: `shipping_weight_lbs`
- **类型**: 数字（两位小数）
- **必填**: 是
- **说明**: 单个商品的发货重量（磅），用于计算运费
- **示例**: `0.45`

#### 发货长度-英寸 (`shipping_length_in`)
- **英文字段名**: `shipping_length_in`
- **类型**: 数字（一位小数）
- **必填**: 是
- **说明**: 包装后的长度（英寸）
- **示例**: `12.0`

#### 发货宽度-英寸 (`shipping_width_in`)
- **英文字段名**: `shipping_width_in`
- **类型**: 数字（一位小数）
- **必填**: 是
- **说明**: 包装后的宽度（英寸）
- **示例**: `10.0`

#### 发货高度-英寸 (`shipping_height_in`)
- **英文字段名**: `shipping_height_in`
- **类型**: 数字（一位小数）
- **必填**: 是
- **说明**: 包装后的高度（英寸）
- **示例**: `1.0`

---

### 十八、合规与认证

#### 原产国 (`country_of_origin`)
- **英文字段名**: `country_of_origin`
- **类型**: 文本
- **必填**: 否
- **说明**: 商品的原产国家
- **示例**: `Canada`、`USA`、`China`

#### 护理说明 (`care_instructions`)
- **英文字段名**: `care_instructions`
- **类型**: 文本
- **必填**: 否
- **说明**: 商品的洗涤和护理说明
- **示例**: `Machine wash cold inside-out; tumble dry low`

#### 合规认证 (`compliance_certifications`)
- **英文字段名**: `compliance_certifications`
- **类型**: 文本（多个用分号分隔）
- **必填**: 否
- **说明**: 商品获得的合规认证，如"WRAP"、"OEKO-TEX"等
- **示例**: `WRAP;OEKO-TEX Standard 100`

---

### 十九、SEO与搜索

#### SEO标题 (`seo_title`)
- **英文字段名**: `seo_title`
- **类型**: 文本（建议60字符以内）
- **必填**: 否
- **说明**: 用于搜索引擎优化的页面标题
- **示例**: `Gildan Softstyle Custom T-Shirts`

#### SEO描述 (`seo_description`)
- **英文字段名**: `seo_description`
- **类型**: 文本（建议160字符以内）
- **必填**: 否
- **说明**: 用于搜索引擎优化的页面描述
- **示例**: `Premium ringspun cotton tee ready for screen print or embroidery`

#### 搜索关键词 (`search_keywords`)
- **英文字段名**: `search_keywords`
- **类型**: 文本（多个用逗号分隔）
- **必填**: 否
- **说明**: 用于站内搜索的关键词，多个关键词用逗号分隔
- **示例**: `custom t-shirt,gildan softstyle,screen print tee`

---

### 二十、商品描述

#### 详细描述 (`long_description`)
- **英文字段名**: `long_description`
- **类型**: 文本
- **必填**: 否
- **说明**: 商品的详细描述，用于产品详情页
- **示例**: `Soft ringspun cotton tee available in 60+ colors with fast turn options.`

#### `bullet_feature_1` (卖点1)
- **类型**: 文本
- **必填**: 否
- **说明**: 商品的主要卖点/特性，用于产品详情页的要点列表
- **示例**: `Retail fit with tear-away label`

#### `bullet_feature_2` (卖点2)
- **类型**: 文本
- **必填**: 否
- **说明**: 商品的第二个卖点/特性
- **示例**: `Pairs with full-color digital print`

#### `bullet_feature_3` (卖点3)
- **类型**: 文本
- **必填**: 否
- **说明**: 商品的第三个卖点/特性
- **示例**: `Eligible for rush 5-day delivery`

---

### 二十一、图片与资源

#### 主图URL (`hero_image_url`)
- **英文字段名**: `hero_image_url`
- **类型**: URL
- **必填**: 是
- **说明**: 商品的主图URL，用于列表页和详情页
- **示例**: `https://cdn.print.example/products/gl5000/navy/hero.jpg`

#### 正面视图URL (`alt_view_front_url`)
- **英文字段名**: `alt_view_front_url`
- **类型**: URL
- **必填**: 否
- **说明**: 商品正面视图的图片URL
- **示例**: `https://cdn.print.example/products/gl5000/navy/front.png`

#### 背面视图URL (`alt_view_back_url`)
- **英文字段名**: `alt_view_back_url`
- **类型**: URL
- **必填**: 否
- **说明**: 商品背面视图的图片URL
- **示例**: `https://cdn.print.example/products/gl5000/navy/back.png`

#### 模特图URL (`model_image_url`)
- **英文字段名**: `model_image_url`
- **类型**: URL
- **必填**: 否
- **说明**: 商品在真人模特上的展示图片URL
- **示例**: `https://cdn.print.example/products/gl5000/navy/model.jpg`

#### 资源版权到期日 (`asset_rights_expiry`)
- **英文字段名**: `asset_rights_expiry`
- **类型**: 日期（YYYY-MM-DD）
- **必填**: 否
- **说明**: 图片资源的使用权限到期日期
- **示例**: `2026-12-31`

#### 生活方式图库URL (`lifestyle_gallery_urls`)
- **英文字段名**: `lifestyle_gallery_urls`
- **类型**: URL（多个用竖线 | 分隔）
- **必填**: 否
- **说明**: 生活方式/场景图片的URL列表，多个URL用竖线分隔
- **示例**: `https://cdn.print.example/products/gl5000/navy/gallery-1.jpg|https://cdn.print.example/products/gl5000/navy/gallery-2.jpg`

#### 规格表URL (`spec_sheet_url`)
- **英文字段名**: `spec_sheet_url`
- **类型**: URL
- **必填**: 否
- **说明**: 商品规格表的PDF或图片URL
- **示例**: `https://cdn.print.example/products/gl5000/spec-sheet.pdf`

#### 洗涤说明图URL (`wash_instruction_asset_url`)
- **英文字段名**: `wash_instruction_asset_url`
- **类型**: URL
- **必填**: 否
- **说明**: 洗涤说明图标的URL
- **示例**: `https://cdn.print.example/products/gl5000/wash-icons.png`

---

### 二十二、内部管理

#### 样品备注 (`sample_notes`)
- **英文字段名**: `sample_notes`
- **类型**: 文本
- **必填**: 否
- **说明**: 关于样品的特殊备注信息
- **示例**: `Use for QA sampling lot 17 only`

#### 内部备注 (`internal_notes`)
- **英文字段名**: `internal_notes`
- **类型**: 文本
- **必填**: 否
- **说明**: 仅供内部使用的备注信息，不会显示给客户
- **示例**: `Validate navy dye lots before publishing`

#### QA状态 (`qa_status`)
- **英文字段名**: `qa_status`
- **类型**: 枚举
- **必填**: 否
- **可选值**: `pending`（待审核）、`approved`（已批准）、`rejected`（已拒绝）、`needs_revision`（需要修订）
- **说明**: 商品的质量审核状态
- **示例**: `approved`

#### QA负责人 (`qa_owner`)
- **英文字段名**: `qa_owner`
- **类型**: 邮箱
- **必填**: 否
- **说明**: 负责该商品质量审核的人员邮箱
- **示例**: `merch-ops@print.com`

#### 最后审核时间 (`last_reviewed_at`)
- **英文字段名**: `last_reviewed_at`
- **类型**: 日期时间（YYYY-MM-DD HH:MM:SS）
- **必填**: 否
- **说明**: 商品最后一次被审核的时间
- **示例**: `2025-11-10 15:25:00`

---

## 📌 使用注意事项

### 1. 数据格式要求

- **分隔符**: CSV文件使用逗号（`,`）作为字段分隔符
- **多值字段**: 
  - 使用逗号（`,`）分隔：`collection_tags`、`marketing_tags`、`search_keywords`
  - 使用分号（`;`）分隔：`occasion_tags`、`fabric_features`、`customization_notes`
  - 使用竖线（`|`）分隔：`decoration_methods_supported`、`lifestyle_gallery_urls`
- **文本包含逗号**: 如果文本内容包含逗号，请用双引号包裹整个字段
- **日期格式**: 使用 `YYYY-MM-DD` 格式（如 `2025-12-05`）
- **日期时间格式**: 使用 `YYYY-MM-DD HH:MM:SS` 格式（如 `2025-11-10 15:25:00`）

### 2. 必填字段

以下字段为必填项，导入时必须提供：

- `import_batch_id`
- `record_type`
- `product_id`
- `sku`
- `status`
- `publish_channel_web`
- `publish_channel_design_lab`
- `publish_channel_b2b_portal`
- `product_name`
- `product_slug`
- `product_type`
- `primary_category`
- `audience_gender`
- `personalized_names_supported`
- `personalized_numbers_supported`
- `decoration_methods_supported`
- `min_order_qty`
- `base_price_cad`
- `standard_lead_time_days`
- `fulfillment_type`
- `inventory_on_hand`
- `backorder_allowed`
- `shipping_weight_lbs`
- `shipping_length_in`
- `shipping_width_in`
- `shipping_height_in`
- `hero_image_url`

对于变体记录（`record_type = Variant`），以下字段也是必填：

- `parent_product_id`
- `color_name`
- `size_code`

### 3. 数据验证

导入系统会进行以下验证：

- **唯一性检查**: `product_id`、`sku` 必须唯一
- **关联性检查**: 变体记录的 `parent_product_id` 必须存在
- **格式验证**: 日期、数字、URL等字段的格式验证
- **枚举值验证**: 枚举类型字段的值必须在允许的范围内

### 4. 批量导入建议

1. **先导入主产品**: 如果使用 `Product` 和 `Variant` 分离的方式，先导入主产品记录
2. **批次管理**: 使用有意义的 `import_batch_id`，便于追踪和回滚
3. **测试导入**: 建议先用少量数据测试导入，确认无误后再进行大批量导入
4. **数据备份**: 导入前建议备份现有数据

### 5. 常见问题

**Q: 如何处理多颜色多尺码的商品？**  
A: 每个颜色+尺码组合创建一个变体记录（`record_type = Variant`），共享相同的 `parent_product_id`。

**Q: 价格档位如何设置？**  
A: 如果商品有多个价格档位，填写 `price_break_qty_1/2/3` 和对应的 `price_break_price_cad_1/2/3`。系统会根据订购数量自动选择合适的价格。

**Q: 图片URL可以是相对路径吗？**  
A: 建议使用完整的URL（包括协议和域名），相对路径需要根据系统配置确定是否支持。

**Q: 如何标记商品为停用？**  
A: 将 `status` 字段设置为 `inactive`。

---

## 📞 技术支持

如有问题，请联系技术团队或查看系统文档。

**文档版本**: 1.1  
**最后更新**: 2025-11-19 22:37:14

