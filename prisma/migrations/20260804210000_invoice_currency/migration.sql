ALTER TABLE "Invoice"
ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'KES';

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_currency_supported_check"
CHECK ("currency" IN ('KES', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'TZS', 'UGX', 'RWF'));
