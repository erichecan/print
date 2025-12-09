/**
 * Serialization Utilities
 * [2025-12-09 14:45:00] 序列化守卫工具，确保传递给客户端的数据是可序列化的
 * 
 * 用途：
 * - 在 Server Components 传递数据到 Client Components 前验证
 * - 防止不可序列化对象（函数、类实例、Symbol、BigInt、Date）导致 RSC 错误
 */

export class SerializationError extends Error {
  path?: string;
  value?: unknown;

  constructor(message: string, path?: string, value?: unknown) {
    super(message);
    this.name = 'SerializationError';
    this.path = path;
    this.value = value;
  }
}

/**
 * 检查值是否可序列化
 */
function isSerializable(value: unknown, path = '', visited = new WeakSet()): { valid: boolean; error?: string; path?: string } {
  // 基本类型都可以序列化
  if (value === null || value === undefined) {
    return { valid: true };
  }

  const type = typeof value;

  if (type === 'string' || type === 'number' || type === 'boolean') {
    return { valid: true };
  }

  // 函数不可序列化
  if (type === 'function') {
    return { valid: false, error: 'Function is not serializable', path };
  }

  // Symbol 不可序列化
  if (type === 'symbol') {
    return { valid: false, error: 'Symbol is not serializable', path };
  }

  // BigInt 不可序列化（需要特殊处理）
  if (type === 'bigint') {
    return { valid: false, error: 'BigInt is not serializable', path };
  }

  // Date 对象需要转换为字符串
  if (value instanceof Date) {
    return { valid: false, error: 'Date object should be converted to ISO string', path };
  }

  // 数组
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const result = isSerializable(value[i], `${path}[${i}]`, visited);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }

  // 对象
  if (type === 'object') {
    // 检查循环引用
    if (visited.has(value as object)) {
      return { valid: false, error: 'Circular reference detected', path };
    }

    visited.add(value as object);

    try {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const result = isSerializable((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key, visited);
          if (!result.valid) {
            return result;
          }
        }
      }
    } finally {
      visited.delete(value as object);
    }

    return { valid: true };
  }

  return { valid: false, error: `Unknown type: ${type}`, path };
}

/**
 * 确保数据可序列化
 * 
 * @deprecated 使用 cleanForSerialization 替代，它会主动清理数据而不是只检查
 * @param data - 要检查的数据
 * @param options - 选项
 * @throws {SerializationError} 如果数据不可序列化
 */
export function ensureSerializable(
  data: unknown,
  options: {
    throwOnError?: boolean;
    convertDates?: boolean;
  } = {}
): void {
  const { throwOnError = true, convertDates = false } = options;

  const result = isSerializable(data);

  if (!result.valid) {
    const error = new SerializationError(
      `Non-serializable data detected: ${result.error} at path: ${result.path}`,
      result.path,
      data
    );

    if (throwOnError) {
      throw error;
    } else {
      console.warn('[Serialize]', error.message);
    }
  }
}

/**
 * 清理数据，确保可序列化
 * - 将 Date 转换为 ISO 字符串
 * - 移除函数
 * - 转换 BigInt 为字符串
 * - 将 Map 转换为对象
 * - 将 Set 转换为数组
 * - 处理类实例（提取可枚举属性）
 * 
 * @param data - 要清理的数据
 * @param visited - 用于检测循环引用的 WeakSet
 * @returns 清理后的数据
 */
export function cleanForSerialization<T>(data: T, visited: WeakSet<object> = new WeakSet()): T {
  if (data === null || data === undefined) {
    return data;
  }

  const type = typeof data;

  // 基本类型直接返回
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return data;
  }

  // Date 转换为 ISO 字符串
  if (data instanceof Date) {
    return data.toISOString() as unknown as T;
  }

  // Map 转换为对象
  if (data instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of data.entries()) {
      const keyStr = typeof key === 'string' ? key : String(key);
      obj[keyStr] = cleanForSerialization(value, visited);
    }
    return obj as unknown as T;
  }

  // Set 转换为数组
  if (data instanceof Set) {
    return Array.from(data).map(item => cleanForSerialization(item, visited)) as unknown as T;
  }

  // 数组递归处理
  if (Array.isArray(data)) {
    return data.map(item => cleanForSerialization(item, visited)) as unknown as T;
  }

  // 对象递归处理
  if (type === 'object') {
    // 检查循环引用
    if (visited.has(data as object)) {
      // 遇到循环引用，返回占位符对象
      return { __circular: true } as unknown as T;
    }

    visited.add(data as object);

    try {
      const cleaned: Record<string, unknown> = {};
      
      // 处理普通对象和类实例
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = (data as Record<string, unknown>)[key];
          
          // 跳过函数
          if (typeof value === 'function') {
            continue;
          }

          // 跳过 Symbol
          if (typeof value === 'symbol') {
            continue;
          }

          // 转换 BigInt
          if (typeof value === 'bigint') {
            cleaned[key] = value.toString();
            continue;
          }

          cleaned[key] = cleanForSerialization(value, visited);
        }
      }

      // 对于类实例，如果原型链上有可枚举属性，也尝试提取（但跳过方法）
      const proto = Object.getPrototypeOf(data);
      if (proto && proto !== Object.prototype) {
        // 检查是否是类实例（有构造函数且不是普通对象）
        const isClassInstance = proto.constructor && proto.constructor !== Object;
        if (isClassInstance) {
          // 只提取可枚举的非函数属性
          for (const key in proto) {
            if (Object.prototype.hasOwnProperty.call(proto, key) && !(key in cleaned)) {
              const value = (proto as Record<string, unknown>)[key];
              if (typeof value !== 'function' && typeof value !== 'symbol') {
                try {
                  cleaned[key] = cleanForSerialization(value, visited);
                } catch {
                  // 忽略无法序列化的属性
                }
              }
            }
          }
        }
      }

      return cleaned as T;
    } finally {
      visited.delete(data as object);
    }
  }

  return data;
}

/**
 * 安全序列化（带清理）
 * 
 * @param data - 要序列化的数据
 * @returns JSON 字符串
 */
export function safeStringify(data: unknown): string {
  const cleaned = cleanForSerialization(data);
  return JSON.stringify(cleaned);
}

