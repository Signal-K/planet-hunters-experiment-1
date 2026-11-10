// Bridge between the Go game (WASM) and the browser: storage, PocketBase auth,
// and an offline-tolerant queue for run/label events. The game only ever calls
// window.haphazard.{load,save,emit}.
(() => {
  // config.js decides where the backend is. No config means the page's own origin
  // (the bundled PocketBase server); an empty api means demo mode with no backend.
  const cfg = window.HM_CONFIG;
  const API = cfg ? cfg.api : location.origin;
  const DEMO = !API;
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };

  let auth = null;
  try { auth = JSON.parse(LS.get('hm.auth') || 'null'); } catch {}
  let queue = [];
  try { queue = JSON.parse(LS.get('hm.queue') || '[]'); } catch {}
  const saveQueue = () => LS.set('hm.queue', JSON.stringify(queue.slice(-500)));

  async function pb(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && auth.token) headers.Authorization = auth.token;
    const res = await fetch(API + path, { ...opts, headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(body.message || res.statusText); e.status = res.status; e.body = body; throw e; }
    return body;
  }

  const toRecord = (ev, p) => {
    if (ev === 'run') return ['hm_runs', { level: p.level, won: p.won, stars: p.stars, time: p.time, samples: p.samples, score: p.score, cost: p.cost, design: p.design }];
    if (ev === 'label') return ['hm_labels', { level: p.level, segment: p.segment, x0: p.x0, x1: p.x1, class: p.class, gold: p.gold, correct: p.correct }];
    return null;
  };

  let flushing = false;
  async function flush() {
    if (flushing || !auth || !queue.length) return;
    flushing = true;
    try {
      while (queue.length) {
        const [col, data] = queue[0];
        try {
          await pb(`/api/collections/${col}/records`, { method: 'POST', body: JSON.stringify({ ...data, user: auth.record.id }) });
        } catch (e) {
          if (e.status === 400) { /* invalid or duplicate: drop it */ }
          else throw e; // offline / auth expired: keep for later
        }
        queue.shift(); saveQueue();
      }
    } catch (e) {
      if (e.status === 401 || e.status === 403) signOut();
    } finally { flushing = false; }
  }

  // ---- account UI ----
  // Two sign-in modes. With a Clerk key in config.js (the deployed game) the
  // player signs in with their Star Sailors account through Landnam's Clerk
  // instance, and the shared backend swaps the Clerk session for a normal
  // PocketBase token. On a playlandnam.space subdomain a player already signed
  // in to Landnam is signed in here without typing anything. Without a key
  // (the bundled server, `make run`) it is plain PocketBase email and password.
  const $ = (id) => document.getElementById(id);
  const btn = $('acct'), dlg = $('dlg'), msg = $('msg');
  const CLERK_KEY = !DEMO && cfg && cfg.clerk ? String(cfg.clerk).trim() : '';
  let step = 'password'; // Clerk only: 'password', then 'signup-code' or 'reset-code'
  function render() { if (DEMO) { btn.hidden = true; return; } btn.textContent = auth ? auth.record.email + ' · sign out' : 'Sign in'; }
  function signOut() {
    auth = null; LS.del('hm.auth');
    // Leaving the game does not sign the player out of Landnam; it only stops
    // the shared session from signing them straight back in here.
    if (CLERK_KEY || (cfg && cfg.shareAuth)) LS.set('hm.signedOut', '1');
    render();
  }
  async function setAuth(r) { auth = { token: r.token, record: r.record }; LS.set('hm.auth', JSON.stringify(auth)); LS.del('hm.signedOut'); render(); flush(); }
  async function login(email, password) {
    await setAuth(await pb('/api/collections/users/auth-with-password', { method: 'POST', body: JSON.stringify({ identity: email, password }) }));
  }

  // Clerk is loaded from the instance's own Frontend API, whose host is
  // encoded in the publishable key. Versions are pinned so a Clerk release
  // cannot change the game without a deploy. The UI bundle is loaded only for
  // Clerk's bot check (Protect), which may show a challenge on sign-up; the
  // sign-in form itself is ours.
  const CLERK_JS = '6.41.0', CLERK_UI = '1.42.0'; // released together
  function script(src) {
    return new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = src; sc.async = true; sc.crossOrigin = 'anonymous';
      sc.onload = resolve;
      sc.onerror = () => reject(new Error('Sign-in could not load. Check your connection and try again.'));
      document.head.appendChild(sc);
    });
  }
  let clerkReady = null;
  function loadClerk() {
    if (clerkReady) return clerkReady;
    clerkReady = (async () => {
      let host;
      try { host = atob(CLERK_KEY.split('_')[2]).replace(/\$$/, ''); } catch { throw new Error('Sign-in is misconfigured.'); }
      const npm = `https://${host}/npm/@clerk`;
      window.__clerk_publishable_key = CLERK_KEY; // clerk-js makes window.Clerk from this
      await Promise.all([script(`${npm}/ui@${CLERK_UI}/dist/ui.browser.js`), script(`${npm}/clerk-js@${CLERK_JS}/dist/clerk.browser.js`)]);
      const clerk = window.Clerk;
      await clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
      return clerk;
    })();
    clerkReady.catch(() => { clerkReady = null; }); // allow a retry
    return clerkReady;
  }
  async function exchange(clerk) {
    const token = await clerk.session.getToken();
    if (!token) throw new Error('Sign-in did not finish. Try again.');
    await setAuth(await pb('/auth/clerk-exchange', { method: 'POST', body: JSON.stringify({ token }) }));
  }
  async function activate(clerk, res, what) {
    if (res.status !== 'complete') {
      if ((res.missingFields || []).includes('protect_check')) throw new Error('The security check did not finish. Try again, or sign up on Landnam and sign in here.');
      throw new Error(`This account needs another ${what} step the game does not support yet. Use Landnam to finish it.`);
    }
    await clerk.setActive({ session: res.createdSessionId });
    await exchange(clerk);
  }
  const CLERK_MESSAGES = {
    form_password_incorrect: 'Wrong email or password.',
    form_identifier_not_found: 'Wrong email or password.',
    form_identifier_exists: 'An account already exists for this email. Use Sign in.',
    form_code_incorrect: 'That code is not right. Check the email and try again.',
    verification_expired: 'That code has expired. Start again.',
    form_password_pwned: 'That password has appeared in a data breach. Choose another.',
    form_password_length_too_short: 'Use at least 8 characters.',
    too_many_requests: 'Too many attempts. Wait a minute and try again.',
  };
  function errText(err) {
    const first = err && err.errors && err.errors[0];
    if (first) return CLERK_MESSAGES[first.code] || first.longMessage || first.message;
    return (err && err.message) || 'Something went wrong. Try again.';
  }
  function showStep(next, note) {
    step = next;
    const code = step !== 'password';
    $('codewrap').hidden = !code;
    $('code').required = code;
    $('forgot').hidden = !CLERK_KEY || code;
    $('signup').hidden = code;
    $('pwlabel').firstChild.textContent = step === 'reset-code' ? 'New password' : 'Password';
    $('signin').textContent = step === 'password' ? 'Sign in' : step === 'signup-code' ? 'Create account' : 'Set password';
    msg.textContent = note || ''; msg.classList.toggle('note', !!note);
    if (code) $('code').focus();
  }
  async function clerkSubmit(email, password) {
    const clerk = await loadClerk();
    if (step === 'signup-code') {
      await activate(clerk, await clerk.client.signUp.attemptEmailAddressVerification({ code: $('code').value.trim() }), 'sign-up');
    } else if (step === 'reset-code') {
      await activate(clerk, await clerk.client.signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code: $('code').value.trim(), password }), 'sign-in');
    } else {
      if (clerk.session) await clerk.signOut(); // one Clerk session at a time
      await activate(clerk, await clerk.client.signIn.create({ identifier: email, password }), 'sign-in');
    }
  }

  btn.addEventListener('click', async () => {
    if (auth) { signOut(); return; }
    if (CLERK_KEY) {
      // already signed in to Landnam on this domain: no form needed
      try { const clerk = await loadClerk(); if (clerk.session) { await exchange(clerk); return; } } catch {}
    }
    showStep('password'); dlg.showModal();
  });
  $('close').addEventListener('click', () => dlg.close());
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('email').value.trim(), password = $('pw').value;
    msg.textContent = ''; msg.classList.remove('note');
    try {
      if (CLERK_KEY) await clerkSubmit(email, password);
      else await login(email, password);
      dlg.close();
    } catch (err) { msg.classList.remove('note'); msg.textContent = errText(err); }
  });
  $('signup').addEventListener('click', async () => {
    const email = $('email').value.trim(), password = $('pw').value;
    if (!email || password.length < 8) { msg.textContent = 'Enter an email and a password of 8+ characters.'; return; }
    try {
      if (CLERK_KEY) {
        const clerk = await loadClerk();
        if (clerk.session) await clerk.signOut();
        await clerk.client.signUp.create({ emailAddress: email, password });
        await clerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        showStep('signup-code', `We emailed a code to ${email}.`);
        return;
      }
      await pb('/api/collections/users/records', { method: 'POST', body: JSON.stringify({ email, password, passwordConfirm: password }) });
      await login(email, password); dlg.close();
    } catch (err) { msg.classList.remove('note'); msg.textContent = errText(err); }
  });
  $('forgot').addEventListener('click', async () => {
    const email = $('email').value.trim();
    if (!email) { msg.textContent = 'Enter your email first.'; return; }
    try {
      const clerk = await loadClerk();
      if (clerk.session) await clerk.signOut();
      // Accounts made before Clerk exist only in PocketBase; copy them over first
      // (always 204, so it says nothing about which emails have accounts).
      await pb('/auth/landnam/clerk-ensure', { method: 'POST', body: JSON.stringify({ email }) }).catch(() => {});
      await clerk.client.signIn.create({ strategy: 'reset_password_email_code', identifier: email });
      showStep('reset-code', `If ${email} has an account, we emailed it a code. Enter it and a new password.`);
    } catch (err) {
      const first = err && err.errors && err.errors[0];
      if (first && first.code === 'form_identifier_not_found') showStep('reset-code', `If ${email} has an account, we emailed it a code. Enter it and a new password.`);
      else { msg.classList.remove('note'); msg.textContent = errText(err); }
    }
  });
  for (const t of ['keydown', 'keyup', 'keypress']) dlg.addEventListener(t, (e) => e.stopPropagation()); // typing here is not for the game
  if (!CLERK_KEY) $('forgot').hidden = true;
  // shareAuth names another app's PocketBase auth in this origin's storage
  // (Landnam's pocketbase-js store, when the game is served from
  // playlandnam.space/martians/). Both talk to the same shared backend, so a
  // player signed in to Landnam is signed in here too. Leaving the game does
  // not touch Landnam's copy.
  if (!auth && !DEMO && cfg && cfg.shareAuth && !LS.get('hm.signedOut')) {
    try {
      const shared = JSON.parse(LS.get(cfg.shareAuth) || 'null');
      if (shared && shared.token && shared.record && shared.record.collectionName === 'users') auth = { token: shared.token, record: shared.record };
    } catch {}
  }
  render();
  if (auth && !DEMO) {
    pb('/api/collections/users/auth-refresh', { method: 'POST' }).then(setAuth).catch((e) => { if (e.status === 401 || e.status === 403) signOut(); });
  } else if (CLERK_KEY && !LS.get('hm.signedOut')) {
    // signed in to Landnam already? then this game is signed in too
    loadClerk().then((clerk) => clerk.session && exchange(clerk)).catch(() => {});
  }
  addEventListener('online', flush);

  // A rover photo from the game: the share sheet where there is one (phones),
  // otherwise a download.
  async function photo(name, bytes) {
    const file = new File([bytes], name, { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Haphazard Martians' });
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // askText shows a real text box over the game, because a phone only opens its
  // keyboard for one. window.prompt is avoided: embedded pages often block it.
  function askText(p) {
    let d = document.getElementById('askdlg');
    if (!d) {
      d = document.createElement('dialog');
      d.id = 'askdlg';
      d.innerHTML = '<form id="askform"><h2 id="asktitle"></h2>' +
        '<input id="askin" type="text" autocomplete="off" autocapitalize="words" enterkeyhint="done">' +
        '<div class="row"><button type="button" id="askno">Cancel</button>' +
        '<button type="submit" class="primary">OK</button></div></form>';
      document.body.appendChild(d);
      // keys typed here belong to the box, not to the game underneath
      for (const t of ['keydown', 'keyup', 'keypress']) d.addEventListener(t, (e) => e.stopPropagation());
      d.querySelector('#askno').addEventListener('click', () => d.close());
      d.querySelector('#askform').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = d.querySelector('#askin').value;
        d.close();
        if (window.haphazard.text) window.haphazard.text(v);
      });
    }
    const input = d.querySelector('#askin');
    d.querySelector('#asktitle').textContent = p.title || 'Name';
    input.maxLength = p.max || 40;
    input.value = p.value || '';
    d.showModal();
    input.focus();
    input.select();
  }

  window.haphazard = {
    photo: (name, bytes) => { photo(name, bytes); },
    load: (k) => LS.get('hm.' + k),
    save: (k, v) => LS.set('hm.' + k, v),
    emit: (ev, json) => {
      let p; try { p = JSON.parse(json); } catch { return; }
      if (ev === 'scene') { btn.hidden = DEMO || p.name !== 'menu'; return; } // keep the HTML chrome off the in-game HUD
      if (ev === 'prompt') { setTimeout(() => askText(p), 0); return; } // a text field in the game
      if (DEMO) return; // nothing to send to: progress is already saved locally
      const rec = toRecord(ev, p);
      if (!rec) return;
      queue.push(rec); saveQueue(); flush();
    },
  };
})();
