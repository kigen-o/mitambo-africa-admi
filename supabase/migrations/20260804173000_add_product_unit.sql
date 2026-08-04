ALTER TABLE "Product"
ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'per project';

NOTIFY pgrst, 'reload schema';
