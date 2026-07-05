// Cloudflare Pages Function: POST /api/contact
//
// PAUSED as of 2026-07: the WhatsApp/Email toggle that used to call this
// is now force-hidden via CSS (see the ".contact-method-toggle ... {
// display: none !important; }" override in css/site.css) because sends
// kept failing after RESEND_API_KEY + domain verification were both set
// up correctly, and the Resend error wasn't clear enough to debug on the
// spot. Nothing currently reaches this endpoint through the UI -- the
// form is WhatsApp-only again, with a plain mailto link (.form-note in
// the HTML) as the alternative. This file is left in place so re-
// enabling later is just: undo that CSS override, then dig into why
// Resend was rejecting the send (see git history around this date for
// the last known error: {"ok":false,"error":"send_failed"}, HTTP 502,
// i.e. Resend's own API call was non-ok even with a verified domain and
// a valid key -- worth checking the "from" address format, API key
// permissions/domain scoping, and Resend's dashboard logs directly).
//
// Only reached from the "Email" side of the WhatsApp/Email toggle (see
// .contact-method-toggle in css/site.css and bindBookingForm in
// js/booking-index.js / booking-about.js / booking-work.js) -- WhatsApp
// submissions never hit a server at all, they just open a wa.me link.
// This function exists specifically for the desktop-only email option,
// since a laptop visitor without WhatsApp Web already linked has no way
// to actually send that message.
//
// Sends the booking request as an email via Resend (https://resend.com).
// Required one-time setup on the Cloudflare Pages project, none of which
// can be done from inside this codebase:
//   1. Create a Resend account (or reuse the one from this project's
//      earlier email-based version, if it still exists).
//   2. Verify a sending domain in Resend (e.g. artisband.ro, or a
//      subdomain like mail.artisband.ro) by adding the DNS records Resend
//      provides -- required to send FROM an artisband.ro address instead
//      of Resend's shared onboarding@resend.dev sender.
//   3. Create a Resend API key.
//   4. In the Cloudflare dashboard: Workers & Pages -> this project ->
//      Settings -> Environment variables -> add RESEND_API_KEY (as a
//      Secret, not a plain text variable) for the Production environment.
//   5. Redeploy (or the next deploy just picks it up) once the variable
//      is set.
//
// No Turnstile/honeypot/rate-limiting here -- this project deliberately
// walked away from that complexity once before (see
// artis-band-project-handoff.md). Worth revisiting if spam becomes a real
// problem, but starting simple on purpose.

const FROM_ADDRESS = 'Artis Band <contact@artisband.ro>';
const TO_ADDRESS = 'contact@artisband.ro';

const EVENT_TYPE_LABELS = {
  Nunta: 'Nuntă',
  Botez: 'Botez',
  'Alt-eveniment': 'Alt eveniment'
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }

  const name = (payload.name || '').toString().trim().slice(0, 256);
  const eventTypeRaw = (payload.eventType || '').toString().trim();
  const eventDate = (payload.eventDate || '').toString().trim().slice(0, 64);
  const city = (payload.city || '').toString().trim().slice(0, 256);
  const venue = (payload.venue || '').toString().trim().slice(0, 256);
  const senderEmail = (payload.senderEmail || '').toString().trim().slice(0, 256);

  if (!eventTypeRaw || !eventDate || !city || !venue || !senderEmail) {
    return jsonResponse({ ok: false, error: 'missing_fields' }, 400);
  }
  if (!EMAIL_PATTERN.test(senderEmail)) {
    return jsonResponse({ ok: false, error: 'invalid_email' }, 400);
  }

  // booking-*.js already translates the eventType value to its Romanian
  // label client-side before this fetch, but re-map defensively here too
  // in case this endpoint is ever called directly with the raw value.
  const eventType = EVENT_TYPE_LABELS[eventTypeRaw] || eventTypeRaw;

  if (!env.RESEND_API_KEY) {
    // Fails loudly in the response (not just a silent 500) so this is
    // easy to diagnose the first time email is tried after deploying --
    // see the setup steps in the file comment above.
    console.error('[api/contact] RESEND_API_KEY is not set');
    return jsonResponse({ ok: false, error: 'email_not_configured' }, 500);
  }

  const subject = 'Cerere rezervare: ' + eventType + ' - ' + city;
  const textBody = [
    'Cerere noua de rezervare de pe artisband.ro (optiunea Email).',
    '',
    'Nume: ' + (name || '(nespecificat)'),
    'Tip eveniment: ' + eventType,
    'Data: ' + eventDate,
    'Orasul: ' + city,
    'Locatia: ' + venue,
    'Email vizitator: ' + senderEmail
  ].join('\n');

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [TO_ADDRESS],
        reply_to: senderEmail,
        subject: subject,
        text: textBody
      })
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text().catch(function () { return ''; });
      console.error('[api/contact] Resend request failed', resendResponse.status, errorBody);
      return jsonResponse({ ok: false, error: 'send_failed' }, 502);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('[api/contact]', err);
    return jsonResponse({ ok: false, error: 'server_error' }, 500);
  }
}

// Any method other than POST/OPTIONS gets Cloudflare Pages' default 405,
// since only onRequestPost is exported.
export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
