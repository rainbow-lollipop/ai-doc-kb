-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Chunk_documentId_idx_key" ON "Chunk"("documentId", "idx");

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
