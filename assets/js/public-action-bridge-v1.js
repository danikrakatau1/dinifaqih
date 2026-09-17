(() => {
  'use strict';

  const state = {
    invitationId: '',
    guestName: '',
  };

  const text = (value) => String(value ?? '').trim();
  const norm = (value) => text(value).toLowerCase().replace(/\s+/g, ' ');

  function getGuestName() {
    if (state.guestName) return state.guestName;
    const qs = new URLSearchParams(location.search);
    const fromQuery = text(qs.get('to') || qs.get('guest') || qs.get('name'));
    if (fromQuery) return fromQuery;
    const path = location.pathname.replace(/^\/+|\/+$/g, '');
    if (path && !/^(index\.html?|guest-entry-v18\.html?)$/i.test(path)) {
      try { return decodeURIComponent(path.split('/').pop()).replace(/[-_]+/g, ' ').trim(); } catch (_) {}
    }
    return '';
  }

  function setContext(next = {}) {
    if (next.invitationId) state.invitationId = text(next.invitationId);
    if (next.guestName) state.guestName = text(next.guestName);
  }

  async function writeClipboard(value) {
    const payload = text(value);
    if (!payload) throw new Error('empty_clipboard_payload');

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(payload);
      return true;
    }

    const ta = document.createElement('textarea');
    ta.value = payload;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('copy_failed');
    return true;
  }

  function toast(message, ok = true) {
    const el = document.createElement('div');
    el.textContent = message;
    el.setAttribute('role', 'status');
    Object.assign(el.style, {
      position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
      zIndex: '2147483647', padding: '10px 14px', borderRadius: '999px',
      font: '600 13px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      color: ok ? '#fff' : '#fff', background: ok ? 'rgba(20,20,20,.92)' : 'rgba(150,25,25,.94)',
      boxShadow: '0 10px 30px rgba(0,0,0,.22)', opacity: '0', transition: 'opacity .18s ease, transform .18s ease'
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(-2px)'; });
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(4px)';
      setTimeout(() => el.remove(), 220);
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
    if (!el) return false;
    const label = norm(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent);
    return el.matches('[data-copy],[data-clipboard-text]') || /salin|copy|rekening|alamat/.test(label) && /salin|copy/.test(label);
  }

  function collectForm(form) {
    const out = {};
    const fd = new FormData(form);
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
    if (/rsvp|kehadiran|hadir|ucapan/.test(hay)) return 'rsvp';
    if (/gift|hadiah|konfirmasi hadiah|transfer/.test(hay)) return 'gift';
    return '';
  }

  async function handlePublicForm(form, kind) {
    const values = collectForm(form);
    const invitationId = text(values.invitation_id || values.invitationId || form.dataset.invitationId || state.invitationId || window.__INVITATION_ID__);
    const guestName = text(values.guest_name || values.guestName || values.name || getGuestName());
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

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button,a,[role="button"]');
    if (!button || !isCopyButton(button)) return;
    const value = candidateCopyValue(button);
    if (!value) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      await writeClipboard(value);
      toast('Berhasil disalin');
      button.dispatchEvent(new CustomEvent('dinifaqih:copied', { bubbles: true, detail: { value } }));
    } catch (error) {
      console.error('[public-action-bridge] copy failed', error);
      toast('Gagal menyalin', false);
    }
  }, true);

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const kind = classifyForm(form);
    if (!kind) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const submitter = event.submitter || form.querySelector('[type="submit"]');
    if (submitter) submitter.disabled = true;
    try {
      await handlePublicForm(form, kind);
      toast(kind === 'rsvp' ? 'RSVP berhasil dikirim' : 'Konfirmasi hadiah berhasil dikirim');
      form.dispatchEvent(new CustomEvent(`dinifaqih:${kind}:success`, { bubbles: true }));
    } catch (error) {
      console.error(`[public-action-bridge] ${kind} failed`, error);
      toast(kind === 'rsvp' ? 'RSVP gagal dikirim' : 'Konfirmasi hadiah gagal dikirim', false);
      form.dispatchEvent(new CustomEvent(`dinifaqih:${kind}:error`, { bubbles: true, detail: { error: String(error?.message || error) } }));
    } finally {
      if (submitter) submitter.disabled = false;
    }
  }, true);

  window.DiniFaqihPublicActions = {
    setContext,
    copy: writeClipboard,
    postRSVP: (payload) => postJSON('/api/rsvp', { ...payload, invitation_id: payload.invitation_id || state.invitationId, guest_name: payload.guest_name || getGuestName() }),
    postGiftConfirmation: (payload) => postJSON('/api/gift-confirmation', { ...payload, invitation_id: payload.invitation_id || state.invitationId, guest_name: payload.guest_name || getGuestName() }),
  };
})();
