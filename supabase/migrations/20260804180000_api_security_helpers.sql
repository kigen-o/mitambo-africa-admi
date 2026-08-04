CREATE TABLE "LoginThrottle" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "DocumentCounter" (
  "key" TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "LoginThrottle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentCounter" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "LoginThrottle", "DocumentCounter" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "LoginThrottle",
  "DocumentCounter"
TO service_role;

CREATE OR REPLACE FUNCTION public.consume_login_attempt(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF p_key IS NULL OR p_key = '' OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid login throttle parameters';
  END IF;

  INSERT INTO "LoginThrottle" AS throttle ("key", "count", "resetAt")
  VALUES (
    p_key,
    1,
    CURRENT_TIMESTAMP + make_interval(secs => p_window_seconds)
  )
  ON CONFLICT ("key") DO UPDATE
  SET
    "count" = CASE
      WHEN throttle."resetAt" <= CURRENT_TIMESTAMP THEN 1
      ELSE throttle."count" + 1
    END,
    "resetAt" = CASE
      WHEN throttle."resetAt" <= CURRENT_TIMESTAMP
        THEN CURRENT_TIMESTAMP + make_interval(secs => p_window_seconds)
      ELSE throttle."resetAt"
    END
  RETURNING "count" INTO current_count;

  RETURN current_count <= p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_document_id(p_kind TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  document_date DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE;
  month_code TEXT;
  counter_key TEXT;
  next_value INTEGER;
  existing_max INTEGER;
  document_prefix TEXT;
BEGIN
  IF p_kind NOT IN ('invoice', 'quotation') THEN
    RAISE EXCEPTION 'Unsupported document kind';
  END IF;

  month_code := (ARRAY[
    'JA', 'FE', 'MR', 'AP', 'MY', 'JN',
    'JL', 'AU', 'SE', 'OC', 'NO', 'DE'
  ])[EXTRACT(MONTH FROM document_date)::INTEGER];
  counter_key := p_kind || ':' || document_date::TEXT;
  document_prefix := CASE WHEN p_kind = 'invoice' THEN 'I' ELSE 'Q' END;

  IF p_kind = 'invoice' THEN
    SELECT COALESCE(MAX(SUBSTRING("id" FROM '-([0-9]+)$')::INTEGER), 0)
    INTO existing_max
    FROM "Invoice"
    WHERE "createdAt" >= document_date
      AND "createdAt" < document_date + 1;
  ELSE
    SELECT COALESCE(MAX(SUBSTRING("id" FROM '-([0-9]+)$')::INTEGER), 0)
    INTO existing_max
    FROM "Quotation"
    WHERE "createdAt" >= document_date
      AND "createdAt" < document_date + 1;
  END IF;

  INSERT INTO "DocumentCounter" AS counter ("key", "value", "updatedAt")
  VALUES (counter_key, existing_max + 1, CURRENT_TIMESTAMP)
  ON CONFLICT ("key") DO UPDATE
  SET
    "value" = counter."value" + 1,
    "updatedAt" = CURRENT_TIMESTAMP
  RETURNING "value" INTO next_value;

  RETURN document_prefix
    || '-D'
    || TO_CHAR(document_date, 'YYYY')
    || month_code
    || TO_CHAR(document_date, 'DD')
    || '-'
    || LPAD(next_value::TEXT, 2, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.consume_login_attempt(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_document_id(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_login_attempt(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.next_document_id(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
