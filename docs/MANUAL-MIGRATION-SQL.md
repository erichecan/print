# 手动运行留言本迁移 SQL

**时间**: 2025-12-10 00:50:00

如果自动迁移失败，可以通过 GCP Console 手动运行以下 SQL：

---

## 运行步骤

1. 访问 GCP Console: https://console.cloud.google.com/sql/instances
2. 选择数据库实例（print-main-db 或对应的 Neon 数据库）
3. 点击 "Databases" 标签
4. 选择数据库（neondb）
5. 点击 "SQL Editor" 或 "Query"
6. 运行以下 SQL：

---

## SQL 脚本

```sql
-- [2025-12-10 00:00:00] 创建留言本表
-- 步骤 1: 创建枚举类型
CREATE TYPE "GuestMessageStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- 步骤 2: 创建表
CREATE TABLE IF NOT EXISTS "guest_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "order_number" TEXT,
    "status" "GuestMessageStatus" NOT NULL DEFAULT 'UNREAD',
    "read_at" TIMESTAMP(3),
    "read_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guest_messages_pkey" PRIMARY KEY ("id")
);

-- 步骤 3: 创建索引
CREATE INDEX IF NOT EXISTS "guest_messages_status_idx" ON "guest_messages"("status");
CREATE INDEX IF NOT EXISTS "guest_messages_created_at_idx" ON "guest_messages"("created_at");
CREATE INDEX IF NOT EXISTS "guest_messages_read_by_idx" ON "guest_messages"("read_by");

-- 步骤 4: 创建外键（如果 users 表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'guest_messages_read_by_fkey'
        ) THEN
            ALTER TABLE "guest_messages" 
            ADD CONSTRAINT "guest_messages_read_by_fkey" 
            FOREIGN KEY ("read_by") REFERENCES "users"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- 步骤 5: 验证表是否创建成功
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'guest_messages' 
ORDER BY ordinal_position;
```

---

## 验证

运行以下 SQL 验证表是否创建成功：

```sql
-- 检查表是否存在
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'guest_messages'
);

-- 检查列
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'guest_messages' 
ORDER BY ordinal_position;

-- 检查索引
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'guest_messages';

-- 检查外键
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'guest_messages';
```

---

## 注意事项

1. **外键类型**: `read_by` 字段使用 TEXT 类型，匹配 `users.id` 的类型
2. **枚举类型**: 如果 `GuestMessageStatus` 已存在，CREATE TYPE 会失败，可以忽略
3. **表已存在**: 如果表已存在，CREATE TABLE IF NOT EXISTS 不会报错
4. **索引已存在**: CREATE INDEX IF NOT EXISTS 确保索引不会重复创建

---

## 时间戳

- **创建时间**: 2025-12-10 00:50:00

