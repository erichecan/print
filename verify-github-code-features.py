#!/usr/bin/env python3
"""
验证 GitHub 代码是否包含重要功能更新
[2025-12-03 22:10:00] 通过检查代码文件确认功能是否存在
"""
import subprocess
import sys
import json
from datetime import datetime

def run_git_command(cmd):
    """执行 git 命令并返回结果"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True, 
            check=True,
            cwd='/Users/eric/Desktop/print-main'
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ Git 命令失败: {e}")
        return None

def check_feature_in_file(file_path, feature_keywords, commit='HEAD'):
    """检查文件中是否包含特定功能"""
    results = {
        'file': file_path,
        'commit': commit,
        'keywords_found': {},
        'all_found': False
    }
    
    # 获取文件内容
    cmd = f"git show {commit}:{file_path}"
    content = run_git_command(cmd)
    
    if content is None:
        results['error'] = "无法读取文件"
        return results
    
    # 检查每个关键词
    all_found = True
    for keyword in feature_keywords:
        count = content.count(keyword)
        found = count > 0
        results['keywords_found'][keyword] = {
            'found': found,
            'count': count
        }
        if not found:
            all_found = False
    
    results['all_found'] = all_found
    return results

def main():
    print("="*60)
    print("🔍 验证 GitHub 代码功能")
    print("="*60)
    
    # 检查当前分支和远程状态
    current_branch = run_git_command("git branch --show-current")
    remote_branch = run_git_command("git rev-parse --abbrev-ref --symbolic-full-name @{u}")
    head_commit = run_git_command("git rev-parse HEAD")
    remote_commit = run_git_command(f"git rev-parse {remote_branch}")
    
    print(f"\n当前分支: {current_branch}")
    print(f"远程分支: {remote_branch}")
    print(f"本地 HEAD: {head_commit[:8]}")
    print(f"远程 HEAD: {remote_commit[:8]}")
    
    # 检查本地和远程是否一致
    if head_commit == remote_commit:
        print("✅ 本地和远程代码一致")
    else:
        print("⚠️  本地和远程代码不一致")
        ahead = run_git_command(f"git rev-list --count {remote_commit}..{head_commit}")
        behind = run_git_command(f"git rev-list --count {head_commit}..{remote_commit}")
        print(f"   本地领先 {ahead} 个提交")
        print(f"   本地落后 {behind} 个提交")
    
    print("\n" + "="*60)
    print("检查功能 1: 商品列表页颜色悬停切换")
    print("="*60)
    
    # 检查商品列表页功能
    products_features = [
        'hoveredColors',
        'setHoveredColors',
        'hoveredColor',
        'onMouseEnter',
        'onMouseLeave',
        'imageUrl'
    ]
    
    products_result = check_feature_in_file(
        'apps/web/src/app/products/ProductsClient.tsx',
        products_features,
        'HEAD'
    )
    
    print(f"\n文件: {products_result['file']}")
    print(f"Commit: {products_result['commit']}")
    print("\n关键词检查:")
    for keyword, info in products_result['keywords_found'].items():
        status = "✅" if info['found'] else "❌"
        print(f"  {status} {keyword}: {info['count']} 次")
    
    if products_result['all_found']:
        print("\n✅ 所有关键词都找到了！功能代码存在。")
    else:
        print("\n❌ 部分关键词未找到，功能可能不完整。")
    
    print("\n" + "="*60)
    print("检查功能 2: Design Lab Edit Art 面板")
    print("="*60)
    
    # 检查 Design Lab 功能
    design_lab_features = [
        'Edit Art',
        'isArt',
        'Art Size',
        'selectedImageObject.isArt',
        'Names & Numbers',
        'showNamesListModal'
    ]
    
    design_lab_result = check_feature_in_file(
        'apps/web/src/app/design-lab/DesignLabClient.tsx',
        design_lab_features,
        'HEAD'
    )
    
    print(f"\n文件: {design_lab_result['file']}")
    print(f"Commit: {design_lab_result['commit']}")
    print("\n关键词检查:")
    for keyword, info in design_lab_result['keywords_found'].items():
        status = "✅" if info['found'] else "❌"
        print(f"  {status} {keyword}: {info['count']} 次")
    
    if design_lab_result['all_found']:
        print("\n✅ 所有关键词都找到了！功能代码存在。")
    else:
        print("\n⚠️  部分关键词未找到（可能是变量名不同）。")
    
    # 检查关键提交
    print("\n" + "="*60)
    print("检查关键提交")
    print("="*60)
    
    key_commits = {
        'c70846a': '商品颜色修复与图片切换功能',
        '0f65023': '执行 Custom Ink Plan：完善 Design Lab 功能'
    }
    
    for commit_hash, description in key_commits.items():
        commit_info = run_git_command(f"git log --oneline -1 {commit_hash}")
        if commit_info:
            print(f"✅ {commit_hash[:8]}: {description}")
            print(f"   {commit_info}")
        else:
            print(f"❌ {commit_hash[:8]}: 提交未找到")
    
    # 检查这些提交是否在远程
    print("\n检查提交是否在远程分支:")
    for commit_hash in key_commits.keys():
        result = run_git_command(f"git branch -r --contains {commit_hash}")
        if result:
            print(f"✅ {commit_hash[:8]} 在远程分支中")
        else:
            print(f"❌ {commit_hash[:8]} 不在远程分支中")
    
    # 生成报告
    report = {
        'verification_time': datetime.now().isoformat(),
        'local_commit': head_commit,
        'remote_commit': remote_commit,
        'is_synced': head_commit == remote_commit,
        'products_page': products_result,
        'design_lab': design_lab_result,
        'key_commits': {}
    }
    
    for commit_hash, description in key_commits.items():
        commit_info = run_git_command(f"git log --oneline -1 {commit_hash}")
        in_remote = bool(run_git_command(f"git branch -r --contains {commit_hash}"))
        report['key_commits'][commit_hash] = {
            'description': description,
            'exists': bool(commit_info),
            'in_remote': in_remote,
            'info': commit_info
        }
    
    report_path = 'test-results/github-code-verification.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 验证报告已保存: {report_path}")
    
    # 总结
    print("\n" + "="*60)
    print("📊 验证总结")
    print("="*60)
    
    products_ok = products_result.get('all_found', False)
    design_lab_ok = design_lab_result.get('all_found', False)
    synced = head_commit == remote_commit
    
    print(f"本地和远程同步: {'✅' if synced else '❌'}")
    print(f"商品列表页功能: {'✅' if products_ok else '❌'}")
    print(f"Design Lab 功能: {'✅' if design_lab_ok else '⚠️'}")
    
    if products_ok and synced:
        print("\n✅ GitHub 代码包含商品列表页颜色悬停功能")
    else:
        print("\n❌ GitHub 代码可能不包含完整功能")
    
    if design_lab_ok and synced:
        print("✅ GitHub 代码包含 Design Lab Edit Art 功能")
    else:
        print("⚠️  GitHub 代码可能不包含完整 Design Lab 功能")
    
    print("="*60)
    
    return 0 if (products_ok and synced) else 1

if __name__ == '__main__':
    sys.exit(main())

