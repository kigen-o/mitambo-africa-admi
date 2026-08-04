# Mitambo Africa Admin

Next.js 15 admin application with same-origin API route handlers and a
Supabase PostgreSQL backend. Browser requests go to `/api`; Supabase secret
credentials are used only by the server route handlers.

## Local setup

```sh
npm ci
cp .env.example .env
npm run dev
```

The application runs at <http://localhost:8080>.

Required server environment variables:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SESSION_SECRET` (at least 32 random characters)
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`

The first successful login with the configured super-admin credentials creates
that account when it does not yet exist. Public signup is disabled unless both
`ALLOW_PUBLIC_SIGNUP` and `NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP` are explicitly set
to `true`.

## Database

Supabase migrations are in `supabase/migrations`. To link and update a project:

```sh
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --linked
```

The Data API remains closed to browser roles by RLS. The server's service role
has access only to the application's existing public tables.

To inspect the legacy SQLite record counts without making a remote connection:

```sh
npm run migrate:supabase-data
```

Applying the import requires `--apply`, an exact
`MIGRATION_DESTINATION_PROJECT_REF`, and the explicit confirmation value shown
by the script. Set `SQLITE_SOURCE_PATH` if the source file is elsewhere. The
importer refuses to overwrite existing business rows, preserves IDs and
relationships, converts dates, and hashes legacy plaintext passwords.

## Vercel deployment

Set the five required server variables above in the Vercel project for
Production and Preview, then deploy from the repository root. Do not add
`SUPABASE_SECRET_KEY`, database passwords, or personal access tokens to any
`NEXT_PUBLIC_*` variable.

Useful checks:

```sh
npm test
npx tsc --noEmit
npm run build
```
