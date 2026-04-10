# For new developers
Everything begins at [`app\(auth)\layout.jsx`](app\\(auth)\layout.jsx). This file is wrapped with a `ClerkProvider` which ensures every child page has access to auth.
> Look for `await auth()` to see how Clerk's authentication is accessed and used. Also, notice that all the app's pages are nestled inside the [`app/(auth)`](app\\(auth)) folder.

All APIs lie inside [`app/api`](app/api/) folder.
[`app/lib`](app/lib/) contains utils used across the app.

> For example, [`app\lib\constants.js`](app\lib\constants.js) contains DB table names, and [`app\lib\authless.js`](app\lib\authless.js) is for non-auth testing (look for `authless` across all files to see usage).

## Importing from Claude's Shiftly app
1. Keep 2 copies of the repo: `main` and your own branch
2. Transfer files one by one, fixing stuff on the go.
3. These are the usual things you gotta watch out for:
   1. Raw colour values. Refer to tailwind's classes or stuff in [`app\globals.css`](app\globals.css).
   2. Raw icons. Add/use stuff from [`app\lib\icons.jsx`](app\lib\icons.jsx)
   3. ASCII icons. Replace with actual SVG icons
   4. Repeated inline styles. If possible, move to reusable style vars.
   5. Arbitrary font sizes. Use tailwind's theme vars.
   6. Redefined button/rounded box styles. Use from globals.
   7. Raw DB table names. Add/use stuff from [`app\lib\constants.js`](app\lib\constants.js)
   8. Randomly mixing Supabase's service and anon keys. Stick to service key.
   9. Redefined components, like dropdowns.
   10. Unnecessary component files. Some components can be absorbed into a larger file, if they are tiny and are used in only that file.

# Basics
## 1. `use server` and `use client`

> [!important]
> 
> **From [Nextjs' documentation](https://nextjs.org/docs/app/getting-started/server-and-client-components):**
>
> By default, layouts and pages are [Server Components](https://react.dev/reference/rsc/server-components), which lets you fetch data and render parts of your UI on the server, optionally cache the result, and stream it to the client. When you need interactivity or browser APIs, you can use [Client Components](https://react.dev/reference/rsc/use-client) to layer in functionality.

## 2. App Router
We use Nextjs' [App Router](https://nextjs.org/docs/app/getting-started/layouts-and-pages), which means the filestructure **is** the routing.

All routes are:
Find all "app/" or router.push

## 3. Env vars
In env.local
For usages, find `env.` in files across the repo.

## 4. Python
We use [OR-Tools](https://developers.google.com/optimization) for optimized scheduling of shifts. Communication between app and python happens via a [flask](https://flask.palletsprojects.com/en/stable/) server, using the route `/schedule`.

## 5. Main pages
- [`app\page.jsx`](app\page.jsx) for the non-logged in landing page
- [`app\(auth)\dashboard\page.js`](app\\(auth)\dashboard\page.js) for the logged-in dashboard landing page