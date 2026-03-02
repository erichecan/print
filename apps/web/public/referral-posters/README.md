# Referral 活动海报资源

三款平台活动海报用于宣传「邀请好友 · 一起赚」整体活动，页面中的「社交平台海报」区域会直接使用本目录下的 PNG。

## 自动生成（推荐）

无需 Pencil 或手动导出，在项目根或 `apps/web` 下执行：

```bash
cd apps/web && node scripts/generate-referral-posters.mjs
```

会生成并覆盖本目录的 `ins.png`、`fb.png`、`xiaohongshu.png`。

## 文件说明

- `ins.png` — Instagram 海报 (1080×1080)
- `fb.png` — Facebook 海报 (1200×630)
- `xiaohongshu.png` — 小红书海报 (1080×1440)

若文件不存在或加载失败，活动页会显示占位文案。
