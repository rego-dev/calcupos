-- CreateTable
CREATE TABLE "pos_setup_items" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_setup_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_setup_items_type_idx" ON "pos_setup_items"("type");
