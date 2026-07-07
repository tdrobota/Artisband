// Booking popup form (#popup-booking-form, custom calendar). Offers two
// contact methods:
//   - WhatsApp (default, and the ONLY option on phones): build a pre-filled
//     message and open wa.me with it. No backend, the visitor still has to
//     press "Send" inside WhatsApp themselves, which is also what keeps it
//     naturally spam-resistant without Turnstile/honeypot/server validation.
//   - Email (desktop/laptop only, see .contact-method-toggle in site.css,
//     hidden below 992px): WhatsApp on a laptop means the visitor needs
//     WhatsApp Web already linked, which is friction email doesn't have.
//     POSTs to /api/contact (functions/api/contact.js), a real Cloudflare
//     Pages Function that emails the booking request via Resend -- this
//     DOES need a real backend, unlike the WhatsApp path, so it also needs
//     RESEND_API_KEY set as an environment variable on the Cloudflare Pages
//     project (see artis-band-project-handoff.md for setup steps).
//
// This used to live inline in work.html's <body>, but the site's CSP
// (script-src 'self', no unsafe-inline) silently blocks inline <script>
// tags from executing at all: on the deployed Cloudflare Pages site this
// meant the WhatsApp button, the booking calendar, the video lightbox and
// the pinned hero scene never ran. Moving this to an external, same-origin
// file keeps CSP strict while letting the code actually run.
(function () {
  // Each of this file's independent setup blocks is wrapped in its own
  // try/catch so a failure in one (whatever it turns out to be) can't
  // cascade and silently kill the others, and any real error now gets
  // logged with enough context to identify which block and why.
  try {
  var WHATSAPP_NUMBER = '40740326997';
  var CONTACT_API_URL = '/api/contact';

  var eventTypeLabels = {
    Nunta: 'Nuntă',
    Botez: 'Botez',
    'Alt-eveniment': 'Alt eveniment'
  };

  function formatDate(isoDate) {
    var parts = isoDate.split('-'); // yyyy-mm-dd
    return parts.length === 3 ? (parts[2] + '.' + parts[1] + '.' + parts[0]) : isoDate;
  }

  // Copy + submit-button appearance for each contact method. Keeping both
  // sets of copy here (rather than only swapping the submit button) means
  // the fail/done messages always describe whichever method is currently
  // selected, not whichever one happened to be selected when the page
  // first loaded.
  var METHOD_COPY = {
    whatsapp: {
      submitLabel: 'Trimite pe WhatsApp',
      submitIcon: 'images/whatsapp-icon-dark.svg',
      done: 'Se deschide WhatsApp cu mesajul completat, apasă „Trimite" acolo ca să ajungă la noi.',
      fail: 'Te rugăm să completezi toate câmpurile, tipul evenimentului și data.'
    },
    email: {
      submitLabel: 'Trimite pe Email',
      submitIcon: 'images/email-icon-dark.svg',
      done: 'Mulțumim! Cererea a fost trimisă pe email, revenim cât mai curând cu disponibilitatea.',
      fail: 'Te rugăm să completezi toate câmpurile, inclusiv adresa ta de email.',
      // Distinct from `fail` above on purpose: `fail` is shown when the
      // form itself is incomplete/invalid (client-side, before any
      // request is sent). This one is shown when everything the visitor
      // typed was valid but the actual send attempt failed server-side
      // (e.g. RESEND_API_KEY not configured yet, or a network hiccup) --
      // reusing the "please fill in your fields" copy for that case was
      // confusing a visitor who'd already filled everything in correctly.
      sendFail: 'Nu am putut trimite emailul acum. Încearcă din nou sau scrie-ne pe WhatsApp.'
    }
  };

  function bindBookingForm(form) {
    if (!form) return;

    var wrap = form.closest('.form-wrap') || form.parentElement;
    var doneMsg = wrap.querySelector('[data-booking-done]');
    var failMsg = wrap.querySelector('[data-booking-fail]');
    var doneText = doneMsg ? doneMsg.querySelector('[data-booking-done-text]') : null;
    var failText = failMsg ? failMsg.querySelector('[data-booking-fail-text]') : null;

    // The submit button lives INSIDE <form> on the CTA section, but
    // OUTSIDE it (associated via form="...") on the popup, where it needs
    // to sit in its own grid column next to the calendar -- so it can't
    // always be found as a descendant of either the form or wrap. Falling
    // back to a document-wide lookup keyed on the same form id covers
    // both cases.
    var submitButton = form.querySelector('[data-submit-button]') ||
      (form.id && document.querySelector('[data-submit-button][form="' + form.id + '"]'));
    var submitText = submitButton ? submitButton.querySelector('[data-submit-text]') : null;
    var submitIcon = submitButton ? submitButton.querySelector('[data-submit-icon]') : null;

    var toggle = form.querySelector('[data-contact-method-toggle]');
    var emailField = form.querySelector('[data-contact-email-field]');
    var emailInput = emailField ? emailField.querySelector('input') : null;

    function currentMethod() {
      if (!toggle) return 'whatsapp';
      var checked = toggle.querySelector('input[name="contactMethod"]:checked');
      return checked ? checked.value : 'whatsapp';
    }

    function applyMethod(method) {
      var copy = METHOD_COPY[method] || METHOD_COPY.whatsapp;
      if (submitText) submitText.textContent = copy.submitLabel;
      if (submitIcon) submitIcon.setAttribute('src', copy.submitIcon);
      if (doneText) doneText.textContent = copy.done;
      if (failText) failText.textContent = copy.fail;
      if (emailField) {
        var showEmail = method === 'email';
        emailField.hidden = !showEmail;
        if (emailInput) emailInput.required = showEmail;
      }
    }

    if (toggle) {
      toggle.addEventListener('change', function (e) {
        if (e.target && e.target.name === 'contactMethod') applyMethod(e.target.value);
      });
      applyMethod(currentMethod());
    }

    function submitViaEmail(payload) {
      if (submitButton) submitButton.disabled = true;
      fetch(CONTACT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('request_failed');
        return res.json().catch(function () { return {}; });
      }).then(function (data) {
        if (data && data.ok === false) throw new Error(data.error || 'send_failed');
        if (doneMsg) doneMsg.style.display = 'block';
      }).catch(function (err) {
        console.error('[artis:contact-email]', err);
        // Server/network failure, not a validation one -- swap in the
        // send-specific copy so the message matches what actually went
        // wrong (see the `sendFail` comment on METHOD_COPY.email above).
        if (failText) failText.textContent = METHOD_COPY.email.sendFail;
        if (failMsg) failMsg.style.display = 'block';
      }).finally(function () {
        if (submitButton) submitButton.disabled = false;
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (doneMsg) doneMsg.style.display = 'none';
      if (failMsg) failMsg.style.display = 'none';

      var copy = METHOD_COPY[currentMethod()] || METHOD_COPY.whatsapp;

      // Native validation (required/type="email") also covers the
      // conditionally-required email field above, since applyMethod()
      // toggles its required attribute to match the selected method.
      if (!form.checkValidity()) {
        form.reportValidity();
        // Explicit, rather than relying on whatever applyMethod() last
        // set failText to -- guarantees this is the validation-failure
        // copy even if submitViaEmail's sendFail message was the last
        // thing shown here.
        if (failText) failText.textContent = copy.fail;
        if (failMsg) failMsg.style.display = 'block';
        return;
      }

      var method = currentMethod();
      var formData = new FormData(form);
      var name = (formData.get('name') || '').toString().trim();
      var eventType = formData.get('eventType');
      var eventDate = formData.get('eventDate');
      var city = (formData.get('city') || '').toString().trim();
      var venue = (formData.get('venue') || '').toString().trim();

      if (method === 'email') {
        submitViaEmail({
          name: name,
          eventType: eventTypeLabels[eventType] || eventType,
          eventDate: formatDate(eventDate),
          city: city,
          venue: venue,
          senderEmail: (formData.get('senderEmail') || '').toString().trim()
        });
        return;
      }

      var messageLines = [
        'Salut! Aș vrea să rezerv Artis Band pentru un eveniment.',
        '',
        'Nume: ' + (name || '(nespecificat)'),
        'Tip eveniment: ' + (eventTypeLabels[eventType] || eventType),
        'Data: ' + formatDate(eventDate),
        'Orașul: ' + city,
        'Locația: ' + venue
      ];

      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(messageLines.join('\n'));

      if (doneMsg) doneMsg.style.display = 'block';
      window.open(url, '_blank', 'noopener');
    });
  }

  bindBookingForm(document.getElementById('popup-booking-form'));
  } catch (err) {
    console.error('[artis:cta-booking-form]', err);
  }
})();

// Booking popup: open/close, plus the custom calendar (calendar on the
// right, form fields on the left) that fills the popup form's hidden
// eventDate field.
(function () {
  try {
  var modal = document.getElementById('booking-modal');
  if (!modal) return;

  function formatDate(isoDate) {
    var parts = isoDate.split('-'); // yyyy-mm-dd
    return parts.length === 3 ? (parts[2] + '.' + parts[1] + '.' + parts[0]) : isoDate;
  }

  var openTriggers = document.querySelectorAll('[data-open-booking]');
  var closeTriggers = modal.querySelectorAll('[data-modal-close]');
  var dialog = modal.querySelector('.booking-modal_dialog');

  function openModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var firstField = document.getElementById('popup-name');
    if (firstField) firstField.focus({ preventScroll: true });
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  openTriggers.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
  });

  closeTriggers.forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  if (dialog) {
    dialog.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  // Calendar.
  var monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

  var monthLabel = modal.querySelector('[data-cal-month]');
  var daysWrap = modal.querySelector('[data-cal-days]');
  var prevBtn = modal.querySelector('[data-cal-prev]');
  var nextBtn = modal.querySelector('[data-cal-next]');
  var selectedLabel = modal.querySelector('[data-cal-selected]');
  var hiddenDateInput = document.getElementById('popup-event-date');

  if (!monthLabel || !daysWrap) return;

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var view = { year: today.getFullYear(), month: today.getMonth() };
  var selectedIso = null;

  function isSameMonth(a, b) {
    return a.year === b.year && a.month === b.month;
  }

  function renderCalendar() {
    monthLabel.textContent = monthNames[view.month] + ' ' + view.year;
    prevBtn.disabled = isSameMonth(view, { year: today.getFullYear(), month: today.getMonth() });

    daysWrap.innerHTML = '';

    var firstOfMonth = new Date(view.year, view.month, 1);
    var offset = (firstOfMonth.getDay() + 6) % 7; // Monday-first offset.
    var daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

    for (var i = 0; i < offset; i++) {
      var blank = document.createElement('div');
      blank.className = 'booking-calendar_day-empty';
      daysWrap.appendChild(blank);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var cellDate = new Date(view.year, view.month, d);
      var iso = cellDate.getFullYear() + '-' +
        String(cellDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(d).padStart(2, '0');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-calendar_day';
      btn.textContent = d;
      btn.setAttribute('data-date', iso);

      if (cellDate < today) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', function () {
          selectedIso = this.getAttribute('data-date');
          if (hiddenDateInput) hiddenDateInput.value = selectedIso;
          daysWrap.querySelectorAll('.booking-calendar_day.is-selected').forEach(function (el) {
            el.classList.remove('is-selected');
          });
          this.classList.add('is-selected');
          if (selectedLabel) selectedLabel.textContent = 'Data aleasă: ' + formatDate(selectedIso);
        });
      }

      if (selectedIso === iso) btn.classList.add('is-selected');

      daysWrap.appendChild(btn);
    }
  }

  prevBtn.addEventListener('click', function () {
    view.month -= 1;
    if (view.month < 0) {
      view.month = 11;
      view.year -= 1;
    }
    renderCalendar();
  });

  nextBtn.addEventListener('click', function () {
    view.month += 1;
    if (view.month > 11) {
      view.month = 0;
      view.year += 1;
    }
    renderCalendar();
  });

  renderCalendar();
  } catch (err) {
    console.error('[artis:booking-popup-calendar]', err);
  }
})();

// Floating WhatsApp button: normally fixed to the bottom right corner, but
// docks in place just above the footer once scrolling reaches it, instead
// of floating over the footer's own content for the rest of the scroll.
(function () {
  try {
  var btn = document.querySelector('.whatsapp-float');
  var footer = document.querySelector('.footer');
  if (!btn || !footer) return;

  var GAP = 16; // breathing room above the footer, in px.
  var docked = false;

  function update() {
    var footerTop = footer.getBoundingClientRect().top;
    var reserved = btn.offsetHeight + GAP;

    if (footerTop <= window.innerHeight - reserved) {
      var footerDocTop = footerTop + window.scrollY;
      btn.style.position = 'absolute';
      btn.style.bottom = 'auto';
      btn.style.top = (footerDocTop - btn.offsetHeight - GAP) + 'px';
      docked = true;
    } else if (docked) {
      btn.style.position = '';
      btn.style.top = '';
      btn.style.bottom = '';
      docked = false;
    }
  }

  var ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
  } catch (err) {
    console.error('[artis:whatsapp-dock]', err);
  }
})();

// Video showcase: clicking a card opens the lightbox with a playing
// (autoplay) YouTube embed built from the card's data-video-id. Building
// the iframe fresh on open (and destroying it on close) is what actually
// stops the video, simply hiding the modal would leave it playing
// silently in the background.
(function () {
  try {
  var modal = document.getElementById('video-modal');
  if (!modal) return;

  var frameWrap = modal.querySelector('[data-video-frame-wrap]');
  var suggestionsWrap = modal.querySelector('[data-video-suggestions]');
  var closeTriggers = modal.querySelectorAll('[data-video-modal-close]');
  var dialog = modal.querySelector('.video-modal_dialog');
  var cards = document.querySelectorAll('.work_card');

  // Video list used to build our own "suggested videos" strip inside the
  // modal -- see the note by the iframe src below for why this replaces
  // YouTube's built-in suggestions instead of just letting those through.
  // Starts from this page's own cards (id/title), then adds a few more
  // channel videos that aren't shown as cards in the main grid -- kept out
  // of the grid on purpose (keeps it to the original 6), but still worth
  // surfacing once someone's already watching a video.
  var videoList = [];
  cards.forEach(function (card) {
    var id = card.getAttribute('data-video-id');
    if (!id) return;
    var titleEl = card.querySelector('.work_card-title');
    videoList.push({
      id: id,
      title: titleEl ? titleEl.textContent : '',
    });
  });
  [
    { id: 'z6lBwGKD7yo', title: 'Playing with Fire (cover Ovi & Paula Seling) - live la Voci de Îngeri' },
    { id: 'AoelJ_zPxq0', title: 'A Sky Full of Stars (cover Coldplay) - live la Voci de Îngeri' },
    { id: 'Y4uz9warBCo', title: 'Lose Control (cover Teddy Swims) - live la Voci de Îngeri' },
    { id: 'nrZ8yjcl4Q4', title: 'Shallow (cover Lady Gaga & Bradley Cooper)' },
    { id: 'CNEdL2IYdmk', title: 'Mai Frumoasă (cover Laura Stoica)' },
  ].forEach(function (video) {
    videoList.push(video);
  });

  function renderSuggestions(currentId) {
    if (!suggestionsWrap) return;
    suggestionsWrap.innerHTML = '';
    videoList.forEach(function (video) {
      if (video.id === currentId) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'video-modal_suggestion';
      btn.innerHTML =
        '<img class="video-modal_suggestion-thumb" src="https://i.ytimg.com/vi/' + video.id + '/mqdefault.jpg" alt="" loading="lazy">' +
        '<span class="video-modal_suggestion-title">' + video.title + '</span>';
      btn.addEventListener('click', function () {
        openVideo(video.id);
      });
      suggestionsWrap.appendChild(btn);
    });
  }

  function openVideo(id) {
    // referrerpolicy is required here: YouTube's embedded player now
    // rejects loads that arrive without a proper referrer/origin header
    // (surfaces to viewers as "Error 153: Video player configuration
    // error"). Browsers can otherwise omit or strip that header for a
    // cross-origin iframe depending on the page/browser's own referrer
    // policy, so it's set explicitly rather than left to the default.
    //
    // iv_load_policy=3 turns off the clickable mid-video "card" annotations,
    // modestbranding=1 trims the YouTube logo from the control bar, and
    // loop=1 + playlist=<same id> makes the video loop itself instead of
    // ending into YouTube's own "related videos" end screen. Between the
    // three, YouTube's native suggestion surfaces are suppressed as far as
    // the embed API allows -- our own suggestions strip (below) replaces
    // that function instead, since clicks on YouTube's native suggestions
    // can't be kept in-page (cross-origin iframe, see note above openVideo).
    frameWrap.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
      '?autoplay=1&rel=0&iv_load_policy=3&modestbranding=1&loop=1&playlist=' + id +
      '" title="Artis Band video" frameborder="0" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
    renderSuggestions(id);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeVideo() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    frameWrap.innerHTML = '';
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      var id = card.getAttribute('data-video-id');
      if (id) openVideo(id);
    });
  });

  closeTriggers.forEach(function (el) {
    el.addEventListener('click', closeVideo);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeVideo();
  });

  if (dialog) {
    dialog.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }
  } catch (err) {
    console.error('[artis:video-lightbox]', err);
  }
})();

// Pinned scroll scene, same pin mechanic as the client's original
// reference (https://codepen.io/creativeocean/pen/qBbBLyB): the
// sky/mountain photo layers are gone (swapped for a flat yellow
// background, see the CSS), and the three cloud photo layers have been
// swapped for three CSS stage-light glows (client asked for something
// more music-related than clouds), still drifting at the same
// independent rates as the reference's own timeline, just moving glow
// blobs instead of cloud images now. Client feedback on an earlier
// pass: the clouds just clipping at the section's edge while both
// texts sat directly on yellow looked unfinished, they wanted whatever
// drifts through to actually resolve into a white background before
// the second piece of copy appears on it (closer to how the
// reference's own cloud-mask trick worked). So this timeline layers
// three things: light drift (same values as the old cloud drift), the
// first text fading out as the lights sweep through, a plain white
// panel (.work-hero_whiteout) fading in right behind it, and only then
// the second text fading in on top of that now-white panel. Pin still
// uses ScrollTrigger's own pin:true rather than the reference's plain
// position:fixed, since we have a navbar, footer and video grid around
// this scene (nothing to release into on the original, which is why it
// could get away with plain fixed positioning).
function initHeroScene() {
  if (window.__heroSceneInit || !(window.gsap && window.ScrollTrigger)) return;
  window.__heroSceneInit = true;

  try {
  gsap.registerPlugin(ScrollTrigger);

  gsap
    .timeline({
      scrollTrigger: {
        trigger: '.work-hero_scene',
        start: 'top top',
        end: '+=100%',
        scrub: 1,
        pin: true,
      }
    })
    .fromTo('.work-hero_light.is-1', { y: 100 }, { y: -800, duration: 0.5 }, 0)
    .fromTo('.work-hero_light.is-2', { y: -150 }, { y: -500, duration: 0.5 }, 0)
    .fromTo('.work-hero_light.is-3', { y: -50 }, { y: -650, duration: 0.5 }, 0)
    .to('.work-hero_content.is-1', { autoAlpha: 0, y: -40, duration: 0.3 }, 0.05)
    .fromTo(
      '.work-hero_whiteout',
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.3 },
      0.25
    )
    .fromTo(
      '.work-hero_light.is-4',
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.3 },
      0.25
    )
    .fromTo(
      '.work-hero_light.is-5',
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.3 },
      0.32
    )
    .fromTo(
      '.work-hero_light.is-6',
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.3 },
      0.39
    )
    .fromTo(
      '.work-hero_content.is-2',
      { autoAlpha: 0, y: 40 },
      { autoAlpha: 1, y: 0, duration: 0.35 },
      0.5
    );

  ScrollTrigger.refresh();

  var heroArrowBtn = document.querySelector('#work-hero-arrow-btn');
  if (heroArrowBtn) {
    heroArrowBtn.addEventListener('mouseenter', function () {
      gsap.to('.work-hero_arrow', { y: 10, duration: 0.8, ease: 'back.inOut(3)', overwrite: 'auto' });
    });
    heroArrowBtn.addEventListener('mouseleave', function () {
      gsap.to('.work-hero_arrow', { y: 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
    });
    heroArrowBtn.addEventListener('click', function () {
      // Native smooth scroll instead of GSAP's ScrollToPlugin (not
      // self-hosted here, and the browser's built-in easing is close
      // enough for this), skips pulling in another script for one
      // small interaction.
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    });
  }
  } catch (err) {
    console.error('[artis:hero-scene]', err);
  }
}

// Three independent triggers, all guarded by the same __heroSceneInit
// flag so only the first one to fire actually does anything: an
// immediate call if the page has already finished loading by the time
// this script runs, the standard window 'load' event for the normal
// case, and a 1.5s timeout as a last-resort fallback in case something
// on the page (Webflow's own interactions.js has its own GSAP-based
// init lifecycle running alongside this) ever prevents 'load' from
// reaching this listener.
if (document.readyState === 'complete') {
  initHeroScene();
}
window.addEventListener('load', initHeroScene);
setTimeout(initHeroScene, 1500);
