(() => {
  'use strict';

  const state = {
    invitationId: '',
    guestName: '',
  };

  const boundDocuments = new WeakSet();
  const documentContexts = new WeakMap();
  const boundFrames = new WeakSet();
  const frameContexts = new WeakMap();

  const text = (value) => String(value ?? '').trim();
  const norm = (value) => text(value).toLowerCase().replace(/\s+/g, ' ');

  function mergeContext(base = {}, next = {}) {
    return {
      invitationId: text(next.invitationId || next.invitation_id || base.invitationId || base.invitation_id),
      guestName: text(next.guestName || next.guest_name || base.guestName || base.guest_name),
    };
  }

  function getGuestName(doc, context = {}) {
    const explicit = text(context.guestName || context.guest_name || state.guestName);
    if (explicit) return explicit;

    const locations = [];
    try {
      if (doc?.defaultView?.location?.href && !/^about:/i.test(doc.defaultView.location.href)) {
        locations.push(doc.defaultView.location);
      }
    } catch (_) {}
    try {
      if (window.location?.href) locations.push(window.location);
    } catch (_) {}

    for (const loc of locations) {
      try {
        const qs = new URLSearchParams(loc.search || '');
        const fromQuery = text(qs.get('to') || qs.get('guest') || qs.get('name'));
        if (fromQuery) return fromQuery;

        const path = String(loc.pathname || '').replace(/^\/+|\/+$/g, '');
        if (path && !/^(index\.html?|guest-entry-v18\.html?)$/i.test(path)) {
          const last = path.split('/').pop();
          const decoded = decodeURIComponent(last || '').replace(/[-_]+/g, ' ').trim();
          if (decoded) return decoded;
        }
      } catch (_) {}
    }

    return '';
  }

  function setContext(next = {}) {
    const merged = mergeContext(state, next);
    if (merged.invitationId) state.invitationId = merged.invitationId;
    if (merged.guestName) state.guestName = merged.guestName;
  }

  async function writeClipboard(value, targetDocument = document) {
    const payload = text(value);
    if (!payload) throw new Error('empty_clipboard_payload');

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(payload);
      return true;
    }

    const doc = targetDocument || document;
    const ta = doc.createElement('textarea');
    ta.value = payload;
    ta.setAttribute('readonly', '');
    Object.assign(ta.style, {
      position: 'fixed',
      left: '-9999px',
      top: '0',
      opacity: '0',
      pointerEvents: 'none',
    });
    (doc.body || doc.documentElement).appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = doc.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('copy_failed');
    return true;
  }

  function toast(doc, message, ok = true) {
    if (!doc?.createElement) return;
    const root = doc.body || doc.documentElement;
    if (!root) return;

    const previous = doc.querySelector('[data-dinifaqih-action-toast="1"]');
    if (previous) previous.remove();

    const el = doc.createElement('div');
    el.textContent = message;
    el.setAttribute('role', 'status');
    el.setAttribute('data-dinifaqih-action-toast', '1');
    Object.assign(el.style, {
      position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
      zIndex: '2147483647', padding: '10px 14px', borderRadius: '999px',
      font: '600 13px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      color: '#fff', background: ok ? 'rgba(20,20,20,.92)' : 'rgba(150,25,25,.94)',
      boxShadow: '0 10px 30px rgba(0,0,0,.22)', opacity: '0', transition: 'opacity .18s ease, transform .18s ease'
    });
    root.appendChild(el);

    const view = doc.defaultView || window;
    view.requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(-2px)';
    });
    view.setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(4px)';
      view.setTimeout(() => el.remove(), 220);
    }, 1800);
  }

  function candidateCopyValue(button) {
    const explicit = text(button.dataset.copy || button.dataset.clipboardText || button.getAttribute('data-value'));
    if (explicit) return explicit;

    const card = button.closest('[data-bank], .bank, .rekening, .gift, .gift-card, .card, section, article, div');
    if (!card) return '';

    const preferred = card.querySelector('[data-copy-value], .account-number, .rekening-number, .bank-number, .address, .alamat, [class*="account"], [class*="rekening"], [class*="alamat"], [class*="address"]');
    if (preferred) {
      const v = text(preferred.getAttribute('data-copy-value') || preferred.value || preferred.textContent);
      if (v && v !== text(button.textContent)) return v;
    }

    const lines = Array.from(card.querySelectorAll('input,textarea,p,span,strong,b,small,div'))
      .map((node) => text(node.value || node.textContent))
      .filter((v) => v && v !== text(button.textContent) && v.length < 240);

    const account = lines.find((v) => /\b\d[\d\s.-]{5,}\d\b/.test(v));
    if (account) return account.match(/\b\d[\d\s.-]{5,}\d\b/)?.[0] || account;

    const address = lines.find((v) => /(jl\.?|jalan|desa|kelurahan|kecamatan|kabupaten|alamat|rt\.?\s*\d|rw\.?\s*\d)/i.test(v));
    return address || '';
  }

  function isCopyButton(el) {
    if (!el?.matches) return false;
    const label = norm(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent);
    return el.matches('[data-copy],[data-clipboard-text]') || (/salin|copy|rekening|alamat/.test(label) && /salin|copy/.test(label));
  }

  function collectForm(form) {
    const out = {};
    const FormDataCtor = form.ownerDocument?.defaultView?.FormData || FormData;
    const fd = new FormDataCtor(form);
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'string') out[k] = v;
    }
    form.querySelectorAll('input,select,textarea').forEach((el) => {
      if (!el.name && el.id && typeof el.value === 'string') out[el.id] = el.value;
    });
    return out;
  }

  async function postJSON(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `http_${res.status}`);
    return data;
  }

  function attendanceValue(raw) {
    const value = norm(raw);
    if (/tidak|absen|decline|no/.test(value)) return 'tidak_hadir';
    if (/ragu|maybe|tentative/.test(value)) return 'ragu';
    return 'hadir';
  }

  function classifyForm(form) {
    const hay = norm(`${form.id} ${form.className} ${form.getAttribute('action') || ''} ${form.textContent}`);
    if (/gift|hadiah|konfirmasi hadiah|transfer/.test(hay)) return 'gift';
    if (/rsvp|kehadiran|hadir|ucapan/.test(hay)) return 'rsvp';
    return '';
  }

  async function handlePublicForm(form, kind, context = {}) {
    const values = collectForm(form);
    const invitationId = text(
      values.invitation_id || values.invitationId || form.dataset.invitationId ||
      context.invitationId || context.invitation_id || state.invitationId || window.__INVITATION_ID__
    );
    const guestName = text(
      values.guest_name || values.guestName || values.name ||
      context.guestName || context.guest_name || getGuestName(form.ownerDocument, context)
    );
    if (!invitationId) throw new Error('invitation_id_missing');
    if (!guestName) throw new Error('guest_name_missing');

    if (kind === 'rsvp') {
      const attendanceRaw = values.attendance || values.status || values.kehadiran || values.rsvp || 'hadir';
      const guestCount = values.guest_count || values.guestCount || values.pax || values.jumlah || 1;
      const message = values.message || values.note || values.ucapan || values.wishes || '';
      return postJSON('/api/rsvp', {
        invitation_id: invitationId,
        guest_name: guestName,
        attendance: attendanceValue(attendanceRaw),
        guest_count: Number(guestCount) || 1,
        message,
      });
    }

    const bankName = values.bank_name || values.bankName || values.bank || values.rekening || '';
    const amount = values.amount || values.nominal || values.jumlah || '';
    const note = values.note || values.message || values.ucapan || '';
    const proofPath = values.proof_path || values.proofPath || values.proof_url || values.proofUrl || '';
    return postJSON('/api/gift-confirmation', {
      invitation_id: invitationId,
      guest_name: guestName,
      bank_name: bankName,
      amount,
      note,
      proof_path: proofPath,
    });
  }

  function contextForDocument(doc) {
    return mergeContext(state, documentContexts.get(doc) || {});
  }

  function dispatch(doc, target, name, detail) {
    const CustomEventCtor = doc?.defaultView?.CustomEvent || CustomEvent;
    target.dispatchEvent(new CustomEventCtor(name, { bubbles: true, detail }));
  }

  function applyDocument(doc, context = {}) {
    if (!doc?.addEventListener) return false;

    documentContexts.set(doc, mergeContext(documentContexts.get(doc) || {}, context));
    if (boundDocuments.has(doc)) return true;
    boundDocuments.add(doc);

    doc.addEventListener('click', async (event) => {
      const target = event.target;
      const button = target?.closest ? target.closest('button,a,[role="button"]') : null;
      if (!button || !isCopyButton(button)) return;

      const value = candidateCopyValue(button);
      if (!value) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await writeClipboard(value, doc);
        toast(doc, 'Berhasil disalin');
        dispatch(doc, button, 'dinifaqih:copied', { value });
      } catch (error) {
        console.error('[public-action-bridge] copy failed', error);
        toast(doc, 'Gagal menyalin', false);
      }
    }, true);

    doc.addEventListener('submit', async (event) => {
      const form = event.target;
      if (!form || String(form.tagName || '').toUpperCase() !== 'FORM') return;

      const kind = classifyForm(form);
      if (!kind) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const submitter = event.submitter || form.querySelector('[type="submit"]');
      if (submitter) submitter.disabled = true;
      try {
        await handlePublicForm(form, kind, contextForDocument(doc));
        toast(doc, kind === 'rsvp' ? 'RSVP berhasil dikirim' : 'Konfirmasi hadiah berhasil dikirim');
        dispatch(doc, form, `dinifaqih:${kind}:success`);
      } catch (error) {
        console.error(`[public-action-bridge] ${kind} failed`, error);
        toast(doc, kind === 'rsvp' ? 'RSVP gagal dikirim' : 'Konfirmasi hadiah gagal dikirim', false);
        dispatch(doc, form, `dinifaqih:${kind}:error`, { error: String(error?.message || error) });
      } finally {
        if (submitter) submitter.disabled = false;
      }
    }, true);

    return true;
  }

  function bindFrame(frame, context = {}) {
    if (!frame?.addEventListener) return false;

    frameContexts.set(frame, mergeContext(frameContexts.get(frame) || {}, context));

    const apply = () => {
      let doc = null;
      try { doc = frame.contentDocument; } catch (_) {}
      if (doc) applyDocument(doc, frameContexts.get(frame) || {});
    };

    if (!boundFrames.has(frame)) {
      boundFrames.add(frame);
      frame.addEventListener('load', apply);
    }

    apply();
    return true;
  }

  applyDocument(document, state);

  window.DiniFaqihPublicActions = {
    setContext,
    applyDocument,
    bindFrame,
    copy: (value, doc) => writeClipboard(value, doc || document),
    postRSVP: (payload = {}) => postJSON('/api/rsvp', {
      ...payload,
      invitation_id: payload.invitation_id || payload.invitationId || state.invitationId,
      guest_name: payload.guest_name || payload.guestName || getGuestName(document, payload),
    }),
    postGiftConfirmation: (payload = {}) => postJSON('/api/gift-confirmation', {
      ...payload,
      invitation_id: payload.invitation_id || payload.invitationId || state.invitationId,
      guest_name: payload.guest_name || payload.guestName || getGuestName(document, payload),
    }),
  };
})();
