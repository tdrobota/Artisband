// Booking, shared between the CTA section form (#booking-form, native date
// input) and the popup form (#popup-booking-form, custom calendar). Both
// submit the same way: build a pre-filled WhatsApp message and open wa.me
// with it. No backend involved, the visitor still has to press "Send"
// inside WhatsApp themselves, which is also what keeps this naturally
// spam-resistant without needing Turnstile/honeypot/server validation.
//
// This used to live inline in index.html's <head>/<body>, but the site's
// CSP (script-src 'self', no unsafe-inline) silently blocks inline
// <script> tags from executing at all: on the deployed Cloudflare Pages
// site this meant the WhatsApp button, the booking calendar, and the
// booking form's own submit handler never ran, so the form fell back to
// a plain browser GET submission (visible as ?name=...&eventType=...
// query params in the address bar instead of opening WhatsApp). Moving
// this to an external, same-origin file keeps CSP strict while letting
// the code actually run.
(function () {
  // Each of this file's independent setup blocks is wrapped in its own
  // try/catch so a failure in one (whatever it turns out to be) can't
  // cascade and silently kill the others, and any real error now gets
  // logged with enough context to identify which block and why.
  try {
  var WHATSAPP_NUMBER = '40740326997';

  var eventTypeLabels = {
    Nunta: 'Nuntă',
    Botez: 'Botez',
    'Alt-eveniment': 'Alt eveniment'
  };

  function formatDate(isoDate) {
    var parts = isoDate.split('-'); // yyyy-mm-dd
    return parts.length === 3 ? (parts[2] + '.' + parts[1] + '.' + parts[0]) : isoDate;
  }

  function bindBookingForm(form) {
    if (!form) return;

    var wrap = form.closest('.form-wrap') || form.parentElement;
    var doneMsg = wrap.querySelector('.w-form-done');
    var failMsg = wrap.querySelector('.w-form-fail');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (doneMsg) doneMsg.style.display = 'none';
      if (failMsg) failMsg.style.display = 'none';

      var formData = new FormData(form);
      var name = (formData.get('name') || '').toString().trim();
      var eventType = formData.get('eventType');
      var eventDate = formData.get('eventDate');
      var city = (formData.get('city') || '').toString().trim();
      var venue = (formData.get('venue') || '').toString().trim();

      if (!eventType || !eventDate || !city || !venue) {
        if (failMsg) failMsg.style.display = 'block';
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

  // CTA section form, keeps its native date input, enhanced so clicking
  // anywhere on the field opens the calendar, not just the small icon.
  var ctaForm = document.getElementById('booking-form');
  var ctaDateInput = document.getElementById('event-date');
  if (ctaDateInput) {
    ctaDateInput.min = new Date().toISOString().slice(0, 10);
    if (typeof ctaDateInput.showPicker === 'function') {
      ctaDateInput.addEventListener('click', function () {
        try {
          ctaDateInput.showPicker();
        } catch (err) {
          // Ignore: some browsers throw if called outside a direct user
          // gesture or while another picker is already open.
        }
      });
    }
  }
  bindBookingForm(ctaForm);

  // Popup form, uses the custom calendar below instead of a native input.
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

  // Hide the floating button once the contact/booking section starts
  // entering the viewport, it otherwise sits on top of the form the
  // visitor is trying to fill in. Plain IntersectionObserver at the
  // default threshold (0) fires as soon as a single pixel of the section
  // is visible, i.e. exactly "starting to be seen", no rootMargin tuning
  // needed.
  var ctaSection = document.querySelector('.section_cta');
  if (ctaSection && 'IntersectionObserver' in window) {
    var ctaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        btn.classList.toggle('is-hidden', entry.isIntersecting);
      });
    });
    ctaObserver.observe(ctaSection);
  }
  } catch (err) {
    console.error('[artis:whatsapp-dock]', err);
  }
})();

// "Ce oferim" section heading: a word-by-word highlight/fill effect tied
// to scroll position while .services_content stays pinned and
// .services_items' image stack scrolls past underneath it. On desktop
// this is handled by Webflow's own built-in interaction (content and
// items sit in separate grid columns there) and works fine; on
// phone-width screens the heading never visibly highlighted, the words
// were just static. Rebuilt here with GSAP (already loaded on this page
// for other things): split the heading into words, start them dim, and
// scrub them to full brightness while .services_content is pinned via
// ScrollTrigger (see below) across .services_component's own top-to-
// bottom scroll span, so the highlight always finishes right as the pin
// releases and normal scrolling continues, same felt experience as
// desktop. Scoped to phone widths only so it doesn't double up with (or
// fight) whatever Webflow's own interaction is doing on desktop.
function initServicesHighlight() {
  if (window.__servicesHighlightInit) return;
  if (!(window.gsap && window.ScrollTrigger && window.SplitText)) return;
  if (!window.matchMedia('(max-width: 479px)').matches) return;
  window.__servicesHighlightInit = true;

  try {
    gsap.registerPlugin(ScrollTrigger, SplitText);

    var heading = document.querySelector('.section_services .heading-style-h3');
    var component = document.querySelector('.services_component');
    var content = document.querySelector('.services_content');
    if (!heading || !component || !content) return;

    var split = new SplitText(heading, { type: 'words' });

    // Dim starting state is set via GSAP, not CSS, so if this script ever
    // fails to run for any reason the heading just shows its normal full
    // -brightness color from the start instead of getting stuck faded.
    gsap.set(split.words, { color: 'rgba(255, 255, 255, 0.28)' });

    // Pinning happens here too (pin: content), not via CSS position:
    // sticky. Tried plain sticky first: .services_content and
    // .services_items are stacked in the SAME column on mobile (unlike
    // desktop's two side-by-side grid columns), and sticky doesn't
    // reserve any extra flow space for itself while pinned, so
    // .services_items scrolled up and visibly overlapped/cut through the
    // still-pinned heading. ScrollTrigger's pin inserts a real spacer
    // sized to match, so .services_items only ever starts right where the
    // pinned heading visually finishes. start's "top+=72" offset keeps
    // the pinned heading below the fixed mobile navbar instead of
    // flush against the very top edge of the viewport.
    gsap.timeline({
      scrollTrigger: {
        trigger: component,
        start: 'top top+=72',
        end: 'bottom bottom',
        scrub: true,
        pin: content,
        pinSpacing: true,
        anticipatePin: 1
      }
    }).to(split.words, {
      color: '#ffffff',
      stagger: 0.08,
      ease: 'none'
    });
  } catch (err) {
    console.error('[artis:services-highlight]', err);
  }
}

if (document.readyState === 'complete') {
  initServicesHighlight();
}
window.addEventListener('load', initServicesHighlight);
setTimeout(initServicesHighlight, 1500);

// .home-about_component (the "Noi suntem [image] Artis Band" hero) is
// supposed to grow from a small 12vw/10vh rectangle up to a full-bleed
// image as the user scrolls through .home-about_wrapper, same as it does
// on desktop via Webflow's own interaction. On mobile widths Webflow's
// interaction computes a broken shape instead (a tall, narrow, cropped
// strip that never resolves correctly), so this replaces it with a custom
// GSAP ScrollTrigger scrub, scoped to <=991px to match the CSS breakpoint
// in site.css that forces this element's width/height via !important.
//
// That CSS rule reads its value from --home-about-width/--home-about-height
// custom properties (falling back to 12vw/10vh if this script never runs).
// Writing the live scroll-driven value into those two custom properties,
// rather than directly animating width/height, is what makes the
// !important override still show a moving/growing size instead of a
// permanently frozen one: the !important rule always wins against
// whatever plain inline width/height Webflow's own JS keeps trying to
// set, but it re-reads the custom properties on every recalculation, so
// this script's live values (not Webflow's) are what actually gets shown.
function initHomeAboutGrow() {
  if (window.__homeAboutGrowInit) return;
  if (!(window.gsap && window.ScrollTrigger)) return;
  if (!window.matchMedia('(max-width: 991px)').matches) return;
  window.__homeAboutGrowInit = true;

  try {
    gsap.registerPlugin(ScrollTrigger);

    var wrapper = document.querySelector('.home-about_wrapper');
    var component = document.querySelector('.home-about_component');
    if (!wrapper || !component) return;

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    // Writes the two custom properties directly via setProperty on every
    // scroll tick, instead of handing a gsap.fromTo() tween the custom
    // properties as its target values. Verified live: a plain fromTo
    // tween's rendered custom-property value got stuck part-way through
    // and stopped tracking scroll position once Webflow's own competing
    // interaction (also targeting this same element, for its own,
    // separate width/height inline styles) started writing to the
    // element on the same ticks. Recomputing and re-writing the two
    // custom properties explicitly here, every time ScrollTrigger fires,
    // guarantees this element's --home-about-width/height always reflect
    // the current scroll position, with no dependency on GSAP's internal
    // "skip render if nothing changed" caching around the tween itself.
    function render(self) {
      component.style.setProperty('--home-about-width', lerp(12, 100, self.progress) + 'vw');
      component.style.setProperty('--home-about-height', lerp(10, 100, self.progress) + 'vh');
    }

    ScrollTrigger.create({
      trigger: wrapper,
      start: 'top top',
      end: '+=100%',
      scrub: true,
      onUpdate: render,
      onRefresh: render
    });
  } catch (err) {
    console.error('[artis:home-about-grow]', err);
  }
}

if (document.readyState === 'complete') {
  initHomeAboutGrow();
}
window.addEventListener('load', initHomeAboutGrow);
setTimeout(initHomeAboutGrow, 1500);
