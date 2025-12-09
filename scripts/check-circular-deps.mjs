#!/usr/bin/env node
/**
 * Circular Dependency Detection Script
 * [2025-12-09 14:45:00] 检测项目中的循环依赖
 * 
 * 使用方法:
 *   node scripts/check-circular-deps.mjs
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// 支持的扩展名
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

// 忽略的目录
const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build', '.git'];

/**
 * 提取文件中的导入语句
 */
function extractImports(filePath, content) {
  const imports = [];
  
  // 匹配 import 语句
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // 跳过 node_modules 和外部包
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      imports.push(importPath);
    }
  }
  
  return imports;
}

/**
 * 解析导入路径为绝对路径
 */
function resolveImportPath(importPath, fromFile) {
  const fromDir = dirname(fromFile);
  
  // 相对路径
  if (importPath.startsWith('.')) {
    let resolved = resolve(fromDir, importPath);
    
    // 尝试添加扩展名
    if (!EXTENSIONS.some(ext => resolved.endsWith(ext))) {
      for (const ext of EXTENSIONS) {
        const withExt = resolved + ext;
        if (statSync(withExt).isFile()) {
          return withExt;
        }
      }
      
      // 尝试 index 文件
      for (const ext of EXTENSIONS) {
        const indexFile = join(resolved, `index${ext}`);
        if (statSync(indexFile).isFile()) {
          return indexFile;
        }
      }
    }
    
    return resolved;
  }
  
  // 绝对路径（从项目根）
  if (importPath.startsWith('/')) {
    return resolve(projectRoot, importPath.substring(1));
  }
  
  return null;
}

/**
 * 递归收集所有文件
 */
function collectFiles(dir, files = []) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry)) {
      continue;
    }
    
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (stat.isFile() && EXTENSIONS.some(ext => entry.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 构建依赖图
 */
function buildDependencyGraph(files) {
  const graph = new Map();
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const imports = extractImports(file, content);
      
      const dependencies = [];
      for (const importPath of imports) {
        const resolved = resolveImportPath(importPath, file);
        if (resolved && files.includes(resolved)) {
          dependencies.push(resolved);
        }
      }
      
      graph.set(file, dependencies);
    } catch (error) {
      console.warn(`Warning: Failed to process ${file}:`, error.message);
    }
  }
  
  return graph;
}

/**
 * 检测循环依赖（DFS）
 */
function detectCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const recStack = new Set();
  const path = [];
  
  function dfs(node) {
    visited.add(node);
    recStack.add(node);
    path.push(node);
    
    const dependencies = graph.get(node) || [];
    for (const dep of dependencies) {
      if (!visited.has(dep)) {
        dfs(dep);
      } else if (recStack.has(dep)) {
        // 找到循环
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart).concat(dep);
        cycles.push(cycle);
      }
    }
    
    recStack.delete(node);
    path.pop();
  }
  
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }
  
  return cycles;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 Checking for circular dependencies...\n');
  
  const srcDir = join(projectRoot, 'apps/web/src');
  const files = collectFiles(srcDir);
  
  console.log(`Found ${files.length} files to check\n`);
  
  const graph = buildDependencyGraph(files);
  const cycles = detectCycles(graph);
  
  if (cycles.length === 0) {
    console.log('✅ No circular dependencies found!\n');
    process.exit(0);
  }
  
  console.error(`❌ Found ${cycles.length} circular dependency(ies):\n`);
  
  for (let i = 0; i < cycles.length; i++) {
    const cycle = cycles[i];
    console.error(`Cycle ${i + 1}:`);
    for (let j = 0; j < cycle.length; j++) {
      const file = cycle[j];
      const relPath = relative(projectRoot, file);
      const arrow = j < cycle.length - 1 ? ' → ' : ' → (back to start)';
      console.error(`  ${relPath}${arrow}`);
    }
    console.error('');
  }
  
  process.exit(1);
}

main();

