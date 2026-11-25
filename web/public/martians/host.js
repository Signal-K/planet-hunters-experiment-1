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

  // A private row per browser avoids two devices overwriting each other's
  // unsent saves. Campaign achievements merge; consumables and checkpoints use
  // the most recently edited value. Legacy local saves are adopted only once.
  const saveKeys = ['hm.progress', 'hm.tutorial', 'hm.school', 'expedition-v1'];
  const storageKey = (k) => 'hm.' + k;
  let owner = null, syncing = false, syncAgain = false, syncFailed = false;
  const device = (() => {
    let id = LS.get('hm.sync.device');
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(15)), n => 'abcdefghijklmnopqrstuvwxyz0123456789'[n % 36]).join(''); LS.set('hm.sync.device', id); }
    return id;
  })();
  const stateKey = (id) => 'hm.sync.state.' + id;
  const readState = (id) => { try { return JSON.parse(LS.get(stateKey(id)) || '{}'); } catch { return {}; } };
  const writeState = (id, state) => LS.set(stateKey(id), JSON.stringify(state));
  const parseProgress = (v) => { try { return JSON.parse(v || '{}') || {}; } catch { return {}; } };
  function mergeProgress(a, b) {
    const out = { ...a, ...b, levels: { ...(a.levels || {}) }, labels: { ...(a.labels || {}) } };
    for (const [id, level] of Object.entries(b.levels || {})) {
      const prev = out.levels[id] || {};
      const times = [prev.best, level.best].filter(n => typeof n === 'number' && n > 0);
      out.levels[id] = { ...prev, ...level, stars: Math.max(prev.stars || 0, level.stars || 0), score: Math.max(prev.score || 0, level.score || 0), best: times.length ? Math.min(...times) : 0 };
    }
    for (const [id, labels] of Object.entries(b.labels || {})) out.labels[id] = { ...(out.labels[id] || {}), ...labels };
    out.best_expedition = Math.max(a.best_expedition || 0, b.best_expedition || 0);
    out.launched = Math.max(a.launched || 0, b.launched || 0);
    out.claimed_missions = { ...(a.claimed_missions || {}), ...(b.claimed_missions || {}) };
    return out;
  }
  function mergeStates(states) {
    const result = {};
    for (const key of saveKeys) {
      const entries = states.map(s => s && s[key]).filter(e => e && typeof e.time === 'number' && typeof e.value === 'string').sort((a, b) => a.time - b.time);
      if (!entries.length) continue;
      const latest = entries[entries.length - 1];
      if (key === 'hm.progress') {
        let p = {};
        for (const e of entries) p = mergeProgress(p, parseProgress(e.value));
        result[key] = { time: latest.time, value: JSON.stringify(p) };
      } else if (key === 'hm.school') {
        result[key] = { time: latest.time, value: String(Math.max(...entries.map(e => Number(e.value) || 0))) };
      } else if (key === 'hm.tutorial') {
        result[key] = { time: latest.time, value: entries.some(e => e.value === 'done') ? 'done' : latest.value };
      } else result[key] = latest;
    }
    return result;
  }
  function activateOwner(id) {
    if (owner === id) return;
    if (owner) for (const k of saveKeys) { const v = LS.get(storageKey(k)); if (v !== null) LS.set('hm.sync.local.' + owner + '.' + k, v); }
    owner = id;
    if (!id) { for (const k of saveKeys) LS.del(storageKey(k)); if (window.haphazard?.refreshProgress) window.haphazard.refreshProgress(); return; }
    const legacyOwner = LS.get('hm.sync.legacyOwner');
    let state = readState(id);
    const guest = {};
    for (const k of saveKeys) {
      const v = LS.get('hm.sync.guest.' + k);
      if (v !== null) { try { guest[k] = JSON.parse(v); } catch {} }
    }
    state = mergeStates([state, guest]);
    for (const k of saveKeys) {
      let v = LS.get('hm.sync.local.' + id + '.' + k);
      if (v === null && !legacyOwner) v = LS.get(storageKey(k));
      if (state[k]) v = state[k].value;
      if (v !== null) { LS.set(storageKey(k), v); if (!state[k]) state[k] = { value: v, time: Date.now() }; }
      else LS.del(storageKey(k));
    }
    if (!legacyOwner) LS.set('hm.sync.legacyOwner', id);
    writeState(id, state);
    for (const k of saveKeys) LS.del('hm.sync.guest.' + k);
    if (window.haphazard?.refreshProgress) window.haphazard.refreshProgress();
  }
  function saveGame(key, value) {
    LS.set(storageKey(key), value);
    if (!saveKeys.includes(key)) return;
    if (owner) {
      LS.set('hm.sync.local.' + owner + '.' + key, value);
      const state = readState(owner);
      state[key] = { value, time: Math.max(Date.now(), (state[key]?.time || 0) + 1) };
      writeState(owner, state);
      syncProgress();
    } else {
      LS.set('hm.sync.guest.' + key, JSON.stringify({ value, time: Date.now() }));
    }
  }
  async function syncProgress() {
    if (DEMO || !auth || !owner) return;
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    const id = owner, token = auth.token;
    try {
      let page = 1, records = [];
      for (;;) {
        const data = await pb('/api/collections/hm_saves/records?perPage=200&page=' + page++);
        records.push(...data.items);
        if (page > data.totalPages) break;
      }
      if (!auth || auth.token !== token || owner !== id) return;
      const local = readState(id);
      // Earlier versions uploaded run records but did not upload local saves.
      // Restore those records as well, retaining all newer save fields.
      const queryUser = id.replace(/["\\]/g, '');
      const recovered = await window.HMProgressSync.hydrateProgress(async (page, perPage) => {
        const query = new URLSearchParams({filter: `user = "${queryUser}"`, page: String(page), perPage: String(perPage), fields: 'level,won,stars,time,score'});
        return pb('/api/collections/hm_runs/records?' + query);
      }, local['hm.progress']?.value);
      if (!auth || auth.token !== token || owner !== id) return;
      // Re-read after the network request so local play during restore is kept.
      const current = readState(id);
      const fromRuns = recovered.changed ? { 'hm.progress': {time: 0, value: JSON.stringify(recovered.progress)} } : {};
      const merged = mergeStates([fromRuns, ...records.map(r => r.state), current]);
      let changed = false;
      for (const [key, entry] of Object.entries(merged)) {
        if (LS.get(storageKey(key)) !== entry.value) changed = true;
        LS.set(storageKey(key), entry.value);
        LS.set('hm.sync.local.' + id + '.' + key, entry.value);
      }
      writeState(id, merged);
      const mine = records.find(r => r.device === device);
      if (JSON.stringify(mine?.state || {}) !== JSON.stringify(merged)) {
        const data = { user: id, device, state: merged };
        await pb('/api/collections/hm_saves/records' + (mine ? '/' + mine.id : ''), { method: mine ? 'PATCH' : 'POST', body: JSON.stringify(data) });
      }
      syncFailed = false;
      render();
      if (changed && window.haphazard?.refreshProgress) window.haphazard.refreshProgress();
    } catch (e) { syncFailed = true; render(); console.warn('Game progress sync failed; local save retained.', e); }
    finally { syncing = false; if (syncAgain) { syncAgain = false; syncProgress(); } }
  }

  // ---- review captures ----
  // Sending a review keeps it in full on the shared backend
  // (platform_classification_captures): every label, plus two photos of the
  // navcam strip, plain and labelled. The game hands the photos over just
  // before the "review" event. Images are too big for localStorage, so these
  // wait in IndexedDB until the player is signed in and online.
  const shots = {}; // stamp -> { source, marked }
  function capDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('hm-captures', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('queue', { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function capTx(mode, fn) {
    const db = await capDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('queue', mode);
        const req = fn(tx.objectStore('queue'));
        let out;
        if (req) req.onsuccess = () => { out = req.result; };
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  }
  const newId = () => Array.from({ length: 15 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
  async function queueReview(p) {
    const got = shots[p.stamp] || {};
    delete shots[p.stamp];
    const item = {
      id: newId(),
      data: { game: 'haphazard-martians', kind: 'ai4mars', subject: 'level-' + p.level, record_collection: 'hm_labels', annotations: p },
      image: got.source || null,
      annotated: got.marked || null,
    };
    try { await capTx('readwrite', (st) => { st.put(item); }); } catch { return; } // no IndexedDB: the labels still went to hm_labels
    flushCaptures();
  }
  let capFlushing = false;
  async function flushCaptures() {
    if (capFlushing || DEMO || !auth || typeof indexedDB === 'undefined') return;
    capFlushing = true;
    try {
      const items = (await capTx('readonly', (st) => st.getAll())) || [];
      for (const it of items) {
        const fd = new FormData();
        fd.append('id', it.id);
        fd.append('user', auth.record.id);
        for (const [k, v] of Object.entries(it.data)) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v));
        if (it.image) fd.append('image', new File([it.image], 'source.png', { type: 'image/png' }));
        if (it.annotated) fd.append('annotated_image', new File([it.annotated], 'annotated.png', { type: 'image/png' }));
        let res;
        try { res = await fetch(API + '/api/collections/platform_classification_captures/records', { method: 'POST', headers: { Authorization: auth.token }, body: fd }); }
        catch { return; } // offline: try again later
        if (res.status === 401 || res.status === 403 || res.status === 429 || res.status >= 500) return;
        // Saved, a replay of a saved one, or a backend without the collection: done with it.
        await capTx('readwrite', (st) => { st.delete(it.id); });
      }
    } catch { /* storage unavailable */ } finally { capFlushing = false; }
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
  function render() { if (DEMO) { btn.hidden = true; return; } btn.textContent = auth ? auth.record.email + (syncFailed ? ' · sync pending' : ' · sign out') : 'Sign in'; }
  function signOut() {
    auth = null; syncFailed = false; activateOwner(null); LS.del('hm.auth');
    // Leaving the game does not sign the player out of Landnam; it only stops
    // the shared session from signing them straight back in here.
    if (CLERK_KEY || (cfg && cfg.shareAuth)) LS.set('hm.signedOut', '1');
    render();
  }
  async function setAuth(r) { auth = { token: r.token, record: r.record }; activateOwner(auth.record.id); syncProgress(); LS.set('hm.auth', JSON.stringify(auth)); LS.del('hm.signedOut'); render(); flush(); flushCaptures(); }
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
  if (auth) activateOwner(auth.record.id);
  render();
  if (auth && !DEMO) {
    pb('/api/collections/users/auth-refresh', { method: 'POST' }).then(setAuth).catch((e) => { if (e.status === 401 || e.status === 403) signOut(); });
  } else if (CLERK_KEY && !LS.get('hm.signedOut')) {
    // signed in to Landnam already? then this game is signed in too
    loadClerk().then((clerk) => clerk.session && exchange(clerk)).catch(() => {});
  }
  addEventListener('online', syncProgress);
  addEventListener('focus', syncProgress);
  setInterval(syncProgress, 30000);
  addEventListener('online', flush);
  addEventListener('online', flushCaptures);
  if (auth) setTimeout(flushCaptures, 3000);

  // A rover photo from the game: the share sheet where there is one (phones),
  // otherwise a download.
  async function photo(name, bytes) {
    const m = /^hm-review-(source|marked)-(.+)\.png$/.exec(name);
    if (m) { // a review photo: kept with the review, not shared
      (shots[m[2]] = shots[m[2]] || {})[m[1]] = new Blob([bytes], { type: 'image/png' });
      return;
    }
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

  // ---- analytics (KES-505) ----
  // With cfg.posthog = { key, host } the game's events go to PostHog, so we
  // can see how players build and where they quit. Players stay anonymous:
  // no identify call, no person profiles, no session recording, and events
  // carry only game facts. The SDK loads after the game so it never slows boot.
  const PH = cfg && cfg.posthog && cfg.posthog.key ? cfg.posthog : null;
  const phQueue = [];
  let ph = null;
  function track(event, props) {
    if (!PH) return;
    if (ph) ph.capture(event, props); else if (phQueue.length < 200) phQueue.push([event, props]);
  }
  if (PH) {
    const host = PH.host || 'https://us.i.posthog.com';
    const s = document.createElement('script');
    s.async = true;
    s.src = host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
    s.onload = () => {
      if (!window.posthog || !window.posthog.init) return;
      window.posthog.init(PH.key, {
        api_host: host,
        persistence: 'localStorage',
        person_profiles: 'identified_only',
        disable_session_recording: true,
        autocapture: false,
        capture_pageview: true,
        loaded: (p) => {
          p.register({ game: 'haphazard-martians', build: cfg.build || 'dev' });
          ph = p;
          while (phQueue.length) { const [e, pr] = phQueue.shift(); p.capture(e, pr); }
        },
      });
    };
    document.head.appendChild(s);
  }
  // The run event already says how a drive ended; analytics gets a lean copy
  // without the design grid.
  const runProps = (p) => ({ level: p.level, won: p.won, outcome: p.outcome, stars: p.stars, time: p.time, samples: p.samples,
    score: p.score, cost: p.cost, cells: (p.design || []).length, damaged: p.damaged, distance: p.distance, progress: p.progress,
    body: p.body, par: p.par, lesson: p.lesson, expedition: p.expedition });

  window.haphazard = {
    photo: (name, bytes) => { photo(name, bytes); },
    load: (k) => LS.get('hm.' + k),
    save: (k, v) => saveGame(k, v),
    emit: (ev, json) => {
      let p; try { p = JSON.parse(json); } catch { return; }
      if (ev === 'track') { track(p.event, p.props || {}); return; }
      if (ev === 'run') track('hm_run_finished', runProps(p));
      if (ev === 'scene') track('hm_scene', { name: p.name });
      if (ev === 'scene') { btn.hidden = DEMO || p.name !== 'menu'; return; } // keep the HTML chrome off the in-game HUD
      if (ev === 'prompt') { setTimeout(() => askText(p), 0); return; } // a text field in the game
      if (DEMO) return; // nothing to send to: progress is already saved locally
      if (ev === 'review') { queueReview(p); return; }
      const rec = toRecord(ev, p);
      if (!rec) return;
      queue.push(rec); saveQueue(); flush();
    },
  };
})();
