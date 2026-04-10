# For new developers
Everything begins at [`app\(auth)\layout.jsx`](app\\(auth)\layout.jsx). This file is wrapped with a `ClerkProvider` which ensures every child page has access to auth.
> Look for `await auth()` to see how Clerk's authentication is accessed and used. Also, notice that all the app's pages are nestled inside the [`app/(auth)`](app\\(auth)) folder.

All APIs lie inside [`app/api`](app/api/) folder.
[`app/lib`](app/lib/) contains utils used across the app.

> For example, [`app\lib\constants.js`](app\lib\constants.js) contains DB table names, and [`app\lib\authless.js`](app\lib\authless.js) is for non-auth testing (look for `authless` across all files to see usage).


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