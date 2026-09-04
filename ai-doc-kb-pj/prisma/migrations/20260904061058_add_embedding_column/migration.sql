-- 启用 pgvector 扩展（pgvector/pgvector 镜像自带，IF NOT EXISTS 保证幂等）
CREATE EXTENSION IF NOT EXISTS vector;

-- 1536 对应 text-embedding-3-small; 换模型必须同步改这里（另开迁移）
ALTER TABLE "Chunk" ADD COLUMN "embedding" vector(1536);