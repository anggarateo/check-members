# Member Check

A web app to check whether a person is registered as a member.
Stack: **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 + PostgreSQL**.
The web pages are in Indonesian; code, comments, and docs are in English.

## Flow

1. An admin creates a token, then shares the link `https://domain/access/<token>`.
2. The user opens the link. The server checks the token, saves it in an `httpOnly` cookie,
   then redirects to `/` (so the token does not stay in the address bar).
3. The user types a name and presses **Cari** (Search).
4. Result:
   - exactly one match: shows **name + TERDAFTAR** (registered)
   - more than one match: **"Masukkan nama yang lebih spesifik"** (enter a more specific name)
   - no match: "Nama tidak ditemukan" (name not found)

## Why Next.js, not Nuxt

Both are good for fullstack TypeScript. Next.js was chosen for this project because:

- **Bigger ecosystem and job market.** If the goal is to learn fullstack, there are many more lessons, libraries, and examples for Next.js/React.
- **First-class TypeScript.** `create-next-app --ts` is strict from the start, and the React/Next types are mature.
- **Route Handlers + Server Components** make the server/client split clear. The DB module uses `import "server-only"`, so the build fails if DB code accidentally reaches the browser.
- **Easy deploy** to Vercel, a VPS (`next start`), or Docker (`output: "standalone"`).

Nuxt is better in DX (auto-import, short Nitro server routes, `useFetch`) and Vue is easier to learn.
If you prefer Vue, the architecture below can move 1:1: `src/lib/*` barely changes,
`app/api/check/route.ts` becomes `server/api/check.post.ts`, and the page becomes `pages/index.vue`.

## Running

Requirements: Node.js 20+ and PostgreSQL 14+ (or Docker).

```bash
npm install
cp .env.example .env.local        # adjust DATABASE_URL
docker compose up -d              # optional, if you do not have PostgreSQL

npm run db:migrate                # create tables + pg_trgm extension
npm run sample-excel              # optional: create data/sample-members.xlsx
npm run import -- data/sample-members.xlsx
npm run token -- create "WA Group Batch 2020" --days 30   # prints the access link
npm run dev
```

Open the link printed by `token create`.

### Neon (serverless Postgres)

- Put both URLs from the Neon dashboard in `.env.local`: `DATABASE_URL` (pooled, host has `-pooler`) and `DATABASE_URL_UNPOOLED`.
- The app uses the pooled URL. The scripts (`db:migrate`, `import`, `token`) use the unpooled URL when it is set.
- The pool is small with short idle time, and the connection timeout is long enough for Neon to wake up from a cold start.

> `pg_trgm` is a *trusted extension* since PostgreSQL 13, so the database owner can create it.
> On some managed services, enable it in the dashboard first if the migration fails.

### Import from Excel

```bash
npm run import -- data/members.xlsx                         # header column "Name" is found automatically
npm run import -- data/members.xlsx --sheet "Sheet1" --column "Full Name"
npm run import -- data/members.xlsx --replace               # members not in the file are deleted
```

- The first row is the header. Empty and duplicate rows are skipped and reported.
- The import is an *upsert* in one transaction, so it is safe to run again every time the Excel file changes.
- Real Excel files in `data/` are in `.gitignore`. Do not commit member data to the repo.

### Access tokens

```bash
npm run token -- create "Committee" --days 30   # without --days = never expires
npm run token -- list                            # status & last used time
npm run token -- revoke 3                        # links with token #3 stop working at once
```

A token is shown only once. The database only stores its SHA-256 hash.

## Structure

```
db/schema.sql              tables members & access_tokens, trigram index
scripts/                   migrate, import-excel, token, sample-excel (run with tsx)
src/lib/normalize.ts       name normalization (used by import and search, one source of rules)
src/lib/search.ts          search logic: 1 / >1 / 0 results
src/lib/access.ts          token check
src/lib/rate-limit.ts      in-memory rate limiter
src/lib/validation.ts      input schema (zod)
src/app/access/[token]/    turns the token in the link into a cookie
src/app/api/check/route.ts POST endpoint for search
src/app/page.tsx           main page (server component)
src/app/check-form.tsx     form & result view (client component)
```

## Best practices used

### 1. Never leak the member list
- The API **never returns a list**. The query uses `LIMIT 2`: enough to know "one" or "more than one".
  The response for the >1 case has no names at all.
- At least 3 letters per search, plus a rate limit, so nobody can guess the whole list with `a`, `b`, `c`...
- Generic error messages. Error details only go to the server log.
- `noindex` (meta, `X-Robots-Tag` header, `robots.txt`) so the page does not appear in Google.

### 2. Token access
- Random 256-bit token (`crypto.randomBytes`), stored as a **hash**, can have an expiry date and can be **revoked**.
- The token from the URL is moved into an `httpOnly; SameSite=Lax; Secure` cookie (Secure in production) and then redirected,
  so it is not kept in the browser history or visible in screenshots.
- `Referrer-Policy: no-referrer` so the token does not leak through the Referer header.
- One token per group/channel (for example one per WA group). If one leaks, revoke only that token.

### 3. Input validation
- Validation on the server with **zod** (`src/lib/validation.ts`); the HTML validation in the form is only for convenience.
- Input length limit (100 characters); a broken JSON body is rejected with 400.
- All queries are **parameterized** (`$1`); no SQL string is built from input.
- The wildcard characters `%` and `_` are escaped, so users cannot use their own LIKE patterns.

### 4. Rate limiting
- Per IP (default 20/minute, set with `RATE_LIMIT_PER_MINUTE`) and per token (10x the IP limit).
- Returns **429** with a `Retry-After` header.
- The limiter is **in-memory** for now: enough for one `next start` process. If you deploy on serverless (Vercel)
  or many instances, switch to Redis (for example `@upstash/ratelimit`) because memory is not shared.
- The IP is read from `X-Forwarded-For`. Make sure the app is behind a reverse proxy (Nginx, Caddy, Vercel)
  that sets this header, otherwise the header can be faked.

### 5. Search & index
- Names are normalized (lowercase, no punctuation/accents, tidy spaces) into the `search_name` column
  with a `UNIQUE` constraint, so "BUDI  santoso." = "Budi Santoso".
- A **GIN trigram** index (`pg_trgm`) lets `LIKE '%budi%'` use the index instead of a full scan.
  With hundreds of members you will not notice, but it stays fast with tens of thousands.
- An exact match wins: if there are members named "Budi" and "Budi Santoso", searching "budi" returns "Budi".
- The search is a *substring* search for now ("santo" matches "Budi Santoso"). For a stricter search,
  change `src/lib/search.ts` to match the start of a word (`search_name LIKE 'q%' OR search_name LIKE '% q%'`) or require an exact match.
- Fuzzy search (`similarity()` for typos) is **not** used on purpose, because it makes it easier to guess other people's names.

### 6. Other
- `statement_timeout` of 5 seconds and a limited connection pool (`src/lib/db.ts`).
- Security headers: `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy`, no `X-Powered-By`.
- `Cache-Control: no-store` on API responses.
- Use HTTPS in production (required so the `Secure` cookie is sent).
- Back up the database regularly; Excel stays the source of truth and can be imported again at any time.

## Next ideas
- An admin page (with login) to upload Excel and manage tokens, replacing the CLI scripts.
- Show extra safe info (for example batch or a masked member number).
- Search audit log per token to detect abuse.
- Automated tests (Vitest for `normalize`/`search`, Playwright for the end-to-end flow).
