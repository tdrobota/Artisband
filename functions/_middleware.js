// Redirects the default artisband.pages.dev domain to the real custom
// domain (artisband.myvault.ro), added 2026-07.
//
// Cloudflare Pages doesn't offer a way to actually delete/disable the
// pages.dev domain -- every Pages project keeps one for the life of the
// project, and it always serves whatever the latest production deploy is,
// regardless of any custom domains attached on top. The closest thing to
// "removing" it is redirecting visitors away from it, which is what this
// does. Preview-deployment URLs (the random <hash>.artisband.pages.dev
// links Cloudflare generates for non-production branches) are left alone
// on purpose, in case those are ever needed for testing before a merge --
// only the exact production alias is redirected.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'artisband.pages.dev') {
    url.hostname = 'artisband.myvault.ro';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
