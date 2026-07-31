-- 新增订单类别字段：区分"烫印服装"与"DTF打印film"
ALTER TABLE "offline_orders" ADD COLUMN "order_category" TEXT;
