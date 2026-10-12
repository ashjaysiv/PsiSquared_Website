(() => {
  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const small = window.matchMedia('(max-width: 900px)');

  /* ---------- Nav: solid after the hero, mobile menu ---------- */
  const nav = document.querySelector('[data-nav]');
  const hero = document.querySelector('.hero');
  new IntersectionObserver(([e]) => nav.classList.toggle('is-solid', !e.isIntersecting), {
    rootMargin: '-90px 0px 0px 0px'
  }).observe(hero);

  const toggle = document.querySelector('[data-nav-toggle]');
  const links = document.getElementById('nav-links');
  const setMenu = (open) => {
    links.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setMenu(!links.classList.contains('is-open')));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && links.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });

  /* ---------- Count-ups ---------- */
  const fmt = (n, decimals) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const final = pre + fmt(target, decimals) + suf;
    if (reduceMotion.matches) { el.textContent = final; return; }
    const dur = 1400, t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(target * eased, decimals) + suf;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
    };
    requestAnimationFrame(tick);
  };
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { countUp(e.target); countObs.unobserve(e.target); } });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => countObs.observe(el));

  /* ---------- Reveals, staggered per group ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); revealObs.unobserve(e.target); } });
  }, { threshold: 0.2 });
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    el.style.setProperty('--delay', siblings.indexOf(el) * 100 + 'ms');
    revealObs.observe(el);
  });

  /* ---------- Problem: backfill wipe tied to scroll ---------- */
  const problem = document.querySelector('[data-problem]');
  const wipe = document.querySelector('[data-wipe]');
  let wipeActive = false;

  const updateWipe = () => {
    const r = problem.getBoundingClientRect();
    const travel = problem.offsetHeight - window.innerHeight;
    // 0 -> 1 across the pinned stretch; hold briefly at both ends
    const raw = travel > 0 ? -r.top / travel : 0;
    const p = Math.min(1, Math.max(0, (raw - 0.12) / 0.66));
    wipe.style.setProperty('--wipe', (p * 100).toFixed(2) + '%');
    wipe.style.setProperty('--wipe-on', p > 0 && p < 1 ? 1 : 0);
    wipe.classList.toggle('is-closed', p >= 0.98);
  };

  const setWipeMode = () => {
    const isStatic = small.matches || reduceMotion.matches;
    wipe.classList.toggle('is-static', isStatic);
    wipeActive = !isStatic;
    if (isStatic) { wipe.style.removeProperty('--wipe'); wipe.classList.remove('is-closed'); }
    else updateWipe();
  };

  /* ---------- Vision: gentle parallax + one glow pulse ---------- */
  const vision = document.querySelector('[data-vision]');
  const visionImg = vision.querySelector('.vision__img');
  const updateParallax = () => {
    const r = vision.getBoundingClientRect();
    const mid = r.top + r.height / 2 - window.innerHeight / 2;
    visionImg.style.setProperty('--parallax', (mid * -0.08).toFixed(1) + 'px');
  };
  new IntersectionObserver(([e], obs) => {
    if (e.isIntersecting) { vision.classList.add('is-in'); obs.disconnect(); }
  }, { threshold: 0.45 }).observe(vision);

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (wipeActive) updateWipe();
      if (!reduceMotion.matches) updateParallax();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  small.addEventListener('change', setWipeMode);
  reduceMotion.addEventListener('change', setWipeMode);
  setWipeMode();
  onScroll();

  /* ---------- Demo video dialog ---------- */
  const demo = document.querySelector('[data-demo]');
  let demoTrigger = null;
  document.querySelectorAll('[data-demo-open]').forEach((btn) => btn.addEventListener('click', () => {
    demoTrigger = btn;
    demo.showModal();
    demo.querySelector('video')?.play().catch(() => {});
  }));
  demo.querySelector('[data-demo-close]').addEventListener('click', () => demo.close());
  demo.addEventListener('click', (e) => { if (e.target === demo) demo.close(); }); // backdrop click
  demo.addEventListener('close', () => {
    demo.querySelector('video')?.pause();
    const frame = demo.querySelector('iframe');
    if (frame) frame.src = frame.src; // stop embedded playback
    demoTrigger?.focus();
  });

  /* ---------- Contact form ---------- */
  const form = document.querySelector('[data-form]');
  const status = form.querySelector('.form__status');
  const rules = [
    { el: form.elements.name, err: 'f-name-err', ok: (v) => v.trim().length > 0 },
    { el: form.elements.email, err: 'f-email-err', ok: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) }
  ];
  const check = ({ el, err, ok }) => {
    const valid = ok(el.value);
    const msg = document.getElementById(err);
    msg.hidden = valid;
    el.setAttribute('aria-invalid', String(!valid));
    if (valid) el.removeAttribute('aria-describedby'); else el.setAttribute('aria-describedby', err);
    return valid;
  };
  rules.forEach((r) => r.el.addEventListener('blur', () => { if (r.el.value) check(r); }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const results = rules.map(check);
    if (results.includes(false)) { rules[results.indexOf(false)].el.focus(); return; }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending…';
    status.textContent = '';
    try {
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
      } else {
        // No form service connected yet: simulate a successful send.
        await new Promise((r) => setTimeout(r, 600));
      }
      form.reset();
      form.classList.add('is-sent');
      status.textContent = 'Got it. One of the three of us will get back to you within two days.';
    } catch {
      status.textContent = "Couldn't send that. Try again, or email hello@psisquared.com.";
    } finally {
      btn.disabled = false; btn.textContent = 'Map my site';
    }
  });
})();
