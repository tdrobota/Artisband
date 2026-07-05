# Artis Band Website — Project Handoff

Source: Webflow export (`artis-band-2_webflow.zip`), converted into a static, self-hosted,
dependency-free site targeting **Cloudflare Pages** at **artisband.ro**.

The current working files live directly in this project folder (`index.html`,
`about.html`, `work.html`, `css/`, `js/`, `images/`, `videos/`, plus the Cloudflare
Pages config files at the root) — this document is the map of what's been done and
what's left. No server/backend folder — the booking form is now a pure frontend
WhatsApp link, see below.

---

## Site structure (current)

Three real pages — everything else from the original export was removed as unused:

- `index.html` — homepage, includes the booking/contact form
- `about.html` — about page
- `work.html` — "Our Work" video showcase (YouTube embeds in a tile grid), see
  section 8 below

Removed entirely (confirmed unused, not linked anywhere): `contact.html`, `blog.html`,
`404.html`, `detail_blog.html`, `detail_works.html`, `401.html`, and the `/template/`
folder (Template Supply's own reference pages — never meant to be public).

---

## Completed work

### 1. Performance
- Videos: **225MB → 13MB**. `ab-video_mp4.mp4` (the CTA background video, CSS-blurred
  20px) recompressed to 6.1MB with no visible quality loss since blur hides detail
  anyway. `header-ab_mp4.mp4` (visible hero video) recompressed to 6.4MB at moderate
  quality. WebM versions dropped entirely — MP4/H.264 alone covers all modern browsers,
  and WebM didn't beat a well-tuned H.264 encode at these settings anyway.
- Deleted two unreferenced duplicate video files (`ab-video.mp4`, `header-ab.mp4` —
  smaller variants Webflow exported but nothing linked to).
- Deleted 55 unused images that only existed for the now-removed blog/portfolio pages.
- Total site size: 243MB → ~28MB. (This has since drifted, see the "Git repo
  initialized" section near the end of this document — `ab-video_mp4.mp4` was
  replaced at some point with a fresh, much larger upload, then recompressed again.)

### 2. SEO
- Every page had identical placeholder title/description ("Noura - Webflow HTML website
  template") — replaced with real, unique, Romanian-language title + meta description
  per page.
- `lang="en"` → `lang="ro"` on every page (was wrong — real accessibility/SEO bug).
- Added `og:image`, `og:url`, `twitter:image`, and `<link rel="canonical">` on every
  page (previously missing/empty).
- Canonical domain chosen: **`artisband.ro`** (no `www`). All canonical/og/twitter tags
  now point at the real domain.

### 3. Zero external dependencies
Everything the site loads is self-hosted — confirmed via a full sweep of every
`src`/`href` in both pages. (Turnstile was briefly added as an exception during an
earlier email-based version of the booking form, but that whole approach was replaced
by a WhatsApp-based flow — see below — so this claim is back to being fully true, no
exceptions.)
- **GSAP + ScrollTrigger + SplitText**: pulled from the public npm registry (exact
  version 3.15.0, byte-identical to what Webflow's CDN was serving) into `js/gsap/`.
  Bonus: confirmed Webflow made all GSAP plugins including SplitText **100% free** in
  2025 — the license concern that motivated this is a non-issue, this was purely a
  reliability fix (no longer dependent on Webflow's CDN staying up).
- **jQuery 3.5.1**: self-hosted at `js/jquery.min.js`. Verified byte-identical to the
  original via SHA-256 hash match against the original `integrity` attribute.
- **Two slider arrow icons**: recreated as local SVGs (`images/chevron-left.svg`,
  `images/chevron-right.svg`) since the originals lived on Webflow's asset CDN and
  weren't reachable to fetch directly. Color hardcoded to `#1a1b1f` (not `currentColor`)
  since `<img>`-loaded SVGs can't inherit page CSS.

**Important bug fixed along the way:** removing the `integrity`/`crossorigin`
attributes from the now-local jQuery `<script>` tag. SRI checks on a same-origin file
(especially over `file://` during local preview) can silently fail and block the
script from loading — which cascades into `webflow.js` failing right after, breaking
all animations AND leaving elements stuck at `visibility: hidden` (Webflow hides
elements by default and only reveals them once its JS runs). This was the root cause
of the "everything broke" bug report — confirmed fixed.

**Also fixed:** a pre-existing bug in the *original* Webflow export (not something we
caused) — three images on `about.html` were referenced in the HTML with hyphens in the
filename, but the actual exported files had spaces instead, so they were silently
broken links from day one. Recovered from the original upload and renamed to match.

### 4. Hosting setup (Cloudflare Pages)
Three files added at the site root:
- **`_headers`** — strict CSP (`default-src 'self'`, genuinely strict now that there
  are zero external deps; `style-src` needs `'unsafe-inline'` because Webflow's export
  relies on inline `<style>`/`style=""` for its pre-animation hide/reveal mechanism),
  HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy,
  Permissions-Policy (camera/mic/geo/USB disabled). Caching: images/videos/fonts get a
  hard 1-year cache; CSS/JS get a short 1-day cache deliberately, since this export
  doesn't use hashed filenames (a long cache there would mean returning visitors get
  stuck on stale CSS/JS after future edits — revisit if cache-busting filenames are
  ever adopted).
- **`robots.txt`** — allows all crawling.
- **`_redirects`** — forces `www.artisband.ro` → `artisband.ro` (301), matching the
  canonical domain choice above.

**Deploy steps:**
1. Push the site folder to a GitHub/GitLab repo. **Done on this end** — see "Git repo
   initialized" near the end of this document; the client's own push (their
   credentials, not something handled here) is the one remaining step.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect the repo.
3. Build settings: framework preset **None**, build command **empty**, output
   directory **/** (pure static export, nothing to build).
4. Add custom domain `artisband.ro` under the project's *Custom domains* tab —
   Cloudflare issues/renews SSL automatically.

---

## Contact/booking form — pivoted to WhatsApp — DONE except the real phone number

The form lives on `index.html` (not a separate contact page) — the "Rezervă Artis Band
pentru evenimentul tău" section. **This replaces the earlier email/Resend/Turnstile
version entirely** — client decided WhatsApp is the right channel instead of email.
That whole backend (`functions/api/contact.js`, Turnstile widget, Resend integration)
has been deleted; there is no server component anymore.

*(Update, see "Hybrid contact method: WhatsApp + Email, desktop only" below: a much
narrower Resend-based backend was reintroduced later, as a desktop-only Email option
sitting ALONGSIDE WhatsApp rather than replacing it. WhatsApp itself, and everything
below in this section, is still accurate and still the only option on phones.)

**Form fields, final state (`name` attributes in parens):**
- Nume complet (`name`) — text, optional, maxlength 256
- Tipul evenimentului (`eventType`) — **no longer a dropdown.** Rendered as three pill
  buttons (Nuntă / Botez / Alt eveniment), single-select, required. Implemented as real
  radio inputs visually hidden and paired with `<label>` buttons (the label-for
  pattern), so it's still a native, keyboard/screen-reader-accessible radio group —
  just styled to look like buttons. No extra JS needed to track selection state.
- Data (`eventDate`) — native `<input type="date">`, required. Gets a browser-native
  calendar picker for free, no custom widget needed. JS sets `min` to today's date on
  page load so past dates can't be selected.
- Orașul (`city`) — free text, required.
- Locația (`venue`) — free text (the venue/hall name), required.

**How submission works now — no backend at all:**
The submit handler (inline `<script>` at the end of `index.html`) prevents the default
submit, reads the four fields above, builds a plain-text WhatsApp message, and opens
`https://wa.me/<number>?text=<the message, url-encoded>` in a new tab. That's it,
WhatsApp (app or web) opens with the message pre-filled, and the visitor taps **Send**
themselves. This is why no honeypot/Turnstile/spam-checking is needed anymore: nothing
auto-submits anywhere, a bot filling the form and "clicking" the button doesn't
actually deliver anything without a real WhatsApp account manually pressing send.

**Real phone number is set.** `WHATSAPP_NUMBER` in `index.html` and the floating
WhatsApp button href on both pages now point to `40740326997`. No placeholder left.
(Updated from an earlier number, `40728314158`, to match the client's actual contact
number, `0740326997`, see the follow-up note near the end of this document.)

**Message format sent to WhatsApp**, for reference:
```
Salut! Aș vrea să rezerv Artis Band pentru un eveniment.

Nume: <name or "(nespecificat)">
Tip eveniment: Nuntă / Botez / Alt eveniment
Data: DD.MM.YYYY
Orașul: <city>
Locația: <venue>
```

**`_headers` CSP** reverted to the original strict `default-src 'self'` (no exceptions)
now that Turnstile is gone.

### Visual redesign of the form fields

Client liked the blurred-video side of the CTA section but not the form itself (plain
browser-default inputs). Redesigned to match the site's existing visual language:

- Every field now has a small uppercase label above it (Nume complet, Tipul
  evenimentului, Data, Orasul, Locatia), using the same small-caps mono style already
  used for other labels on the site (see `.scroll-note_text` for the original
  pattern), instead of relying on placeholder text alone.
- Data and Orasul now share a row side by side on tablet/desktop (`.form-row`), stacking
  back to one column under 767px so it stays usable on phones. Nume complet, Tipul
  evenimentului, and Locatia stay full width.
- Inputs (`.form-input`) switched from the plain bordered `.w-input` look to a filled
  light grey background with no visible border, rounded corners matching
  `--border-radius--small` (used elsewhere on the site), and a black border that
  appears on focus instead of Webflow's default blue.
- Event type is still the pill button group added earlier (`.event-type-group` /
  `.event-type-btn` / `.event-type-input`), just now sitting under its own label like
  the other fields.
- The submit button changed from a plain `<input type="submit">` to a `<button>` so it
  could hold a WhatsApp icon next to the text (new asset:
  `images/whatsapp-icon-dark.svg`, a black version of the floating button's icon since
  this button has a yellow background, not green). Still uses the same
  `.submit-button` brand-yellow styling, now full width with the icon.

None of this touched the actual submit behavior, the same JS handler and WhatsApp flow
from before still apply unchanged.

### Hybrid contact method: WhatsApp + Email, desktop only

Client feedback after using the site on a laptop: WhatsApp-only is great on a phone
(fast, no setup, exchanges phone numbers automatically) but awkward on a laptop, since
it needs WhatsApp Web already linked to that device first. Added an Email option
**alongside** WhatsApp — but only where it actually helps:

- **Phones (below 992px): unchanged.** No toggle is shown at all, the form behaves
  exactly as it did before this section — WhatsApp only, no backend involved.
- **Laptops/desktops (992px and up):** a small WhatsApp/Email toggle
  (`.contact-method-toggle`) appears above the form fields, on both the main contact
  section form and the booking popup. Same accessible radio-button-styled-as-pills
  pattern as the event-type selector (`.event-type-group`), just with an icon next to
  each label. Selecting a method live-updates the submit button's label/icon and the
  done/fail message copy (see `applyMethod()` in the booking-*.js files).
- **A visitor email field appears only when Email is selected** (`data-contact-email-
  field`, `hidden` by default, `required` toggled to match). The form never collected
  an email or phone number before — WhatsApp doesn't need one (the visitor's identity
  comes through automatically once they send the pre-filled message), but email
  obviously does, there'd be no way to reply otherwise.

**This DOES bring back a real backend, unlike the WhatsApp path** —
`functions/api/contact.js`, a Cloudflare Pages Function, POSTs to
[Resend](https://resend.com) to actually send the email. This is a smaller, narrower
version of the email backend that was fully removed earlier in this project (see the
section above) — same idea, but now it's an addition next to WhatsApp rather than a
full replacement, and only reachable through the desktop-only Email toggle.

**Manual setup required before the Email option will actually work (none of this can
be done from inside the codebase):**
1. Create a Resend account (or reuse the one from the earlier email version, if it
   still exists).
2. Verify a sending domain in Resend — e.g. `artisband.ro` itself, or a subdomain like
   `mail.artisband.ro` — by adding the DNS records Resend provides. Required to send
   FROM an `artisband.ro` address (`contact@artisband.ro`, currently hardcoded as both
   the `from` and `to` address in `functions/api/contact.js` — the visitor's own
   address is set as `reply_to` instead, so replying to the notification email goes
   straight to them).
3. Create a Resend API key.
4. Cloudflare dashboard → Workers & Pages → this project → Settings → Environment
   variables → add `RESEND_API_KEY` as a **Secret** (not plain text) for the
   Production environment, then redeploy (or just wait for the next deploy).

Until that's done, submitting via Email will show the fail message (the Function
returns `email_not_configured` if `RESEND_API_KEY` isn't set) — WhatsApp is completely
unaffected either way, they're fully independent code paths.

**Deliberately NOT re-added:** Turnstile, honeypots, or rate limiting on the new
endpoint. The project walked away from that complexity once already (see above) —
starting the Email path simple on purpose, worth revisiting only if spam becomes an
actual problem.

**New assets:** `images/email-icon-dark.svg` / `images/email-icon.svg` (black/white
envelope icon, matching the existing `whatsapp-icon-dark.svg` / `whatsapp-icon.svg`
naming convention).

### Follow-up polish: single-card look and vertical centering

Client also flagged two visual issues after seeing the redesign:

- The video panel and the white form panel each had all four corners rounded, so on
  desktop (where they sit side by side with no gap) they looked like two separate
  rounded cards pushed together rather than one seamless card. Fixed by rounding
  `.cta_graphic-wrap` on the left corners only and `.cta_content` on the right corners
  only, so the shared edge in the middle is a plain straight line. This split only
  applies above the 991px breakpoint. Below it, `.cta_component` stacks into a column
  (video strip on top, form below), so both halves go back to fully rounded corners
  there (added to the existing `max-width: 991px` media query), matching how two
  stacked cards should look.
- The form content was top-aligned inside `.cta_content` with `justify-content:
  space-between`, which left a large empty gap under the submit button because the
  video side (a fixed square aspect ratio) is usually taller than the form's natural
  content height. Changed to `justify-content: center` so the whole content block
  (heading, text, form) sits vertically centered in the available height instead.
- That centering still looked slightly off after the fix above, content sat a bit
  lower than it should. Cause: `.form-wrap` (the last of the three centered flex
  children) still had `margin: 0 0 15px` left over from replicating Webflow's old
  `.w-form` spacing rule. That trailing margin is invisible but still counts toward
  the flexbox's centering math, so the visible content (ending at the submit button)
  looked pushed down by 15px relative to the top. Removed the margin entirely, since
  the flex `gap` (`grid-row-gap: var(--fixed--3rem)`) already spaces the three
  sections out and made this leftover margin redundant anyway.

### Verified live in a real browser (not just static CSS review)

Client kept reporting the card still didn't look centered even after the fixes above,
so rather than guess again, set up a local server (`python -m http.server`) and
connected via the Claude in Chrome extension to actually measure the rendered layout
instead of eyeballing screenshots. This caught real bugs that static review missed:

- **Centering is now mathematically confirmed exact.** Measured
  `getBoundingClientRect()` on the card's content at viewport widths 992px, 1200px,
  1440px, and 1920px: the gap above the heading and the gap below the submit button
  are identically 64px (exactly the card's own padding) at every single width tested.
  There is no remaining asymmetry, this was a real, verified fix, not a guess.
- **Found a real mobile bug the static review missed:** `.form` had a hardcoded
  `width: 40em` (640px) with no responsive override anywhere. Below ~640px viewport
  width this forced the whole booking form wider than its container, breaking out of
  the card and causing horizontal overflow/scroll on any phone (confirmed via a test
  iframe at 320px, 375px, and 768px widths, the "Trimite pe WhatsApp" button was
  visibly cut off). Fixed to `width: 100%; max-width: 40em;`, this is the actual root
  cause of the mobile layout problems, not a centering issue.
- **Found a second real bug:** the floating WhatsApp button (fixed bottom-right)
  overlapped the footer's Facebook icon and copyright line when a page was scrolled
  all the way down on a short/mobile viewport. Added `padding-bottom: 6rem` to
  `.footer` to guarantee clearance at every screen size.
- Confirmed the mobile stacked layout (video banner on top, form below, both fully
  rounded) renders correctly at 768/900/991px, and the seamless split-radius side by
  side card kicks in correctly at 992px+, with no horizontal overflow at 320, 375,
  768, 991, 992, 1200, 1440, or 1920px on either `index.html` or `about.html`.
- **Follow-up: hero heading gap asymmetry, found and fixed.** Client reported the gap
  between "Noi suntem" and the photo didn't match the gap between the photo and
  "Artis Band" in the scroll-grown hero heading. Confirmed live with
  `getBoundingClientRect()`: the left gap measured 20px against a 4px right gap at
  every viewport width, a consistent 16px (1rem) difference. Root cause: the two
  headings are absolutely positioned off the component's own edges (a fixed 4px
  offset baked into the template), but the photo is sized to the component's content
  box, so `.home-about_component`'s asymmetric padding (`1rem` left, `0` right) shifted
  the photo 16px off from where the headings expected it. Fixed by making the padding
  symmetric (`1rem` on all sides). Re-verified live across six scroll positions from
  the top of the section through 30% scroll (component growing from ~142px to
  ~1060px wide): left and right gaps are now identically equal at every position, not
  just visually close.
- The earlier console warnings ("GSAP target not found") turned out to be unrelated
  stray warnings from other page interactions, not from this hero animation. Checked
  directly: the hero's scroll-driven grow animation (12vw/10vh growing to 100vw/100vh)
  is running correctly and was never broken.

### Not done yet, by design: blocking already-booked dates from the calendar

Client asked about this too, but explicitly deprioritized it in favor of shipping the
WhatsApp version for launch. Native `<input type="date">` can't disable arbitrary
individual dates (only a continuous `min`/`max` range), blocking specific booked dates
needs a small custom calendar widget plus *some* source of truth for which dates are
taken (e.g., a manually-maintained JSON file of booked dates checked via JS, or a
lightweight Cloudflare KV-backed list with a simple way for the client to add a
booking). Worth scoping properly as its own follow-up rather than rushing before
launch, flag this as the next thing to pick up.

---

## Footer template credit removed

Both pages had "Powered by Webflow" and "Created by Template Supply" links in the
footer, left over from the original Webflow export. Checked Template Supply's own
license agreement (template.supply/licenses) before removing: their free-template
terms explicitly state attribution is not required ("Customers are not required to
display a credit, link, or reference to Template Supply when using a licensed
product"), so removing these was safe. Both lines and their divider elements are gone
from the footer on `index.html` and `about.html`, leaving just the copyright line.

Client then asked for a full sweep of every remaining Webflow/Template Supply mention.
Found and removed:

- The "This site was created in Webflow" and "Last Published" HTML comments at the top
  of both pages.
- The `<meta name="generator" content="Webflow">` tag on both pages.
- **A real bug:** `about.html` still had a live "Use for free" button in the page body,
  linking straight to the Webflow template marketplace listing for this exact template
  (`buy-template` class, fixed to the bottom right corner). This was actually visible
  on the published about page, not just in the source, and would have looked
  unprofessional to any visitor who scrolled past it. `index.html` never had this
  element, only `about.html` did. Removed the link and the now-unused `.buy-template`
  CSS rule.
- The entire `/template/` folder (Template Supply's own changelog/instructions/
  licenses/style-guide reference pages, not linked anywhere on the live site but still
  physically present) has been deleted.
- Also removed the Webflow site/page IDs (`data-wf-site`, `data-wf-page`) from the
  `<html>` tag on both pages. Checked `js/webflow.js` first: `data-wf-site` was only
  read to build the URL for Webflow's own hosted form-submission API, which the
  booking form was already disconnected from (that's the whole point of removing the
  `.w-form` class earlier). `data-wf-page` isn't read by the runtime JS at all, it's a
  Webflow Designer/editor-only artifact. Confirmed safe to remove both.

**What was deliberately left alone**, and why: the stylesheet/script filenames
(`css/webflow.css`, `css/artis-band-2.webflow.css`, `js/webflow.js`) and the many
`data-wf-*` attributes sprinkled through the page markup (things like
`data-wf-element-id`, `data-wf-ignore`, `data-wf--navbar--variant`). None of these are
visible to a site visitor, they're invisible technical plumbing, not brand mentions,
and some of them (`data-wf-ignore` in particular) are actively read by `webflow.js` to
make sliders and animations work correctly. Renaming the CSS/JS files themselves is
possible but purely cosmetic (nobody sees a stylesheet's filename unless they open dev
tools) and would mean updating every reference across both HTML files for zero visible
benefit, flagging this as optional if the client still wants it despite it being
invisible.

### Favicon replaced

The template's own "N" (Noura) icon has been replaced. Rather than inventing a new
mark, extracted the exact "A" glyph path from the real logo (`images/logo-white.svg`)
so the favicon is authentically the same geometric mark used in the actual logotype,
not something new. Isolated as its own file at `images/logo-mark-a.svg` (black fill,
reusable for future brand materials if needed).

Built two color options (black background with the brand yellow `#fffc34` mark, or
the inverse) and showed both to the client. **Client chose yellow background with the
black mark.** That version is now baked into `images/favicon.png` (32x32) and
`images/webclip.png` (256x256), replacing the old files in place, so no HTML changes
were needed since both pages already referenced these same filenames.

---

## 5. Navbar + footer small fixes

- **Navbar padding fixed:** `.navbar_links-wrap` had `1.75rem` padding on the left but
  only `0.5rem` on the right, so the pill-shaped nav bar looked visibly off-center
  (noticeable especially on the homepage over the hero image). Now symmetric —
  `0.5rem` top/bottom, `1.75rem` left/right — on both pages.
- **Active nav link now highlighted in the brand yellow (`#fffc34`):** added
  `.navbar_link.w--current { color: #fffc34; }`. Webflow's export already correctly
  marks the current page's link with the `w--current` class on both `index.html` and
  `about.html`, so this "just worked" once the CSS rule existed — no markup changes
  needed.
- **Social links trimmed to Instagram, YouTube, Facebook** (X/Twitter dropped per
  client). Facebook didn't have an icon in the original export, so a matching
  single-color SVG glyph was added at `images/social-fb.svg` (same style as the
  existing icons — flat, monochrome, no background shape). The now-unused
  `images/social-x.svg` was deleted. Updated in both `index.html` and `about.html`
  footers. **Still placeholder URLs** (`facebook.com`, `instagram.com`, `youtube.com`
  root domains) — same open item as before, just now for three platforms instead of
  four.

---

## 6. Booking form and floating WhatsApp button, follow-up polish

- **Date field now opens on a click anywhere in it**, not just the small calendar icon
  on the right. Uses the native `showPicker()` API (supported in current Chrome, Edge,
  Firefox and Safari); on older browsers it just falls back to the previous
  click-the-icon behavior, no regression. Added in the inline script in `index.html`.
  Cursor is set to a pointer on the field as a visual hint.
- **Floating WhatsApp button** added to both pages, fixed bottom right, brand green
  circle with a pulsing ripple animation (respects `prefers-reduced-motion`, ripple is
  disabled for people who've asked their OS to reduce motion). New icon asset at
  `images/whatsapp-icon.svg`. Same real number as the booking form (`40728314158`).
  Later restyled to the site's own yellow/black (see section 7).

---

## 7. Footer redesign, yellow WhatsApp button, booking popup with calendar

- **Footer redesigned** on both pages, through a few rounds. First pass: a
  three-column layout (brand/tagline, "Navigare", "Contact") inside a white rounded
  card, matching the rest of the site's card language. Client then pointed to xAI's
  site footer as a reference and asked for that seamless look instead: dark, no card,
  blending straight into the page, with a glow rising from the bottom (theirs is
  orange, asked for our yellow). Rebuilt on a transparent background so the page's
  own dark textured background shows through with no card edge, logo swapped to the
  white wordmark, link/label/copyright colors flipped from dark-on-light to
  light-on-dark, and the social icons (baked as solid black SVGs) inverted to white
  with `filter: invert(1)` rather than shipping new light-mode assets.
- **That second version still wasn't right**, client feedback: it read as two
  stacked footers (a row of columns, then a visually separate divider + copyright/
  social bar below it), the glow was too faint, and asked for the "ARTIS BAND" text
  removed entirely. Fixed by consolidating everything into one single row: brand
  column (logo, tagline, and now the copyright line folded in underneath, small and
  quiet, not a separate bar), "Navigare", "Contact", and a new fourth "Social" column
  with the icons moved up into the row instead of sitting apart. Removed the divider,
  the separate bottom bar, and the giant wordmark completely, along with their CSS.
  The glow itself was also considerably strengthened (higher opacity, larger spread)
  so it actually reads on the page instead of being barely visible. Links hover to
  yellow instead of black now that the background is dark. New CSS classes are
  prefixed `footer-new_*`; the previous `.footer_main`/`.footer_links-groups`/
  `.footer_group`/etc. rules from the original template are left in the stylesheet
  unused rather than deleted, in case that structure is ever wanted again. Stacks
  cleanly to a single column on mobile, confirmed no horizontal overflow at 375px in
  a live test, checked after each round of changes.
- **Follow-up: removed the footer's left/right padding entirely** so the content
  runs edge to edge (the brand logo sits flush against the left edge, the social
  icons flush against the right), instead of being inset like the rest of the site's
  card-based sections. Also cut the bottom padding down from `6rem` to `2.5rem`,
  the original `6rem` was sized generously to guarantee clearance from the fixed
  floating WhatsApp button, but left a lot of dead space under the footer content.
  Reconfirmed live that the WhatsApp button still doesn't overlap the social icons
  at the bottom of the page with the smaller padding, on both pages, and that the
  footer is genuinely flush left/right (measured `getBoundingClientRect()`, not just
  eyeballed) at both desktop and 375px mobile widths, no horizontal overflow either
  way.
- **Follow-up: zero bottom padding too.** Client pointed out there was still a
  visible dead gap below the footer content before the page's actual bottom edge.
  Removed `.footer`'s remaining `padding-bottom` entirely (was `2.5rem`, added right
  after the previous change for WhatsApp button clearance) and zeroed the equivalent
  mobile breakpoint overrides on `.footer_wrap`, so the footer's last row now sits
  exactly flush with the true bottom of the page, confirmed live (`footer bottom
  edge == viewport height` when scrolled to the end).
  - This is a fixed, page-bottom-relative row sitting in the exact same corner as
    the fixed, viewport-bottom-relative WhatsApp button, so removing the padding
    made the button start covering the social icons whenever the page was
    scrolled all the way down (confirmed the overlap live before fixing it, this
    was a real regression, not just a visual guess). Fixed properly instead of
    re-adding the padding: gave just the footer's "Social" column extra
    `margin-right` (desktop) or `margin-bottom` (stacked mobile layout) so the
    icons clear the button's fixed footprint, and separately, per a direct
    follow-up ask, moved the button itself up a bit further (`bottom: 1.5rem` to
    `2.5rem` on desktop, `1rem` to `2rem` on the small-mobile breakpoint) for
    extra clearance. Reconfirmed no overlap on both pages after both changes.
- **Follow-up: fixed a real logo distortion bug.** While chasing a report that the
  tagline text didn't line up with the logo above it, found that the logo `<img>`
  was being stretched by the flex container's default `align-items: stretch` to the
  full column width (352px measured) instead of its natural ~126px, squashing its
  aspect ratio from the correct ~5.7:1 down to 16:1. Fixed by setting
  `align-items: flex-start` on `.footer-new_brand`, which lets the logo size
  naturally instead of being force-stretched. Verified with a canvas pixel probe
  (not just eyeballing) that the logo and the tagline text now both start at
  exactly the same left edge (`x = 0`), on both pages.
- **Follow-up: symmetric left/right gutters.** Client asked for the brand block
  (logo, tagline, copyright) to sit the same distance from the left edge as the
  social icons sit from the right, rather than one edge being flush and the other
  inset. Gave both `.footer-new_brand` and the Social column a matching
  `margin: 3rem` (left on one, right on the other, using the existing `--fixed--3rem`
  design token), replacing the earlier one-off `6rem` that was only sized to dodge
  the floating button (no longer needed now that the button docks properly, see
  below). Zeroed both on the stacked mobile layout where left/right symmetry doesn't
  apply. Verified live: both gutters measure 48px from their respective edges.
- **Follow-up: the floating WhatsApp button now docks above the footer instead of
  floating over it.** This needed actual scroll-aware JavaScript, not just CSS,
  since the goal was "float like normal while scrolling through the page, then stop
  and park just above the footer once you reach it" rather than overlapping footer
  content for the rest of the scroll. Added a small scroll listener (throttled via
  `requestAnimationFrame`) on both pages that checks the footer's position each
  frame: while there's room above the footer, the button stays `position: fixed`
  as before; once the footer's top edge comes within the button's reserved space
  at the bottom of the viewport, the button switches to `position: absolute` with
  a computed `top` that pins it 16px above the footer, and switches back to fixed
  the moment you scroll back up. Verified with real scroll input (not just
  programmatic `scrollTo`, which doesn't reliably fire scroll events) on both pages
  and on a 375px mobile layout: the button floats normally through all the main
  content, docks with an exact, consistent 16px gap above the footer at the true
  bottom of the page, and releases back to floating the instant you scroll up
  again.
- **Follow-up: fixed invisible footer text and a washed-out glow on the About
  page.** Client reported footer text wasn't readable and the yellow glow looked
  faded specifically on `about.html`. Root cause: `index.html`'s `<body>` has
  `class="body"`, which is what actually applies the site's dark textured
  background (`.body` in the CSS, background-color black plus the repeating
  texture image), `about.html`'s `<body>` was missing that class entirely, a
  leftover gap from earlier work, so it was falling back to the plain light beige
  background instead. That's exactly why the footer's white text and yellow glow,
  both designed assuming a dark backdrop, looked washed out there: white on beige
  is low contrast, and the yellow glow blended into a light background instead of
  a dark one, looking pale instead of vibrant.
  First fix attempt was to add `class="body"` to `about.html` to match `index.html`,
  but the client asked to keep the beige body for the rest of the page (About page's
  content sections are intentionally light-themed), so that was reverted. Fixed
  properly instead by giving `.footer_wrap` its own explicit dark background
  (same black color plus the same repeating texture image used by `.body`)
  rather than depending on the page background to show through. This makes the
  footer look identical to before on `index.html` (which was already dark
  everywhere, so no visible change there) while giving `about.html` a proper dark
  footer band sitting under its light beige content, a common, normal pattern, and
  fixes the contrast and glow vibrancy without touching the rest of the About
  page's light theme.
- **Floating WhatsApp button recolored** from WhatsApp's brand green to the site's own
  yellow/black (`#fffc34` background, black icon), so it matches the rest of the UI
  instead of looking like a bolted-on third-party widget. Ripple animation now pulses
  yellow to match.
- **The floating WhatsApp button (and the footer's "Rezervă un eveniment" link) now
  open a booking popup** instead of linking straight to `wa.me`. The popup has the
  same fields as the homepage's booking form (name, event type, city, venue), laid
  out with the form on the left and a real, always-visible calendar on the right,
  showing the current month with previous/next navigation, disabled for past dates
  and for months before the current one. Picking a date fills a hidden field and
  shows a small "Data aleasă: ..." confirmation under the calendar. This is the same
  "calendar already open, browsable to future months" approach floated earlier as an
  alternative to the click-to-open native date field, just built into the popup
  where there's enough room for it, rather than the tighter embedded form.
- The homepage's original embedded booking form (video + form card, native date
  field) is untouched and still works exactly as before, the popup is a second,
  parallel entry point available from anywhere on either page (`about.html` had no
  booking form at all before this, so the popup is now its only way to book without
  scrolling back to the homepage).
- Submit handling was refactored so both forms (the embedded one and the popup one)
  share one `bindBookingForm()` function instead of duplicating the WhatsApp message
  logic, verified live: filling out the popup and submitting produces the same
  correctly formatted `wa.me` message as the original form (name, event type, date,
  city, venue). Custom validation (a below-form message, since the date field is
  hidden and can't show the browser's native "please fill this in" tooltip) confirmed
  to trigger specifically when every other field is filled but no date was picked,
  the one gap native HTML validation can't cover here.
- Verified live in the browser: popup opens/closes correctly (X button, clicking the
  overlay, and Escape all close it), month navigation moves forward and back with the
  "previous month" arrow correctly disabled once back at the current month, and the
  whole popup reflows to a single stacked column (form, then calendar) on a 375px
  mobile test with no horizontal overflow, on both `index.html` and `about.html`.

---

## 8. About page footer color scheme, real contact/social details, responsive fixes, new "Our Work" page

- **`about.html` footer switched from dark to a light/beige variant**, per client
  request (the rest of the About page stays beige, only the footer was dark). Added
  a `.footer-light` class (applied only on `about.html`'s `<footer>`) with its own
  override block: `.footer_wrap` background swaps to the site's beige, the yellow
  glow (`.footer_wrap::before`) is boosted in saturation/opacity so it still reads
  clearly against the lighter backdrop instead of washing out, and all footer text/
  links/social icons switch from light grey/white to dark grey/black
  (`.footer-light .footer_link`, `.footer-new_col-title`, `.footer-new_tagline`,
  `.footer_copyright`, and `filter: none` on `.footer_social-media` to undo the
  invert-to-white used on the dark variant). `index.html`'s footer is untouched.
- **Real social profile URLs** set on both pages (Instagram, YouTube, Facebook),
  replacing the old generic root-domain placeholders:
  `instagram.com/artisband`, `youtube.com/@artisbandsv2086`, `facebook.com/artisbandsv`.
- **Real contact details added to the footer's Contact column** on both pages:
  phone `tel:0740326997` and `mailto:contact@artisband.ro`, replacing the WhatsApp
  number that used to be displayed as plain text there (the WhatsApp booking flow
  itself is untouched, still driven by the same real number inside the JS, this
  was only about what's shown as a direct-contact link).
- **Fixed: solid white navbar background at tablet/mobile widths.** `.navbar.is-light`
  had `background-color: white` at `max-width: 991px` (a leftover Webflow default for
  the mobile dropdown), which read as a harsh, disconnected white bar against this
  site's dark (`index.html`) or beige (`about.html`) themes once the nav went fixed
  and started overlapping scrolled content. Replaced with a translucent + blurred
  background instead (dark for the base/index variant, beige for the `about.html`
  variant via its existing `:where(.w-variant-...)` selector), so the page's own
  background shows through. Since the opaque white bg is what the black-logo swap
  at this breakpoint was built for, `index.html` (no variant) now keeps its white
  logo at every width instead of switching to the black one, `about.html`'s logo is
  unaffected (already black at every width, unconditionally, unrelated to this fix).
- **Fixed: homepage CTA card (video + booking form) could render off-center or with
  the form partly cut off** (no horizontal scrollbar, so it just silently clipped) at
  viewport widths a bit above 991px, where the layout is still side-by-side (not yet
  stacked). Root cause: `.cta_graphic-wrap` and `.cta_content` are a CSS grid's two
  `1fr` columns, but grids default to `min-width: auto` on grid items, which lets an
  item's intrinsic content size win over its fair track share. The video side's
  intrinsic size was winning, grabbing more than half the row and pushing the form
  side past the container's right edge. Fixed by adding `min-width: 0` to both, now
  they split evenly and the card is always centered with the form fully visible,
  confirmed via `getBoundingClientRect()` at 1067px width (before: graphic 802px /
  form 358px, badly uneven; after: 476px / 476px, even).
- **Fixed: same CTA card's two halves read as two disconnected floating cards once
  stacked** (mobile/tablet, `max-width: 991px`), each with all four corners rounded
  independently instead of reading as one unit. Changed to a seamless split like the
  side-by-side desktop layout has, just rotated: `.cta_graphic-wrap` rounds only its
  top corners, `.cta_content` rounds only its bottom corners, flat seam in between.
- **Fixed: footer not responsive on mobile.** `.footer-new_top`'s mobile breakpoint
  zeroed out the `margin-left`/`margin-right` that gave the brand column and the
  Social column their side gutters on desktop, intending an edge-to-edge look, but
  the Navigare/Contact columns in between never had a margin at all, so once
  everything stacked into one column, all four sections ended up at inconsistent (or
  zero) distance from the edge. Replaced with a single shared `padding-left`/
  `padding-right` (`1.5rem`) on `.footer-new_top` itself at that breakpoint, so every
  stacked column gets the same, consistent inset.
- **Fixed: fixed navbar overlapping the first heading on `about.html` (and the new
  `work.html`) at mobile/tablet widths.** `.navbar.is-light` is unconditionally
  `position: fixed`, which only avoided overlapping content on pages whose first
  section happens to have enough of its own natural top spacing (`index.html`'s tall
  hero). Added `padding-top: 4.5rem` to `.main-wrapper` at `max-width: 991px` so the
  page's main content always clears the fixed nav, regardless of a given page's own
  spacing. Verified on `index.html`, `about.html`, and `work.html` at 390px width,
  no more overlap, no regression on the pages that already had enough clearance.
- **New page: `work.html` ("Our Work"), a video showcase in a Netflix/HBO Max-style
  tile grid.** Added a third nav link (navbar and footer "Navigare" column, all three
  pages) pointing to it. Content is the 6 most recent videos from the band's YouTube
  channel (`youtube.com/@artisbandsv2086`), pulled live from the channel's own
  "Videos" tab (title, video ID, view count, upload age) rather than invented:
  "Mâinile (live cover Feli)", "Shallow, Pas cu pas, Can't stop the feeling",
  "Oldies but goldies - De-ar fi sa vii", "Kalasnikov, Vara asta, Rămâi", "Purple
  Rain", "Perspektiva, Beggin', Sex on Fire" (all live covers). Each tile shows the
  video's real YouTube thumbnail (`i.ytimg.com/vi/<id>/hqdefault.jpg`) with a yellow
  play badge that scales in on hover, plus title and view/age meta. Clicking a tile
  opens a lightbox (`#video-modal`) that builds a fresh `youtube-nocookie.com/embed/`
  iframe with `autoplay=1` on open and fully removes it on close (so the video
  actually stops instead of continuing to play silently off-screen), closable via the
  X button, clicking the overlay, or Escape, same interaction pattern as the existing
  booking modal. `work.html` reuses the exact same footer, floating WhatsApp button
  (with docking), and booking popup as the other two pages, dark theme (`index.html`
  style, not the beige `about.html` style, deliberately, for a more cinematic feel
  matching the "Our Work" concept). Verified live: grid renders real thumbnails (not
  placeholders), a tile click opens the lightbox with the video actually playing,
  close tears the iframe down, responsive at 1300px/desktop and 390px/mobile (single
  column on mobile), and the hamburger menu on all three pages correctly lists all
  three nav links.

---

## 9. Cleanup pass: file renames, Romanian nav label, new Portofoliu header

- **Renamed the Webflow-branded source files** (client asked to clean these up):
  `css/webflow.css` → `css/framework.css`, `css/artis-band-2.webflow.css` →
  `css/site.css`, `js/webflow.js` → `js/interactions.js`. Updated the `<link>`/
  `<script>` tags on all three pages (`index.html`, `about.html`, `work.html`) to
  match, verified live afterwards that all three pages still load correctly with
  no 404s (checked network requests, all 200s) and look/behave identically to
  before the rename. Also deleted an unused leftover image,
  `images/webflow-spacing-bg-final_1webflow-spacing-bg-final.png`, and the one
  dead CSS rule that referenced it (`.resources_structure-out.fill-bg`, not used
  by any element in the current markup, a leftover from the removed blog/resources
  template pages).
- **"Our Work" nav label translated to Romanian: "Portofoliu"**, everywhere it
  appeared, nav on all three pages, the footer's Navigare column on all three
  pages, `work.html`'s `<title>`/`og:title`/`twitter:title` meta tags, and the
  page's own hero kicker text. The page's own filename (`work.html`) is
  unchanged, same pattern as `about.html` keeping an English filename while all
  visible text is Romanian.
- **Portofoliu page header replaced**: was a full-bleed band photo (borrowed from
  a reference layout the client liked), swapped per follow-up feedback for the
  site's solid yellow brand color with the black Artis Band logo centered on it,
  plus a scroll-driven parallax effect, the logo translates down, shrinks
  slightly, and fades as the section scrolls past (vanilla JS, `requestAnimationFrame`-throttled scroll listener, no library), rather than
  `background-attachment: fixed`, which mobile browsers handle inconsistently.
  Kicker/heading/body text colors switched from white to black to stay legible
  against the yellow background. Verified live at desktop and 390px mobile, no
  overlap between the logo and the heading text (an intermediate version had
  them stacked on top of each other via absolute positioning, fixed by making
  the logo and text flow normally in the same centered flex column instead).

## 10. Portofoliu header animation (cursor parallax + wave divider)

Client shared a CodePen reference ("Cinematic Hero Section with Interactive
Wave & 3D Parallax") and asked for similar motion on the yellow Portofoliu
header. Adapted two ideas from it, in `css/site.css` and `work.html`'s
trailing `<script>`:

- **Cursor parallax**: the logo and the kicker/heading/text block now also
  drift a few pixels toward the mouse position on `mousemove` (merged into
  the same transform as the existing scroll-driven logo motion so the two
  never fight — one shared `state` object, re-rendered on a single
  `requestAnimationFrame`). Resets to center on `mouseleave`. No effect on
  touch devices (no mousemove events), so the scroll-only parallax already in
  place still covers mobile.
- **Animated wave divider**: three tiled, beige-colored SVG wave layers
  (`.work-header_wave-layer.is-back/.is-mid/.is-front`) sit along the bottom
  of the yellow header, each a different tile width/opacity/speed, drifting
  via pure CSS `background-position` keyframes (no JS, no scroll-jank risk).
  Eases the yellow header into the page's beige background below instead of
  a hard cut line. `.work-header_scroll-cue` nudged up to sit above the wave
  crest.

Verified live: mouse parallax shifts logo/text left/right correctly with
cursor position, wave renders and animates under the header, no console
errors, no change to `index.html`/`about.html` (only `work.html` and the new
CSS rules touched).

**Follow-up tweaks (same feature, client feedback):**
- Header made noticeably taller (`height: 70vh → 85vh`, `min-height: 26rem →
  34rem`, `max-height: 38rem → 48rem`; mobile: `50vh/20rem → 65vh/26rem`).
- Waves made ~3x bigger (client asked for "200% bigger"): `.work-header_waves`
  height `4.5rem → 13.5rem` (mobile `3rem → 9rem`), and each wave layer's
  tile width tripled (220/170/140px → 660/510/420px). The scroll-cue chevron
  was repositioned higher (`bottom: 3.5rem → 11.5rem`, mobile `2.25rem →
  7.75rem`) so it still sits above the now-much-taller wave crest instead of
  getting buried in it.
- Removed a persistent flat yellow line that showed up right at the seam
  between the header and the grid section below, on top of the wave (client
  called it out as "the straight line"). Root cause: a Chrome rendering
  quirk where a hairline fringe of the header's own yellow background paints
  through, right at its `overflow: hidden` clip edge, on top of the animated
  wave layers, likely tied to those layers' `background-position` animation
  running on a separately composited layer against a `vh`-based (subpixel)
  container height. Confirmed it was a real render artifact (not a
  screenshot/JPEG compression artifact) by temporarily swapping the header's
  background to a bright test color live in the browser and watching the
  line change color to match. Standard fixes (z-index alone, a dedicated
  cover element placed inside the same clipped header) didn't reach past the
  clip edge far enough to hide it. What worked, tuned by testing overlap
  amounts live until the line disappeared: `.section_work-header` gets a
  `margin-bottom: -20px` to pull the next section up over the seam, and
  `.section_work-grid` was given its own explicit opaque
  `background-color: var(--_colors---primary--beige)` plus
  `position: relative; z-index: 1` so it actually paints over (not just
  stacks above) the header in that 20px overlap band, since a transparent
  background wouldn't occlude anything regardless of z-index. Verified live
  afterward: clean gradient-free transition from wave to beige, grid/video
  cards unaffected, no console errors.
- Removed the Artis Band logo image from the header entirely (client wanted
  it gone). Deleted the `.work-header_bg`/`.work-header_logo` markup and CSS,
  and simplified the header's JS: the old IIFE handled both a scroll-driven
  logo fade/shrink and a cursor-driven parallax on the logo + content;
  without a logo, it's now just the cursor-driven parallax on the
  kicker/heading/text block (scroll listener removed, no longer needed).
  Header now reads as plain centered text (PORTOFOLIU / heading / subtext)
  over the yellow background and wave. Verified live, no console errors.
- Added a scroll-based parallax back onto the header content (client asked
  for it after the logo was removed): the kicker/heading/text now sinks
  down and fades out a little slower than the actual scroll speed as the
  header scrolls past, the classic "left behind" parallax feel, merged into
  the same transform/rAF loop as the existing cursor parallax so they don't
  fight. Dropped the CSS `transition` that used to ease the mouse-only
  effect, since scroll now updates the transform every frame already;
  keeping the transition on top made the content visibly rubber-band once
  scrolling stopped. Verified live: content visibly sinks/fades while
  scrolling past the header, no console errors.
- First attempt at layering the wave bands into the scroll parallax (client
  liked the depth effect in a mountain-range scroll scene they linked:
  https://codepen.io/creativeocean/pen/qBbBLyB) just nudged each band by
  8/16/26px over however long the header itself took to scroll past, only
  a fraction of a second of scroll, client correctly said they couldn't
  see any difference.
- **Redone properly**, matching the actual mechanic that pen uses: it pins
  the whole scene (`position: fixed`) while a tall spacer div forces ~200%
  of a viewport's worth of extra scroll underneath it, so the layered
  motion has a full screen of scroll distance to play out slowly, instead
  of just whatever height the section happens to be. Ported that mechanic
  with plain CSS `position: sticky` instead of GSAP/ScrollTrigger (no new
  dependency needed for this part): `work.html`'s header is now wrapped in
  `.work-header_pin-wrap` (`height: 200vh`, `160vh` on mobile), and
  `.section_work-header` inside it is `position: sticky; top: 0` so it
  stays pinned to the top of the viewport for that whole scroll range. The
  parallax JS (bottom of `work.html`) now measures progress across the
  wrapper's full scroll range (`0` when it starts pinning, `1` right
  before it unpins) rather than the header's own height, and the motion
  magnitudes were increased to match having real room to work with: text
  sinks/fades/scales down over the range, `.is-back` wave band drifts
  40px, `.is-mid` 90px, `.is-front` 150px, so the bands visibly separate
  from the text and from each other well before the header releases and
  the video grid scrolls up normally beneath it. The header/grid seam fix
  and its opaque-background/z-index mechanism on `.section_work-grid`
  didn't need to change, just moved from `.section_work-header`'s own
  margin onto `.work-header_pin-wrap`'s margin-bottom, since the wrapper
  is what now directly precedes the grid section in the document.
  Verified live scrolling through the full pin range in steps: header
  stays pinned, text visibly sinks/fades, wave bands visibly drift apart
  and separate, releases and grid section follows cleanly with no seam,
  no console errors. Note for future testing in this project: the local
  dev server's cached `site.css` served stale styles through a couple of
  plain reloads while testing this, had to cache-bust the stylesheet URL
  to see the real change, not a production concern (Cloudflare Pages
  serves each deploy fresh) but worth remembering if a CSS change doesn't
  seem to be taking effect locally.
- **Follow-up fixes after client review of the pinned parallax**, three
  issues plus one new feature:
  - The yellow seam line was back, and the wave pattern was visibly
    cropped/cut off partway through the scroll. Root cause of the crop:
    `.work-header_waves` (the wave layers' container) was only 13.5rem
    tall and had its own `overflow: hidden`, so once JS started
    translating the front layer down by up to 150px during the pin
    scroll, the container clipped off most of that layer's pattern
    instead of letting it just slide within the header. Fixed by setting
    `.work-header_waves` to `overflow: visible` - the outer
    `.section_work-header` still clips everything at its own edge
    (comfortably far away now that it's a full 100vh tall), so nothing
    escapes the yellow header, the inner box just doesn't crop the
    pattern short anymore. This also happened to resolve the seam line
    (the extra nested overflow:hidden was very likely contributing to
    the same compositing-fringe issue diagnosed earlier), reverified live
    after the fix: no seam anywhere across the full scroll range.
  - `.section_work-header`'s `max-height: 48rem` removed and `height`
    changed from `85vh`/`65vh` (mobile) to `100vh` everywhere, so the
    header is genuinely full screen instead of capped.
  - Added a second text block (`.work-header_content-alt`) that crossfades
    in as the intro text fades out, continuing the reveal instead of
    leaving a blank beat: kicker "PENTRU ORICE OCAZIE" / heading "Nunți,
    botezuri, petreceri private și evenimente corporate" / subtext
    "Adaptăm repertoriul și energia la fiecare tip de eveniment, de la
    momente intime la scene mari." Copy pulled from categories already
    used elsewhere on the site (index.html's meta description and event
    picker), not invented. Both text blocks are now absolutely positioned
    on top of each other (`inset: 0` + flex centering) inside the header
    instead of sitting side by side in the flex flow, so one fades out
    while the other fades in over the same spot. Same
    `requestAnimationFrame` loop as the rest of the header parallax: intro
    fades out by progress ~0.62, second text fades in from progress 0.5
    to 0.85 (a deliberate overlap so the crossfade doesn't have a gap),
    with the same small cursor-parallax drift applied to both.
  - Verified live: scrolled through the entire pin range again in steps,
    full-screen header confirmed, wave no longer crops and no seam
    reappears at any point, second text crossfades in cleanly and stays
    legible through to release, no console errors.
- **The seam line came back anyway** (client reported it very visible at
  the very start of the page, before any scrolling) - the previous fix's
  diagnosis was wrong. Debugged live by testing each suspect in isolation
  directly in the browser (disabling the wave's CSS drift animation,
  temporarily un-stickying the header, swapping the header's background
  to a bright test color): the line tracked the header's own background
  color every time, confirming it really was the header bleeding through,
  but neither the animation nor `position: sticky` were the cause (line
  persisted with both removed), so the "move overflow off the sticky
  element" theory was wrong and reverted. Root cause turned out to be
  simpler: `.work-header_waves`'s `bottom: -4px` (meant to overshoot the
  visible clip edge so the wave layer's rendered image safely overshoots
  it) wasn't nearly enough overshoot for these particular SVG
  background layers, confirmed by testing larger offsets live one at a
  time until the line disappeared completely at around -30px. Set to a
  generously safe `-48px` in the CSS. (The `.work-header_clip` inner-wrapper
  restructuring from the previous attempt was still kept, since giving
  clipping its own dedicated non-sticky element is good practice
  regardless and didn't hurt anything, it just wasn't the actual fix.)
  Verified live at scroll position 0 (where the client saw it), mid-scroll,
  and at full pin progress: no line at any point, wave still doesn't
  crop, release into the grid section still seamless, no console errors.
- **Full pivot: scrapped the hand-rolled version, rebuilt as an exact
  recreation of the client's reference CodePen instead** ("hai sa facem
  altfel, fa exact acelasi header de pe codepen, aceeasi poza, text, etc,
  si dupa editam pe baza lui" - do it differently, make the exact same
  CodePen header first, edit from there afterward). Every round above kept
  approximating the pen's look with hand-tuned CSS and kept producing
  subtle mismatches the client noticed but couldn't pin down ("not sure
  what changed, I can't see the difference"), so instead of continuing to
  guess, replaced the entire header (markup, CSS, JS) with the pen's actual
  structure and values, same mountain/sky/cloud imagery, same "EXPLORE" /
  "FURTHER" SVG mask text reveal, same GSAP timeline, as a known-good base
  to customize from next, rather than a fifth approximation.
  - Markup: `.work-hero_scene` now holds a single inline SVG
    (`.work-hero_svg`, `viewBox="0 0 1200 800"`) with the pen's layered
    `<image>` elements (sky, mountain background/midground/foreground,
    three cloud layers), an SVG `<mask>` whose mask image is a cloud shape
    that reveals "FURTHER" in dark navy as it's scrolled over the white
    "EXPLORE" text, and an invisible `<rect>` hit-target for the down arrow.
    Images are hotlinked directly from the pen's own asset CDN
    (`assets.codepen.io`) for now, this whole scene is explicitly temporary
    per the client's own instruction, so it wasn't worth spending time
    self-hosting copies of placeholder art that's getting replaced anyway.
  - Animation: replaced entirely with GSAP + ScrollTrigger (both already
    self-hosted in `js/gsap/` from earlier work, no new dependency), one
    `pin: true` timeline scrubbing each layer's `y` position at the pen's
    own rates. Only real change from the pen itself: the pen pins with
    plain `position: fixed` because its whole page is the hero (nothing to
    release into); this site has a navbar/footer/video grid around it, so
    it uses `ScrollTrigger`'s own `pin: true` instead, which pins for
    `+=100%` of extra scroll and then releases cleanly back into normal
    document flow on its own. This is also why the previous CSS
    `position: sticky` approach kept producing rendering seams (manual
    sticky + margin-overlap + opaque-background bookkeeping) and this one
    doesn't need any of that: ScrollTrigger handles the spacer and the
    fixed/relative toggling itself.
  - The arrow's hover-wiggle and click-to-scroll-one-viewport interactions
    were ported too. One substitution: the pen's click handler uses GSAP's
    `ScrollToPlugin`, which isn't self-hosted here (only `gsap.min.js`,
    `SplitText.min.js`, `ScrollTrigger.min.js` are); used the browser's
    native `window.scrollTo({ behavior: 'smooth' })` instead rather than
    pulling in another script for one small interaction.
  - CSS: replaced the entire old header rule block (pin-wrap, clip wrapper,
    both text blocks, scroll-cue, wave layers and their keyframes, the
    `.section_work-grid` seam-fix hack) with two small rules,
    `.work-hero_scene` (`height: 100vh`, `max-width: 1200px`, centered,
    `overflow: hidden`) and `.work-hero_svg` (fills it, sets the
    Montserrat-900 font used by the SVG text). The old seam-fix rule on
    `.section_work-grid` was deliberately dropped, ScrollTrigger's own
    pin/release doesn't reproduce that bug the way the manual sticky
    approach did (confirmed below).
  - Added Google Fonts `Montserrat:wght@900` (preconnect + stylesheet
    `<link>`s in `<head>`), matching the pen's own font, the only genuinely
    new external dependency introduced by this pivot, and only until the
    text itself is replaced with the client's own copy/branding.
  - Updated the mobile nav-clearance `:has()` selector from
    `.main-wrapper:has(.section_work-header)` to
    `.main-wrapper:has(.work-hero_scene)` to match the new class name (same
    "nav overlays the hero, don't add clearance padding" behavior as
    before).
  - **Verified live, full pass:** scroll position 0 shows the sky/mountain/
    cloud scene with white "EXPLORE" text and the down arrow, matching the
    pen; scrolling through the pinned range shows the layers animating at
    their configured independent rates (checked via `ScrollTrigger`'s own
    `progress` value alongside a visual check, not just eyeballing); at the
    end of the pin range the cloud-shaped mask fully reveals "FURTHER" in
    navy; releasing past the end of the pin scrolls the video grid section
    up cleanly with no seam or gap (confirming the dropped seam-fix hack
    wasn't needed); the arrow's hover wiggle (`translateY`) and click (smooth
    scroll one viewport down) both confirmed working via direct
    interaction; no console errors beyond pre-existing unrelated warnings
    elsewhere on the site. Mobile-width re-check wasn't possible live in
    this pass (the browser tool's resize didn't take effect in this
    session), but the whole scene is built on `vh`/`%`/SVG-viewBox scaling
    with no fixed-pixel breakpoint overrides, the same responsive approach
    already verified elsewhere on this site, so it should scale cleanly;
    worth a quick confirm on a real phone regardless.
  - **Next step, per the client's own stated plan ("dupa editam pe baza
    lui" - afterward we'll edit based on it):** this mountain scene is a
    known-good, temporary stand-in. Swap in Artis Band's own photo(s),
    replace "EXPLORE"/"FURTHER" with band-appropriate copy, and adjust the
    palette toward the site's yellow/beige branding, not yet requested, not
    started.
  - **That follow-up came in, in two parts.** First, "make it full width":
    `.work-hero_scene` had a `max-width: 1200px` carried over directly from
    the reference pen (its whole page is a fixed 1200px-wide demo box), which
    read as an odd letterboxed column with white bars on either side once
    dropped into this site's full-bleed layout. Removed the `max-width` and
    added `preserveAspectRatio="xMidYMid slice"` to the SVG (the default is
    `xMidYMid meet`, which fits the whole 1200x800 viewBox inside the box and
    pillarboxes/letterboxes whatever doesn't match the box's own aspect
    ratio, `slice` instead fills the box completely and crops whatever
    overflows, the standard trick for a true full-bleed background image).
    Verified live: scene now runs edge to edge at any viewport width, pin,
    scrub animation, mask reveal, and clean release into the grid section
    all reconfirmed unaffected by the width change.
  - **Second, and bigger: swap the mountain photo for a flat brand-yellow
    background, and swap "EXPLORE"/"FURTHER" for the site's own two-part
    copy, both text blocks centered horizontally and vertically.** This
    removes the reference's imagery entirely (no more sky/cloud/mountain
    `<image>` layers, no more SVG mask text-reveal, since masking only made
    sense with an actual cloud-shaped image to reveal through), so the SVG
    scene was rebuilt as plain HTML: `.work-hero_scene` now holds two
    `.work-hero_content` blocks (kicker + `<h2>` heading + subtext
    paragraph, absolutely positioned on top of each other via `inset: 0` +
    flex centering, exactly the "both blocks share one spot, only one is
    visible at a time" pattern used earlier for the wave-header's
    crossfade), plus a small standalone arrow button (a clean SVG chevron
    instead of the pen's oddly-shaped fill polyline, styled in black to
    read against the new yellow background instead of white against sky).
    Copy, first block: kicker "Portofoliu", heading "Priviți-ne pe scenă",
    subtext "O selecție cu cele mai recente momente live, direct de pe
    canalul nostru de YouTube." Second block (the client's own screenshot
    reference, reusing copy already written for the earlier wave-header
    attempt): kicker "Pentru orice ocazie", heading "Nunți, botezuri,
    petreceri private și evenimente corporate", subtext "Adaptăm
    repertoriul și energia la fiecare tip de eveniment, de la momente
    intime la scene mari." Typography reuses the site's existing design
    tokens rather than inventing new ones: kicker uses the same mono
    detail font/letter-spacing pattern as `.scroll-note_text` elsewhere on
    the site, heading uses the site's own h1 font family (Space Grotesk)
    at `--fixed--3-5rem` with the bold weight token, subtext follows the
    same size/weight as `.home-header_text`. The GSAP timeline (bottom of
    `work.html`) changed from moving image layers at different rates to
    simply crossfading the two content blocks (`autoAlpha` + a small `y`
    drift) over the same scrubbed pin range, same `pin: true` mechanic as
    before, unchanged. Arrow hover/click logic is untouched. Verified live:
    first block shows centered at scroll 0, crossfades into the second
    block by roughly halfway through the pin range, release into the grid
    section stays clean with no seam, arrow hover and click-to-scroll both
    still work, no console errors.
  - **Correction, same session: the three white cloud layers shouldn't have
    been removed.** Client clarified only the mountain/sky photo was meant
    to become a flat yellow background, the reference's cloud layers were
    supposed to stay, drifting over the yellow instead of over a sky photo.
    Added `cloud1.png`/`cloud2.png`/`cloud3.png` back in as plain `<img>`
    elements (same CodePen asset URLs as before) sitting behind the two
    text blocks (default DOM stacking order, no z-index juggling needed),
    each `object-fit: cover` so they fill the full-bleed scene at any
    viewport size, `pointer-events: none` so they never intercept the arrow
    button's hit area. Restored the three `fromTo` drift tweens in the GSAP
    timeline (`cloud1` y:100→-800, `cloud2` y:-150→-500, `cloud3` y:-50→-650,
    the reference's own values, unchanged) alongside the existing text
    crossfade, same scrubbed pin range. Double-checked these PNGs are
    genuinely transparent outside the cloud shapes (read actual pixel alpha
    via a canvas, not just eyeballing, a background-area pixel came back
    alpha 0) before ruling out a repeat of the earlier seam-artifact bug:
    translating a layer with a real transparent background just reveals the
    scene's own solid yellow underneath, an exact color match, so there's
    nothing for a seam to show up against, unlike the original mountain
    scene's issue, which was a compositing quirk between clipped nested
    elements, not a background-color mismatch. Verified live at scroll 0,
    mid-scroll, and after release: clouds drift and both text blocks stay
    legible over the mix of yellow and white cloud, no hard rectangular
    edges anywhere in the cloud layers, no seam at release, no console
    errors.
  - **Follow-up, same session: the clouds needed to actually resolve into a
    white background before the second text appears, not just clip at the
    section's edge.** Client feedback in Romanian: "cand norii trec peste
    primul text, trebuie sa dispara si sa apara urmatorul text... urmatorul
    text va aparea pe fundal alb, ca norii, altfel norii se vad clipped
    acum" (when the clouds pass over the first text, it should disappear
    and the next text should appear; the next text should appear on a white
    background, like the clouds, otherwise the clouds look clipped right
    now). This is functionally the same beat the reference pen's own
    cloud-shaped SVG mask was built for (the "EXPLORE"→"FURTHER" reveal
    there is really "a cloud shape sweeps through and uncovers a white
    panel with the next line of text on it"), just needed re-implementing
    for HTML content instead of SVG text. Added a plain white panel
    (`.work-hero_whiteout`, a full-bleed absolutely positioned div, hidden
    by default same as the second text block) sitting in the DOM between
    the two text blocks, so it stacks above the clouds and the first text
    but below the second. Retimed the GSAP timeline: clouds still drift 0
    to 0.5 unchanged, first text now fades out faster and earlier (0.05 to
    0.35, was 0.3 to 0.8) so it's out of the way before the whiteout takes
    over, the whiteout itself fades in from 0.25 to 0.55 (right as the
    clouds are mid-drift and the first text is finishing its fade), and the
    second text fades in afterward, 0.5 to 0.85, now visibly sitting on a
    solid white background rather than yellow. Verified live at several
    scroll depths: scroll 0 shows yellow + clouds + first text as before;
    partway through, the first text has faded and the scene is visibly
    whiting out through the drifting clouds; further in, the second text
    fades in fully legible on a plain white background; releasing past the
    pin still drops cleanly into the grid section with no seam; no console
    errors at any point.
  - **Follow-up, same session: the clouds themselves looked cut off rather
    than blending.** Client sent a screenshot showing a visible hard
    rectangular line where each cloud layer ended, instead of a soft fade
    into the yellow/white behind it. Root cause: `object-fit: cover` was
    cropping each cloud photo to fill a much taller/wider box than its
    native 1200x800, and the source images aren't padded with a
    transparent margin around the cloud shapes, so the crop (and the
    scroll-driven `translateY`) could slice straight through a cloud
    mid-shape rather than through already-transparent space, showing a hard
    edge instead of a fade. Fixed with a CSS mask-image gradient on all
    three cloud layers (`transparent → opaque` over the first 18% of the
    element's height, `opaque → transparent` over the last 18%), which
    fades each layer's own top and bottom edge to nothing regardless of
    where the crop or the translation happens to land, so the visible
    boundary always melts into the background color behind it instead of
    cutting off. Verified live at several scroll depths, including right at
    the point in the earlier screenshot that showed the worst clipping: no
    hard edges anywhere in the cloud layers now, still no seam at release,
    no console errors.
  - **Follow-up, same session: swapped clouds for stage-light glows.**
    Client asked for something more music/concert-related than clouds.
    Replaced the three cloud `<img>` layers entirely with three plain CSS
    radial-gradient glow blobs (`.work-hero_light.is-1/.is-2/.is-3`, circles
    with a heavy `filter: blur(70px)`, no hotlinked image at all anymore),
    reusing the exact same GSAP drift values that used to move the cloud
    photos (`is-1` y:100→-800, `is-2` y:-150→-500, `is-3` y:-50→-650), so
    the same layered depth/timing carries over even though the visual is
    completely different. Two glows are soft white (simulating stage
    spotlights), one is a subtle dark glow for a bit of depth/contrast. This
    also incidentally removes the last hotlinked CodePen asset from this
    scene and the crop-edge problem entirely, a blurred gradient has no
    hard boundary to crop through in the first place, so there was nothing
    left to fix there. Verified live at scroll 0, mid-scroll (glow drifting,
    no hard edges), after the whiteout/second-text transition, and after
    release into the grid section: all clean, no console errors.
  - **Follow-up, same session: added a fourth, yellow-tinted glow that
    fades in exactly when the white panel does.** Client asked for "o
    lumina galbena atunci cand vine fundalul alb" (a yellow light when the
    white background arrives), so the scene turning white doesn't read as
    plain/sterile. Added `.work-hero_light.is-4`, same blurred-circle
    technique as the other three glows but positioned above the white panel
    in the DOM (rather than behind it, where the other three sit) so it's
    actually visible once the background goes white, and faded in on the
    exact same GSAP timeline position/duration as `.work-hero_whiteout`
    (0.25 to 0.55) so the two appear together. Verified live: yellow glow
    is invisible at scroll 0 (hidden by default, matching the whiteout
    panel's own default-hidden state), becomes visible partway through the
    transition as the background lightens, and sits clearly over the white
    background alongside the second text by the time the pin range ends.
  - **Follow-up, same session: split the one big centered yellow glow into
    2-3 smaller scattered ones.** Client clarified they expected multiple
    yellow lights, not a single large one dead center. Replaced
    `.work-hero_light.is-4` (one 30rem glow, centered) with three smaller
    glows scattered around the frame instead: `is-4` (20rem, upper-left),
    `is-5` (26rem, lower-right), `is-6` (16rem, a smaller accent left of
    center), same yellow tint and blur technique as before, all still
    sitting above the white panel so they stay visible once the background
    turns white. Faded in with a quick stagger (0.25, 0.32, 0.39 in the
    timeline, 0.3s duration each) instead of all appearing at once, so it
    reads a bit like individual lights coming on rather than one big glow
    fading in. Verified live: three distinct yellow glows visible at
    different points in the frame once the white panel takes over, both
    text blocks still fully legible over them, no console errors.

---

## Follow-up: WhatsApp number corrected

The number wired into `WHATSAPP_NUMBER` (`index.html`, `about.html`, `work.html`) was
`40728314158`, left over from an earlier round and never actually the client's own
number. Client asked to switch it to match the real contact number already shown in
the footer, `0740326997`, converted to the international format `wa.me` expects
(country code `40`, no leading `0`): `40740326997`. Updated in all three files,
confirmed via a live page read (`WHATSAPP_NUMBER` value read directly out of the
loaded page's own scripts, not just the source diff) that the new number is what
actually gets used at runtime. The footer's `tel:`/display number was already correct
and untouched.

---

## Git repo initialized, pushed toward the client's own GitHub

Client asked to deploy everything to their own git remote,
`https://github.com/tdrobota/Artisband.git`. Initialized a git repository, committed
all files (site + assets), and set that URL as `origin`. Pushing itself needs the
client's own GitHub credentials, which isn't something to handle on their behalf, so
the actual `git push` has to be run from their own machine (their project folder
already has the commit ready to go, they just need `git push -u origin main`, using
whatever GitHub auth - token, SSH key, GitHub Desktop, etc. - they already have set up
locally).

### Video compressed before the first push: `ab-video_mp4.mp4`, 77MB → ~22MB

While preparing the repo, noticed `videos/ab-video_mp4.mp4` (the CTA section's
CSS-blurred background video) was 77MB, close enough to GitHub's 100MB hard limit to
be worth shrinking before it ever landed in git history (an earlier round of this
project had gotten this same file down to 6.1MB, see "Performance" near the top of
this document, so at some point after that it was replaced with a fresh, higher-quality
77MB upload, that older "~28MB total site size" figure is stale because of this).
Client asked to get it down to ~24MB specifically.

Re-encoded with `ffmpeg`/`libx264` at a targeted ~640kbps (this video has no audio
track, so the whole bitrate budget goes to video), same resolution (1280x512) and
duration (4:48) as the original, `veryfast` preset. Had to split the encode into two
~144-second chunks and concatenate them afterward (lossless stream-copy concat, no
quality loss from the split itself) purely because of this environment's per-command
time limit, a single-pass encode of the full 4:48 clip doesn't fit in that window.
Result: 22.77MB, comfortably under the 24MB ask and GitHub's limit, same
duration/resolution/codec confirmed via `ffprobe`, and a spot-checked frame still
reads clearly (this video sits behind a 20px CSS blur on the actual page anyway, so
compression artifacts that might show up in a raw frame grab are invisible in the
deployed page). Folded the compressed version into the initial commit (rather than
adding it as a second commit) so the client's very first push doesn't carry the
original 77MB blob in git history alongside the smaller replacement, history that a
git repo normally keeps forever once pushed.

Current working-tree size after this swap: roughly 51MB (excluding `.git`), down from
~106MB before the video was recompressed.

---

## Still open / needs a decision from the client (not blocking, but flag it)

- Blocking already-booked dates in the date picker, deprioritized to a follow-up
  phase, see note above.

---

## Quick reference

- **Domain:** artisband.ro (canonical, no www)
- **Host:** Cloudflare Pages
- **Repo:** created and committed locally, `origin` set to
  `https://github.com/tdrobota/Artisband.git` — the client's own `git push` from their
  machine is the one remaining step (their credentials, not handled here).
- **Current site size:** ~51MB (working tree, excluding `.git`)
- **Language:** Romanian (`lang="ro"`)
- **Contact/booking form:** WhatsApp-based (`wa.me` link), no backend. Real number
  (`40740326997`) is set in the form handler on all three pages, matching the footer's
  contact number below.
- **Direct contact (footer):** phone `0740 326 997` (`tel:0740326997`), email
  `contact@artisband.ro` (`mailto:`).
- **Social links (real profiles):** `instagram.com/artisband`,
  `youtube.com/@artisbandsv2086`, `facebook.com/artisbandsv`.
