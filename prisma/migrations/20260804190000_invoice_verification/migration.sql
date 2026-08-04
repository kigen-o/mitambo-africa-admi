ALTER TABLE "Invoice"
ADD COLUMN "verificationToken" TEXT,
ADD COLUMN "paymentDetails" TEXT;

UPDATE "Invoice"
SET "verificationToken" = replace(gen_random_uuid()::text, '-', '')
WHERE "verificationToken" IS NULL;

UPDATE "Invoice"
SET "paymentDetails" = (
  SELECT "paymentDetails"
  FROM "Settings"
  WHERE "paymentDetails" IS NOT NULL
  ORDER BY "updatedAt" DESC
  LIMIT 1
)
WHERE "paymentDetails" IS NULL;

ALTER TABLE "Invoice"
ALTER COLUMN "verificationToken" SET DEFAULT replace(gen_random_uuid()::text, '-', ''),
ALTER COLUMN "verificationToken" SET NOT NULL;

CREATE UNIQUE INDEX "Invoice_verificationToken_key"
ON "Invoice"("verificationToken");
