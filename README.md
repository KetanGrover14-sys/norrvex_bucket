# norrvex_bucket

A Next.js App Router application for viewing the recce captured in wecapurred_rr and its mapped installations. Built with Next.js 16 and React 19.

## Run locally

Requires Node.js 20.9 or newer.

```powershell
cd "C:\Users\RR Group\Downloads\whwd\norrvex_bucket"
npm.cmd install
# For a new checkout, copy .env.example to .env.local and configure it.
npm.cmd run dev
```

Open http://localhost:3100. A local .env.local has been created for this workspace with a random session secret and WECAPURRED_URL=http://localhost:3000. Set WECAPURRED_URL to the actual wecapurred_rr origin when connecting to its deployment.

For a fresh checkout:

```powershell
Copy-Item .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value into SESSION_SECRET in .env.local. Never commit .env.local.

## Production

```powershell
npm.cmd run build
npm.cmd start
```

For hosting, configure WECAPURRED_URL, SESSION_SECRET, and COOKIE_SECURE=true in the hosting environment and serve Bucket over HTTPS. Keep the same SESSION_SECRET on all instances and between deployments. Rotate it to invalidate all Bucket sessions. The local npm scripts bind to 127.0.0.1:3100; a hosting provider can use `next start --hostname 0.0.0.0 --port $PORT` or its standard Next.js integration.

The existing wecapurred_rr backend must have its Google Sheets, S3, and JWT configuration and the /api/repository route from the sibling source deployed. Bucket does not need direct database credentials.

## Structure

- app/login: shared-account login page.
- app/repository: authenticated recce gallery with search and filters.
- app/installations: authenticated gallery of recce with linked installations.
- app/api: Next.js route handlers for login, logout, session, repository, and installation upload.
- components: React login, gallery, image details, accessible dialogs, and mapping form.
- lib/backend.js: authenticated requests to the existing wecapurred_rr backend.
- lib/session.js: authenticated encryption for HttpOnly session cookies.
- lib/repository.js: groups specification entries and resolves installation links.
- tests: integration tests and session tests.

## Shared data and account behavior

Vivek logs in with the same email and password he uses in wecapurred_rr. That backend returns his existing ID and filters recce data by projects.vendor_id. Bucket displays the same images and specifications, with installation files linked through the existing installation_mappings records. Admins retain access to all projects.

The existing photo schema does not record an individual captured_by user. Access therefore follows the existing project assignment, not a new per-photo owner field. Images sharing a URL in the same project are grouped while retaining every specification entry.

Mapping and unlinking update the shared backend directly. Installation image uploads remain admin-only, matching wecapurred_rr. Vendors can link existing installation files in their own projects. Pending/approved/declined status is displayed separately from whether a file is mapped. PDFs and other installation files can be linked and opened, while images receive previews.

No demo images or localStorage repositories are used. Data is fetched on page load and with Refresh recce. Recce capture itself remains in wecapurred_rr.

## Sessions

The upstream token and account identity are encrypted using AES-256-GCM in an HttpOnly, SameSite=Strict cookie. No authentication token is accessible to client JavaScript. Cookies expire after seven days; the upstream still verifies its token and project permissions on every data request. Logout clears the browser cookie. Server restarts and multiple instances work with the same SESSION_SECRET. The SESSION_SECRET is separate from the upstream JWT_SECRET.

## Tests

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:production
```

Integration tests exercise the actual sibling repository authorization and Sheets filtering functions with in-memory fixtures and the same request handlers exported by Next.js. They cover account separation, shared mapping persistence, cross-project rejection, admin-only uploads, multipart forwarding, grouped specifications, backend errors, and session encryption/tampering/expiry. No real account or cloud data is modified.

A production build checks all pages and routes. The production smoke test starts an isolated Next.js server and fixture backend, then verifies protected redirects, login, the shared recce API, server-rendered pages, upload permissions, and logout over HTTP. Live account verification requires the actual backend URL and a working wecapurred_rr deployment.

Framework reference: https://nextjs.org/docs/app/getting-started/installation

## Recce, installation, and removal dates

Recce and installation records display their original server-generated `created_at` timestamp in India Standard Time (IST). These represent when the image was added, not a separately entered site-work time. Installation upload forms in both apps ask for a planned removal date. That date is stored as `removal_date` (YYYY-MM-DD) on the shared `project_files` record and shown alongside each mapped installation.

Deploy the updated wecapurred_rr backend and frontend, then Bucket. The partner backend automatically adds the `removal_date` column to the Google Sheets project_files tab using its existing schema initialization. Existing records remain compatible and show "Not specified" if no removal date was saved. Old clients may omit the field; the updated upload forms require it.
