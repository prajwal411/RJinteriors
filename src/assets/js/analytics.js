// Google Analytics 4. The build adds this file, with the measurement ID, only when GA4_ID is set.
// Phone, WhatsApp and email clicks are sent as "contact_click" events, so enquiries can be counted.
(function () {
  const id = document.currentScript && document.currentScript.dataset.ga4;
  if (!id) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id);

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    const method = href.startsWith('tel:') ? 'phone'
      : href.startsWith('mailto:') ? 'email'
        : href.startsWith('https://wa.me/') ? 'whatsapp' : '';
    // The address only, without the message filled in for the visitor
    if (method) window.gtag('event', 'contact_click', { method, link_url: href.split('?')[0] });
  });
})();
