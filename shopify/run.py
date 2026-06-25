#!/usr/bin/env python3
"""
PrintNGo 产品导入 Pipeline — 统一入口脚本

Usage:
  python run.py scrape --url <customink-url>    # Step 1: 抓取竞品参考图
  python run.py scrape                           # Step 1: 批量读 customink_urls.csv
  python run.py generate                         # Step 2A: OpenAI gpt-image-2 生成
  python run.py generate-codex                   # Step 2B: Codex CLI 生成（tote bags）
  python run.py upload                           # Step 4: 上传到 Shopify CDN
  python run.py seed <script>                    # Step 5: 数据库入库
  python run.py all --url <customink-url>        # 全流程 Steps 1→2A→4（不含 seed）
  python run.py all                              # 全流程，批量读 CSV

完整流程（含 seed）示例：
  python run.py all --url https://www.customink.com/products/bags/tote-bags/.../2435100
  node scripts/seed-tote-bags-online.js
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def _check_venv() -> None:
    """如果关键依赖无法导入，提示用户激活虚拟环境。"""
    try:
        import requests  # noqa: F401
    except ImportError:
        print(
            "⚠  无法导入 requests。请先激活虚拟环境：\n"
            "   source shopify/.venv/bin/activate\n"
            "   pip install -r shopify/requirements.txt",
            file=sys.stderr,
        )
        sys.exit(1)


def _run(cmd: list[str], step: str) -> int:
    """运行子命令，实时输出，返回退出码。"""
    print(f"\n{'─' * 60}")
    print(f"  {step}")
    print(f"  $ {' '.join(cmd)}")
    print(f"{'─' * 60}\n")
    result = subprocess.run(cmd, cwd=ROOT)
    return result.returncode


# ── 各 Step 的执行函数 ──────────────────────────────────────────────────────────

def cmd_scrape(args: argparse.Namespace) -> int:
    _check_venv()
    command = [sys.executable, "app/batch_customink.py"]
    if args.url:
        command += ["--url", args.url]
    if getattr(args, "force", False):
        command.append("--force")
    return _run(command, "Step 1/4: 抓取竞品参考图 → data/originals/ + products.db")


def cmd_generate(args: argparse.Namespace) -> int:
    _check_venv()
    command = [sys.executable, "app/pipeline.py"]
    if getattr(args, "force", False):
        command.append("--force")
    if getattr(args, "quality", None):
        command += ["--quality", args.quality]
    return _run(command, "Step 2A/4: OpenAI gpt-image-2 生成 → data/generated/")


def cmd_generate_codex(args: argparse.Namespace) -> int:
    _check_venv()
    command = [sys.executable, "generate_bags_codex.py"]
    if getattr(args, "force", False):
        command.append("--force")
    if getattr(args, "dry_run", False):
        command.append("--dry-run")
    return _run(command, "Step 2B/4: Codex CLI 生成（tote bags）→ data/generated/")


def cmd_upload(args: argparse.Namespace) -> int:
    _check_venv()
    command = [sys.executable, "app/upload_to_shopify.py"]
    if getattr(args, "force", False):
        command.append("--force")
    return _run(command, "Step 4/4: 上传 Shopify CDN → shopify_upload_manifest.json")


def cmd_seed(args: argparse.Namespace) -> int:
    script = args.script
    # 支持相对路径（相对于 repo 根目录）和绝对路径
    script_path = Path(script)
    if not script_path.is_absolute():
        script_path = ROOT.parent / script_path
    if not script_path.exists():
        print(f"✗ seed 脚本不存在: {script_path}", file=sys.stderr)
        return 1
    command = ["node", str(script_path)]
    return _run(command, f"Step 5: 数据库入库 → {script_path.name}")


def cmd_all(args: argparse.Namespace) -> int:
    """全流程：scrape → generate → upload（不含 seed，需手动运行 Node.js 脚本）"""
    steps = [
        ("Step 1/3: 抓取竞品参考图", cmd_scrape),
        ("Step 2/3: OpenAI gpt-image-2 生成", cmd_generate),
        ("Step 3/3: 上传 Shopify CDN", cmd_upload),
    ]

    print("\n" + "═" * 60)
    print("  PrintNGo 产品导入 Pipeline — 全流程模式")
    if getattr(args, "url", None):
        print(f"  URL: {args.url}")
    print("═" * 60)

    results: list[tuple[str, int]] = []

    for label, fn in steps:
        print(f"\n▶  {label}")
        rc = fn(args)
        results.append((label, rc))
        if rc != 0:
            print(f"\n✗ {label} 失败（exit code {rc}），中断流程。")
            break

    # 汇总
    print("\n" + "═" * 60)
    print("  执行摘要")
    print("═" * 60)
    ok_count = 0
    for label, rc in results:
        status = "✓" if rc == 0 else "✗"
        print(f"  {status}  {label}")
        if rc == 0:
            ok_count += 1
    print()

    if ok_count == len(steps):
        print("  全部完成。")
        print()
        print("  下一步：运行 seed 脚本将产品写入数据库")
        print("    node scripts/seed-tote-bags-online.js    # tote bags")
        print("    node scripts/seed-mugs-online.js         # mugs")
        return 0
    else:
        print(f"  {ok_count}/{len(steps)} 步完成，请检查上方错误。")
        return 1


# ── Argument parser ─────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="run.py",
        description="PrintNGo 产品导入 Pipeline 统一入口",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  python run.py scrape --url https://www.customink.com/products/.../2435100
  python run.py generate
  python run.py generate-codex --dry-run
  python run.py upload
  python run.py seed scripts/seed-tote-bags-online.js
  python run.py all --url https://www.customink.com/products/.../2435100
        """,
    )

    subparsers = parser.add_subparsers(dest="command", metavar="<command>")
    subparsers.required = True

    # ── scrape ──
    p_scrape = subparsers.add_parser(
        "scrape",
        help="Step 1: 抓取竞品参考图（CustomInk → data/originals/）",
    )
    p_scrape.add_argument("--url", help="单个 CustomInk 产品 URL（不传则读 customink_urls.csv）")
    p_scrape.add_argument("--force", action="store_true", help="强制重新下载已存在的图片")

    # ── generate ──
    p_gen = subparsers.add_parser(
        "generate",
        help="Step 2A: OpenAI gpt-image-2 生成（标准路线）",
    )
    p_gen.add_argument("--force", action="store_true", help="强制重新生成已存在的文件")
    p_gen.add_argument(
        "--quality",
        choices=["low", "medium", "high", "auto"],
        help="覆盖 OPENAI_IMAGE_QUALITY（默认 medium）",
    )

    # ── generate-codex ──
    p_codex = subparsers.add_parser(
        "generate-codex",
        help="Step 2B: Codex CLI 生成（精品路线，当前仅 tote bags）",
    )
    p_codex.add_argument("--force", action="store_true", help="强制覆盖重新生成")
    p_codex.add_argument("--dry-run", action="store_true", dest="dry_run", help="预览 prompts，不实际生成")

    # ── upload ──
    p_upload = subparsers.add_parser(
        "upload",
        help="Step 4: 上传 data/generated/ 到 Shopify CDN",
    )
    p_upload.add_argument("--force", action="store_true", help="强制重新上传已在 manifest 中的文件")

    # ── seed ──
    p_seed = subparsers.add_parser(
        "seed",
        help="Step 5: 运行 Node.js seed 脚本将产品写入 PostgreSQL",
    )
    p_seed.add_argument(
        "script",
        help="seed 脚本路径（相对于 repo 根目录，如 scripts/seed-tote-bags-online.js）",
    )

    # ── all ──
    p_all = subparsers.add_parser(
        "all",
        help="全流程：scrape → generate → upload（Steps 1→2A→4，不含 seed）",
    )
    p_all.add_argument("--url", help="单个 CustomInk 产品 URL（不传则读 customink_urls.csv）")
    p_all.add_argument("--force", action="store_true", help="各步骤均强制重新执行")
    p_all.add_argument(
        "--quality",
        choices=["low", "medium", "high", "auto"],
        help="生成质量（传给 pipeline.py）",
    )

    return parser


# ── Main ─────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    dispatch = {
        "scrape":          cmd_scrape,
        "generate":        cmd_generate,
        "generate-codex":  cmd_generate_codex,
        "upload":          cmd_upload,
        "seed":            cmd_seed,
        "all":             cmd_all,
    }

    fn = dispatch.get(args.command)
    if fn is None:
        parser.print_help()
        sys.exit(1)

    rc = fn(args)
    sys.exit(rc)


if __name__ == "__main__":
    main()
