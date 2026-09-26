export function initPayPalModal() {
  const PAYPAL_ME = 'https://paypal.me/MajidAbarghooei';
  const QR_URL    = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(PAYPAL_ME)}`;

  const modal = document.createElement('div');
  modal.id = 'ppModal';
  modal.className = 'pp-modal-backdrop';
  // The QR image is only requested when the dialog is first opened, so visitors
  // who never open it make no request to the QR service.
  modal.innerHTML = `
    <div class="pp-modal" role="dialog" aria-modal="true" aria-labelledby="ppTitle" aria-describedby="ppDesc">
      <button class="pp-close" type="button" aria-label="Close"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <div class="pp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg></div>
      <h3 class="pp-title" id="ppTitle">Support GameBeeper</h3>
      <p class="pp-desc" id="ppDesc">Scan with your phone camera or the PayPal app, or open PayPal below.</p>
      <div class="pp-qr-wrap">
        <img data-src="${QR_URL}" alt="QR code linking to GameBeeper's PayPal.me page" width="220" height="220" class="pp-qr" />
      </div>
      <a href="${PAYPAL_ME}" target="_blank" rel="noopener noreferrer" class="btn btn-primary pp-link">Open PayPal.me</a>
      <p class="pp-thanks">Thank you — it genuinely helps keep the signal running.</p>
    </div>`;
  document.body.appendChild(modal);

  let trigger = null;
  const closeBtn = modal.querySelector('.pp-close');
  const isOpen = () => modal.classList.contains('open');

  const open = el => {
    trigger = el;
    const qr = modal.querySelector('.pp-qr');
    if (qr && !qr.src) qr.src = qr.dataset.src;
    modal.classList.add('open');
    setTimeout(() => closeBtn.focus(), 30);
  };
  const close = () => {
    if (!isOpen()) return;
    modal.classList.remove('open');
    trigger?.focus?.();
    trigger = null;
  };

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll('button, a[href]');
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-support]');
    if (btn) { e.preventDefault(); open(btn); }
  });
}
