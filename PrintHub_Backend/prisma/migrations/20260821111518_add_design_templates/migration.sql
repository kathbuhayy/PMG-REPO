-- CreateTable
CREATE TABLE "DesignTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "zone_layers" JSONB NOT NULL,
    "base_color" TEXT,
    "created_by" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignTemplate_category_idx" ON "DesignTemplate"("category");

-- CreateIndex
CREATE INDEX "DesignTemplate_active_idx" ON "DesignTemplate"("active");
