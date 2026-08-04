ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_verificationToken_format_check"
CHECK ("verificationToken" ~ '^[0-9a-f]{32}$');
