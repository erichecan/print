/**
 * 静态检查服务端组件里是否引入客户端 API
 * [2025-01-30 23:00:00] Design Lab 4.0: RSC 边界检查
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const CLIENT_APIS = [
  'useRouter',
  'window.',
  'document.',
  'localStorage',
  'sessionStorage',
  'navigator.',
];

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  
  // 检查是否是服务端组件（无 'use client'）
  if (content.includes("'use client'") || content.includes('"use client"')) {
    return { hasError: false, errors: [] };
  }

  const errors = [];
  
  for (const api of CLIENT_APIS) {
    if (content.includes(api)) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes(api) && !line.trim().startsWith('//')) {
          errors.push({
            file: filePath,
            line: index + 1,
            api,
            content: line.trim(),
          });
        }
      });
    }
  }

  return {
    hasError: errors.length > 0,
    errors,
  };
}

function checkDirectory(dirPath) {
  const files = readdirSync(dirPath);
  const allErrors = [];

  for (const file of files) {
    const filePath = join(dirPath, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      const errors = checkDirectory(filePath);
      allErrors.push(...errors);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const result = checkFile(filePath);
      if (result.hasError) {
        allErrors.push(...result.errors);
      }
    }
  }

  return allErrors;
}

function main() {
  console.log('🔍 检查 RSC 边界...');

  const designLabDir = join(process.cwd(), 'apps/web/src/app/design-lab');
  const errors = checkDirectory(designLabDir);

  if (errors.length > 0) {
    console.error('❌ 发现 RSC 边界违规:');
    errors.forEach((error) => {
      console.error(`  ${error.file}:${error.line} - 使用了客户端 API: ${error.api}`);
      console.error(`    ${error.content}`);
    });
    process.exit(1);
  }

  console.log('✅ RSC 边界检查通过');
}

main();

