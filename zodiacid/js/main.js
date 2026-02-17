/* ==========================================================
   ZodiacID — Main JavaScript
   Cookie consent, GA4, form handling, smooth scroll, mobile nav
   ========================================================== */

(function () {
  'use strict';

  // ========== Cookie Consent ==========
  const CONSENT_KEY = 'cookie_consent';
  const GA4_ID = 'G-XXXXXXXXXX'; // Replace with actual GA4 ID

  function initCookieConsent() {
    const consent = localStorage.getItem(CONSENT_KEY);

    if (consent === 'accepted') {
      loadGA4();
      return;
    }

    if (consent === 'declined') {
      return;
    }

    // Show banner
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.classList.remove('hidden');

      banner.querySelector('.btn-accept')?.addEventListener('click', function () {
        localStorage.setItem(CONSENT_KEY, 'accepted');
        banner.classList.add('hidden');
        loadGA4();
      });

      banner.querySelector('.btn-decline')?.addEventListener('click', function () {
        localStorage.setItem(CONSENT_KEY, 'declined');
        banner.classList.add('hidden');
      });
    }
  }

  function loadGA4() {
    if (document.querySelector('script[src*="googletagmanager"]')) return;

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA4_ID);

    initScrollTracking();
    initCTATracking();
  }

  // ========== GA4 Event Tracking ==========
  function trackEvent(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  }

  function initCTATracking() {
    document.querySelectorAll('.btn-gold, .btn-outline').forEach(function (btn) {
      btn.addEventListener('click', function () {
        trackEvent('cta_click', {
          product: btn.dataset.product || 'unknown',
          location: btn.dataset.location || 'unknown',
          text: btn.textContent.trim().substring(0, 50)
        });
      });
    });
  }

  function initScrollTracking() {
    var thresholds = [25, 50, 75, 100];
    var fired = {};

    window.addEventListener('scroll', function () {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      var percent = Math.round((scrollTop / docHeight) * 100);

      thresholds.forEach(function (t) {
        if (percent >= t && !fired[t]) {
          fired[t] = true;
          trackEvent('scroll_depth', { percent: t });
        }
      });
    }, { passive: true });
  }

  // ========== Form Handling ==========
  function initForms() {
    document.querySelectorAll('.order-form form, .contact-form form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Validate required fields
        var valid = true;
        form.querySelectorAll('[required]').forEach(function (field) {
          var group = field.closest('.form-group') || field.closest('.form-checkbox');
          if (!group) return;

          if (field.type === 'checkbox') {
            if (!field.checked) {
              valid = false;
              group.classList.add('has-error');
              var err = group.querySelector('.field-error');
              if (err) err.style.display = 'block';
            } else {
              group.classList.remove('has-error');
              var err = group.querySelector('.field-error');
              if (err) err.style.display = 'none';
            }
          } else {
            if (!field.value.trim()) {
              valid = false;
              group.classList.add('has-error');
              var err = group.querySelector('.field-error');
              if (err) err.style.display = 'block';
            } else {
              group.classList.remove('has-error');
              var err = group.querySelector('.field-error');
              if (err) err.style.display = 'none';
            }
          }
        });

        if (!valid) return;

        // Disable submit button
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting...';
        }

        // Submit via fetch (Web3Forms)
        var formData = new FormData(form);

        fetch(form.action, {
          method: 'POST',
          body: formData
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data.success) {
              // Show success message
              var formEl = form.closest('.order-form') || form.closest('.contact-form');
              if (formEl) {
                form.style.display = 'none';
                var success = formEl.querySelector('.form-success');
                if (success) success.style.display = 'block';
              }

              trackEvent('form_submit', {
                product: formData.get('product') || 'contact',
                price: formData.get('price') || '0'
              });
            } else {
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = submitBtn.dataset.originalText || 'Submit';
              }
              alert('Something went wrong. Please try again or email us at contact@zodiacid.com');
            }
          })
          .catch(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = submitBtn.dataset.originalText || 'Submit';
            }
            alert('Connection error. Please try again or email us at contact@zodiacid.com');
          });
      });

      // Clear error on input
      form.querySelectorAll('input, select, textarea').forEach(function (field) {
        field.addEventListener('input', function () {
          var group = field.closest('.form-group');
          if (group) {
            group.classList.remove('has-error');
            var err = group.querySelector('.field-error');
            if (err) err.style.display = 'none';
          }
        });
      });

      // Store original button text
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.dataset.originalText = submitBtn.textContent;
      }
    });
  }

  // ========== Smooth Scroll ==========
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (targetId === '#') return;

        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ========== Mobile Navigation ==========
  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.nav-links');

    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        nav.classList.toggle('open');
        var isOpen = nav.classList.contains('open');
        toggle.setAttribute('aria-expanded', isOpen);
        toggle.innerHTML = isOpen ? '&#x2715;' : '&#9776;';
      });

      // Close on link click
      nav.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          nav.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.innerHTML = '&#9776;';
        });
      });
    }
  }

  // ========== Sample Page Tabs ==========
  function initTabs() {
    document.querySelectorAll('.tabs').forEach(function (tabContainer) {
      var buttons = tabContainer.querySelectorAll('.tab-btn');
      var panels = tabContainer.parentElement.querySelectorAll('.tab-panel');

      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var target = btn.dataset.tab;

          buttons.forEach(function (b) { b.classList.remove('active'); });
          panels.forEach(function (p) { p.classList.remove('active'); });

          btn.classList.add('active');
          var panel = document.getElementById(target);
          if (panel) panel.classList.add('active');

          trackEvent('tab_switch', { tab: target });
        });
      });
    });
  }

  // ========== Initialize ==========
  document.addEventListener('DOMContentLoaded', function () {
    initCookieConsent();
    initForms();
    initSmoothScroll();
    initMobileNav();
    initTabs();
  });
})();
