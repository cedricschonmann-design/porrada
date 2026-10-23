// QR codes : affichage (bibliothèque qrcode-generator) et lecture par la caméra (jsQR).

import { h, toast, icon, sheet } from './ui.js';
import { fromCode } from './net.js';

export function qrSvg(text) {
  const q = window.qrcode(0, 'M');
  q.addData(text, 'Byte');
  q.make();
  const n = q.getModuleCount();
  const quiet = 2;
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  const size = n + quiet * 2;
  const wrap = h('div', { class: 'qrbox', 'data-code': text });
  wrap.innerHTML = `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code PORRADA"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  return wrap;
}

// Ouvre la caméra et renvoie le premier code PORRADA lu (ou null si on ferme).
export function scan({ hint = 'Vise le QR code PORRADA de ton partenaire.', onPaste } = {}) {
  return new Promise((resolve) => {
    let done = false;
    let stream = null;
    let raf = 0;
    const video = h('video', { playsinline: true, muted: true, autoplay: true });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const msg = h('div', { class: 'msg' });
    const finish = (val) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      el.remove();
      resolve(val);
    };
    const paste = async () => {
      let text = '';
      try { text = await navigator.clipboard.readText(); } catch (e) { text = ''; }
      const m = fromCode(text);
      if (m) { finish(m); return; }
      const ta = h('textarea', { class: 'input', placeholder: 'PRD1.…', 'aria-label': 'Code PORRADA' });
      sheet((close) => h('div', { class: 'stack' },
        h('h2', null, 'Coller un code'),
        h('p', { class: 'muted' }, 'Colle le code PORRADA que ton partenaire t’a envoyé.'),
        ta,
        h('button', {
          class: 'btn primary block', onclick: () => {
            const mm = fromCode(ta.value);
            if (!mm) { toast("Ce code n'est pas un code PORRADA."); return; }
            close(); finish(mm);
          },
        }, 'Valider'),
      ));
      setTimeout(() => ta.focus(), 250);
    };
    const el = h('div', { class: 'scanner', role: 'dialog', 'aria-label': 'Scanner un code' },
      video,
      h('div', { class: 'frame' }),
      msg,
      h('div', { class: 'hud' },
        h('p', null, hint),
        h('button', { class: 'btn block small', onclick: onPaste || paste }, icon('paste'), 'Coller un code'),
        h('button', { class: 'btn block small', onclick: () => finish(null) }, 'Fermer'),
      ),
    );
    document.getElementById('layer').append(el);

    const tick = () => {
      if (done) return;
      if (video.readyState >= 2 && video.videoWidth) {
        const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
        const w = Math.round(video.videoWidth * scale);
        const hgt = Math.round(video.videoHeight * scale);
        if (canvas.width !== w) { canvas.width = w; canvas.height = hgt; }
        ctx.drawImage(video, 0, 0, w, hgt);
        const img = ctx.getImageData(0, 0, w, hgt);
        const res = window.jsQR(img.data, w, hgt, { inversionAttempts: 'dontInvert' });
        if (res && res.data) {
          const m = fromCode(res.data);
          if (m) { finish(m); return; }
          msg.textContent = "Ce QR code n'est pas un code PORRADA.";
        }
      }
      raf = requestAnimationFrame(tick);
    };

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      msg.textContent = "La caméra n'est pas disponible ici. Utilise « Coller un code ».";
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (done) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        video.srcObject = s;
        video.play().catch(() => {});
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        msg.textContent = "Accès à la caméra refusé. Autorise-le dans Réglages › Safari › Caméra, ou utilise « Coller un code ».";
      });
  });
}
