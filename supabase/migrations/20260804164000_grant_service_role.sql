-- Keep browser roles locked behind RLS while allowing the server-side
-- Supabase secret/service-role client to access the application schema.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "User",
  "Profile",
  "Client",
  "Communication",
  "Invoice",
  "Product",
  "Quotation",
  "Project",
  "Settings",
  "Task",
  "File",
  "Expense"
TO service_role;

NOTIFY pgrst, 'reload schema';
