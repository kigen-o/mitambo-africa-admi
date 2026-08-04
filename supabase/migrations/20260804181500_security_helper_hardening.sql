CREATE INDEX "LoginThrottle_resetAt_idx" ON "LoginThrottle" ("resetAt");

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

  -- The indexed cleanup keeps random-email probes from growing this
  -- operational table indefinitely.
  DELETE FROM "LoginThrottle" WHERE "resetAt" <= CURRENT_TIMESTAMP;

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
    || LPAD(
      next_value::TEXT,
      GREATEST(2, LENGTH(next_value::TEXT)),
      '0'
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
