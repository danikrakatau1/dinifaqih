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
  const SUPABASE_URL = 'https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const GIFT_PROOF_BUCKET = 'gift-proofs';
  const GIFT_PROOF_MAX_BYTES = 5 * 1024 * 1024;
  const GIFT_PROOF_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

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

  function isVisibleNode(node) {
    if (!node?.isConnected || node.hidden || node.getAttribute?.('aria-hidden') === 'true') return false;
    try {
      const view = node.ownerDocument?.defaultView;
      const style = view?.getComputedStyle?.(node);
      if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) return false;
    } catch (_) {}
    return true;
  }

  function isAddressCopyButton(button) {
    if (!button) return false;
    const own = norm(`${button.getAttribute?.('aria-label') || ''} ${button.getAttribute?.('title') || ''} ${button.textContent || ''} ${button.id || ''} ${button.className || ''} ${button.getAttribute?.('data-action') || ''} ${button.getAttribute?.('data-copy-kind') || ''}`);
    if (/(alamat|address)/.test(own)) return true;
    if (!/(salin|copy)/.test(own)) return false;
    const host = button.closest?.('section,article,.card,.elementor-section,.elementor-element');
    return /(alamat|address)/.test(norm(host?.textContent || '').slice(0, 900));
  }

  function candidateVisibleAddress(button) {
    const addressCue = /\b(jl\.?|jalan|jln\.?|gang|gg\.?|dusun|dukuh|desa|kelurahan|kecamatan|kabupaten|kota|rt\.?\s*\d|rw\.?\s*\d|no\.?\s*\d)\b/i;
    const reject = /^(alamat|address|salin alamat|copy alamat|salin|copy|google maps?|lihat maps?|buka maps?|lokasi)$/i;
    const roots = [];
    let node = button?.parentElement || null;
    for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) roots.push({ node, depth });

    const seen = new Set();
    const candidates = [];
    let buttonRect = null;
    try { buttonRect = button.getBoundingClientRect?.() || null; } catch (_) {}

    for (const { node: root, depth } of roots) {
      const nodes = Array.from(root.querySelectorAll?.('[data-address],[data-alamat],address,.alamat,.address,[class*="alamat" i],[class*="address" i],p,span,strong,b,small,div') || []);
      for (const el of nodes) {
        if (seen.has(el) || el === button || el.contains?.(button) || !isVisibleNode(el)) continue;
        seen.add(el);

        const value = text(el.getAttribute?.('data-address') || el.getAttribute?.('data-alamat') || el.getAttribute?.('data-copy-value') || el.value || el.textContent);
        if (!value || value.length < 8 || value.length > 320 || reject.test(value) || /\b(salin|copy)\s+(rekening|nomor)/i.test(value)) continue;
        if (/^\d[\d\s.\-]{5,}$/.test(value)) continue;

        const marked = el.matches?.('[data-address],[data-alamat],address,.alamat,.address,[class*="alamat" i],[class*="address" i]');
        const cue = addressCue.test(value);
        const childOwnsText = Array.from(el.children || []).some((child) => text(child.textContent) === value);
        if (!marked && !cue && childOwnsText) continue;

        let score = (marked ? 180 : 0) + (cue ? 220 : 0) + Math.min(value.length, 120) / 6 - depth * 12;
        try {
          const rect = el.getBoundingClientRect?.();
          if (rect && buttonRect) {
            const vertical = Math.abs((buttonRect.top + buttonRect.bottom) / 2 - (rect.top + rect.bottom) / 2);
            score += Math.max(0, 120 - vertical / 3);
            if (rect.bottom <= buttonRect.top + 24) score += 35;
          }
        } catch (_) {}
        candidates.push({ value, score });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.value || '';
  }

  function candidateCopyValue(button) {
    if (isAddressCopyButton(button)) {
      const visibleAddress = candidateVisibleAddress(button);
      if (visibleAddress) return visibleAddress;
    }

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
      .map((item) => text(item.value || item.textContent))
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
    const isNativeForm = String(form?.tagName || '').toUpperCase() === 'FORM';
    const captureRole = (el, value) => {
      const role = norm(el?.getAttribute?.('data-dini-native-field-role') || '');
      if (!role || value == null || value === '') return;
      if (!Object.prototype.hasOwnProperty.call(out, role)) out[role] = value;
    };

    if (isNativeForm) {
      const FormDataCtor = form.ownerDocument?.defaultView?.FormData || FormData;
      const fd = new FormDataCtor(form);
      for (const [k, v] of fd.entries()) {
        if (typeof v === 'string') out[k] = v;
      }
      form.querySelectorAll('input,select,textarea').forEach((el) => {
        if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
        if (!el.name && el.id && typeof el.value === 'string') out[el.id] = el.value;
        if (typeof el.value === 'string') captureRole(el, el.value);
      });
      return out;
    }

    form?.querySelectorAll?.('input,select,textarea').forEach((el) => {
      const key = el.name || el.id;
      if (!key || typeof el.value !== 'string') return;
      if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
      out[key] = el.value;
      captureRole(el, el.value);
    });
    return out;
  }

  function selectedGiftProof(form) {
    const inputs = Array.from(form?.querySelectorAll?.('input[type="file"]') || []);
    return inputs.map((input) => input.files?.[0]).find(Boolean) || null;
  }

  function safeProofFilename(raw) {
    const value = text(raw || 'proof').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-100);
    return value || 'proof';
  }

  async function uploadGiftProof(file, invitationId) {
    if (!file) return '';
    if (!GIFT_PROOF_TYPES.has(String(file.type || '').toLowerCase())) throw new Error('proof_type_not_allowed');
    if (Number(file.size || 0) <= 0) throw new Error('proof_file_empty');
    if (Number(file.size || 0) > GIFT_PROOF_MAX_BYTES) throw new Error('proof_file_too_large');

    const random = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`).replace(/[^a-zA-Z0-9-]/g, '');
    const objectPath = `${invitationId}/${Date.now()}-${random}-${safeProofFilename(file.name)}`;
    const encodedPath = objectPath.split('/').map((part) => encodeURIComponent(part)).join('/');
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${GIFT_PROOF_BUCKET}/${encodedPath}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': file.type,
        'x-upsert': 'false',
      },
      body: file,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[public-action-bridge] gift proof upload failed', res.status, detail);
      throw new Error(`proof_upload_http_${res.status}`);
    }
    return objectPath;
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
    const semanticKind = norm(form?.getAttribute?.('data-dini-native-form-kind') || '');
    if (semanticKind === 'rsvp' || semanticKind === 'gift') return semanticKind;
    if (semanticKind === 'guestbook') return '';
    const hay = norm(`${form.id} ${form.className} ${form.getAttribute('action') || ''} ${form.textContent}`);
    const giftByText = /gift|hadiah|konfirmasi hadiah|transfer|bukti\s*tf/.test(hay);
    const giftByFields = /nama\s*bank/.test(hay) && /nominal/.test(hay);
    if (giftByText || giftByFields) return 'gift';
    if (/rsvp|kehadiran|hadir|ucapan/.test(hay)) return 'rsvp';
    return '';
  }

  function giftClickRoot(button) {
    const form = button?.closest?.('form');
    if (form) return form;
    return button?.closest?.('[data-gift-confirm],[data-gift],.gift-confirmation,.gift-confirm,.gift-modal,[id*="gift" i],[class*="gift" i],dialog,section,article') || button?.parentElement || null;
  }

  function isGiftConfirmButton(button) {
    if (!button?.matches || isCopyButton(button)) return false;
    const label = norm(button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent);
    if (!/(konfirmasi|confirm|kirim|submit|selesai)/.test(label)) return false;

    const ownHint = norm(`${button.id || ''} ${button.className || ''} ${button.getAttribute('data-action') || ''} ${button.getAttribute('data-gift-confirm') || ''}`);
    if (/gift|hadiah|transfer/.test(`${ownHint} ${label}`)) return true;

    const root = giftClickRoot(button);
    const contextText = norm(root?.textContent || '').slice(0, 1800);
    return /gift|hadiah|transfer/.test(contextText);
  }

  async function handlePublicForm(form, kind, context = {}) {
    const values = collectForm(form);
    const invitationId = text(
      values.invitation_id || values.invitationId || form.dataset.invitationId ||
      context.invitationId || context.invitation_id || state.invitationId || window.__INVITATION_ID__
    );
    const guestName = text(
      values.guest_name || values.guestName || values.name || values.nama || values['form_fields[nama]'] ||
      context.guestName || context.guest_name || getGuestName(form.ownerDocument, context)
    );
    if (!invitationId) throw new Error('invitation_id_missing');
    if (!guestName) throw new Error('guest_name_missing');

    if (kind === 'rsvp') {
      const attendanceRaw = values.attendance || values.status || values.kehadiran || values.rsvp || values.konfirmasikehadiran || values['form_fields[konfirmasikehadiran]'] || 'hadir';
      const guestCountRaw = values.guest_count || values.guestCount || values.pax || values.jumlah || values['form_fields[jumlah]'] || 1;
      const guestCount = Number.parseInt(String(guestCountRaw), 10) || 1;
      const message = values.message || values.note || values.ucapan || values['form_fields[ucapan]'] || values.wishes || '';
      return postJSON('/api/rsvp', {
        invitation_id: invitationId,
        guest_name: guestName,
        attendance: attendanceValue(attendanceRaw),
        guest_count: guestCount,
        message,
      });
    }

    const giftValue = (...hints) => {
      for (const [key, value] of Object.entries(values)) {
        const compactKey = String(key).toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (!hints.some((hint) => compactKey === hint || compactKey.endsWith(hint))) continue;
        const payload = text(value);
        if (payload) return payload;
      }
      return '';
    };

    const bankName = values.bank_name || values.bankName || values.bank || values.rekening || values['form_fields[nama_bank]'] || values['form_fields[namabank]'] || giftValue('namabank', 'bankname', 'bank');
    const amount = values.amount || values.nominal || values.jumlah || values['form_fields[nominal]'] || giftValue('nominal', 'amount');
    const note = values.note || values.message || values.ucapan || values['form_fields[ucapan]'] || giftValue('ucapan', 'note', 'message');
    const selectedProof = selectedGiftProof(form);
    const uploadedProofPath = selectedProof ? await uploadGiftProof(selectedProof, invitationId) : '';
    const proofPath = uploadedProofPath || values.proof_path || values.proofPath || values.proof_url || values.proofUrl || '';
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

    doc.addEventListener('click', async (event) => {
      const target = event.target;
      const button = target?.closest ? target.closest('button,a,[role="button"]') : null;
      if (!button || !isGiftConfirmButton(button)) return;

      const ownerForm = button.closest?.('form') || null;
      const explicitType = norm(button.getAttribute('type') || '');
      const tag = String(button.tagName || '').toUpperCase();
      const submitsNatively = !!ownerForm && (
        explicitType === 'submit' ||
        (tag === 'BUTTON' && !explicitType)
      );
      if (submitsNatively) return;

      const root = ownerForm || giftClickRoot(button);
      if (!root) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const canDisable = 'disabled' in button;
      if (canDisable) button.disabled = true;
      try {
        await handlePublicForm(root, 'gift', contextForDocument(doc));
        toast(doc, 'Konfirmasi hadiah berhasil dikirim');
        dispatch(doc, root, 'dinifaqih:gift:success');
      } catch (error) {
        console.error('[public-action-bridge] gift click failed', error);
        toast(doc, 'Konfirmasi hadiah gagal dikirim', false);
        dispatch(doc, root, 'dinifaqih:gift:error', { error: String(error?.message || error) });
      } finally {
        if (canDisable) button.disabled = false;
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