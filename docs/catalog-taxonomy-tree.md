# 商品分类树状清单

**生成时间**: 2025/12/11 22:30:00
**数据来源**: 生产数据库（Neon PostgreSQL）
**状态**: ✅ 分类体系已创建，product_categories 表已创建，13个产品已映射到56个分类关系

## 分类口径与映射规则

1. **一级分类**: 参考 Custom Ink 左侧导航的主要分类
2. **二级分类**: 根据产品类型（T恤、卫衣、帽子等）细分
3. **产品计数**: 统计该分类下（含子类）的产品数量
4. **命名规范**: 使用英文，slug 为小写短横线格式

## 变更记录

- [2025-12-11 09:21:35] 初始分类体系建立，参考 Custom Ink

---

## 分类树

```
├─ Apparel (count: 55)
│  ├─ T-Shirts (count: 20)
│  │  ├─ Short Sleeve T-shirts (count: 8)
│  │  ├─ Long Sleeve T-shirts (count: 1)
│  │  ├─ Tank Tops (count: 0)
│  │  └─ Kids & Youth T-shirts (count: 0)
│  ├─ Sweatshirts (count: 10)
│  │  ├─ Kids Sweats (count: 2)
│  │  ├─ Hoodies (count: 2)
│  │  ├─ Crewneck Sweatshirts (count: 2)
│  │  ├─ Full Zip Sweatshirts (count: 0)
│  │  └─ Quarter Zip Sweatshirts (count: 0)
│  ├─ Women's (count: 2)
│  │  ├─ Women's T-shirts (count: 1)
│  │  ├─ Women's Sweatshirts (count: 0)
│  │  └─ Women's Tanks (count: 0)
│  ├─ Kids & Youth (count: 6)
│  │  ├─ Kids T-shirts (count: 3)
│  │  └─ Kids Sweatshirts (count: 0)
│  ├─ Performance (count: 0)
│  │  ├─ Performance T-shirts (count: 0)
│  │  └─ Performance Polos (count: 0)
│  ├─ Polos (count: 0)
│  ├─ Hats (count: 0)
│  │  ├─ Baseball Hats (count: 0)
│  │  ├─ Beanies (count: 0)
│  │  └─ Trucker Hats (count: 0)
│  └─ Accessories (count: 4)
│     ├─ Bags (count: 2)
│     └─ Drinkware (count: 0)
```

---

## 待补充分类

以下分类在数据库中无对应商品，标注为"待补充"：

- Baseball Hats
- Performance T-shirts
- Drinkware
- Women's Sweatshirts
- Kids Sweatshirts
- Performance Polos
- Beanies
- Full Zip Sweatshirts
- Tank Tops
- Trucker Hats
- Women's Tanks
- Quarter Zip Sweatshirts
- Kids & Youth T-shirts
- Polos

## 未分类产品

以下产品暂未明确归属分类，需要人工二次分类：

- 无
