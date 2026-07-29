(function setupCoupAds(root) {
    const ADSENSE_CLIENT = 'ca-pub-5483968891175594';
    const AD_SLOTS = {
        rankedWaiting: '6425587327'
    };

    const SCRIPT_ID = 'coup-adsense-script';
    const SLOT_SELECTOR = '.coup-ad-slot[data-ad-slot-key]';

    function hasAdsenseConfig(slotKey) {
        return Boolean(ADSENSE_CLIENT && AD_SLOTS[slotKey]);
    }

    function loadAdsenseScript() {
        if (!ADSENSE_CLIENT || document.getElementById(SCRIPT_ID)) return;

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
        document.head.appendChild(script);
    }

    function renderPlaceholder(container) {
        container.classList.add('is-placeholder');
        container.dataset.adRendered = 'placeholder';
        container.replaceChildren();
    }

    function renderAdsenseSlot(container) {
        const slotKey = container.dataset.adSlotKey;
        if (container.dataset.adRendered === 'adsense') return;
        if (!hasAdsenseConfig(slotKey)) {
            renderPlaceholder(container);
            return;
        }

        loadAdsenseScript();
        container.classList.remove('is-placeholder');
        container.dataset.adRendered = 'adsense';
        container.replaceChildren();

        const ad = document.createElement('ins');
        ad.className = 'adsbygoogle';
        ad.style.display = 'block';
        ad.dataset.adClient = ADSENSE_CLIENT;
        ad.dataset.adSlot = AD_SLOTS[slotKey];
        ad.dataset.adFormat = 'auto';
        ad.dataset.fullWidthResponsive = 'true';
        container.append(ad);

        try {
            (root.adsbygoogle = root.adsbygoogle || []).push({});
        } catch (error) {
            renderPlaceholder(container);
        }
    }

    function renderAll() {
        document.querySelectorAll(SLOT_SELECTOR).forEach(renderAdsenseSlot);
    }

    root.CoupAds = {
        renderAll,
        renderSlot: renderAdsenseSlot
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderAll, { once: true });
    } else {
        renderAll();
    }
})(window);
