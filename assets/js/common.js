/**
 * HADI REAL ESTATE — COMMON CLIENT SCRIPTS
 * Universal header, mobile navigation, floating WhatsApp & Call Me Back widgets,
 * anti-spam form validation, rate limit handling, and standard thank-you messaging:
 * "Thank you. Hadi Real Estate advisor will contact you within 24 hours."
 */

const UNIVERSAL_THANK_YOU_MESSAGE = "Thank you. Hadi Real Estate advisor will contact you within 24 hours.";

document.addEventListener('DOMContentLoaded', () => {
  initCommonNavbar();
  initFloatingWidgets();
  initUniversalModals();
  initUniversalForms();
});

// Format AED numbers
function formatAED(amount) {
  return 'AED ' + Math.round(Number(amount)).toLocaleString('en-US');
}

// --------------------------------------------------------------------------
// 1. NAVBAR MANAGEMENT
// --------------------------------------------------------------------------
function initCommonNavbar() {
  const topNav = document.getElementById('topNav');
  const navBrandLogo = document.getElementById('navBrandLogo');
  const mobileToggle = document.getElementById('mobileNavToggle');
  const fullscreenMenu = document.getElementById('fullscreenMobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link, .mobile-btn');

  const isSolidPage = topNav && topNav.classList.contains('solid-nav');

  function handleScroll() {
    if (!topNav) return;
    if (isSolidPage) return;

    if (window.scrollY > 40) {
      topNav.classList.add('scrolled');
      if (navBrandLogo) {
        navBrandLogo.classList.remove('brand-logo--white');
        navBrandLogo.classList.add('brand-logo--charcoal');
      }
    } else {
      topNav.classList.remove('scrolled');
      if (navBrandLogo) {
        navBrandLogo.classList.remove('brand-logo--charcoal');
        navBrandLogo.classList.add('brand-logo--white');
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  if (mobileToggle && fullscreenMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileToggle.classList.toggle('open');
      fullscreenMenu.classList.toggle('active');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('open');
        fullscreenMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }
}

// --------------------------------------------------------------------------
// 2. FLOATING WHATSAPP & CALL ME BACK WIDGETS
// --------------------------------------------------------------------------
function initFloatingWidgets() {
  if (document.getElementById('floatingActionsContainer')) return;

  const container = document.createElement('div');
  container.id = 'floatingActionsContainer';
  container.className = 'floating-actions-container';

  container.innerHTML = `
    <!-- Floating Call Me Back Button -->
    <button class="floating-btn floating-callback" id="floatingCallbackBtn" aria-label="Request instant call back">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
      <span>Call Me Back</span>
    </button>

    <!-- Floating WhatsApp Button -->
    <a href="https://wa.me/971501234567?text=Hello%20Hadi%20Real%20Estate,%20I%20would%20like%20to%20inquire%20about%20luxury%20properties%20in%20UAE." 
       target="_blank" 
       rel="noopener noreferrer" 
       class="floating-btn floating-whatsapp" 
       id="floatingWhatsappBtn"
       aria-label="Direct WhatsApp Private Chat">
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.074-2.222-.559-1.823-.758-2.997-2.613-3.088-2.734-.09-.121-.734-.977-.734-1.862 0-.886.463-1.32.628-1.498.165-.178.36-.222.48-.222.12 0 .241.002.346.007.11.005.257-.042.402.308.149.362.51 1.246.555 1.338.045.091.075.197.015.318-.06.12-.09.196-.18.302-.09.106-.188.236-.269.317-.091.09-.186.188-.08.37.106.182.469.775 1.009 1.256.696.62 1.282.812 1.464.903.182.09.288.076.395-.046.106-.121.455-.53.576-.712.12-.182.241-.151.405-.091.164.061 1.042.492 1.221.582.179.09.298.136.343.212.045.076.045.439-.099.844zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.662 1.439 5.179L2 22l4.981-1.309A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
      </svg>
      <span>WhatsApp</span>
    </a>
  `;

  document.body.appendChild(container);

  const callbackBtn = document.getElementById('floatingCallbackBtn');
  if (callbackBtn) {
    callbackBtn.addEventListener('click', openCallbackModal);
  }
}

// --------------------------------------------------------------------------
// 3. UNIVERSAL MODALS
// --------------------------------------------------------------------------
function initUniversalModals() {
  document.querySelectorAll('.modal-close-btn, .modal-backdrop-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      document.body.style.overflow = '';
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      document.body.style.overflow = '';
    }
  });

  document.querySelectorAll('.trigger-register-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openVipModal();
    });
  });
}

function openVipModal(presetProperty = '') {
  let modal = document.getElementById('vipModal');
  if (!modal) return;

  const propInput = document.getElementById('vipPropertySelect');
  if (propInput && presetProperty) {
    propInput.value = presetProperty;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function openCallbackModal() {
  let modal = document.getElementById('callbackModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'callbackModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container">
        <button class="modal-close-btn" aria-label="Close modal">&times;</button>
        <div class="form-card-container">
          <div style="text-align: center; margin-bottom: 2rem;">
            <span class="section-tag center">DISCREET CONCIERGE</span>
            <h3 style="font-size: 2rem; margin-bottom: 0.5rem;">Request Instant Call Back</h3>
            <p style="font-size: 0.85rem; color: var(--color-warmgray);">
              A licensed private client advisor will telephone you discreetly.
            </p>
          </div>

          <form id="instantCallbackForm">
            <!-- Anti-spam honeypot -->
            <input type="text" name="hp_website_fax" class="hp-fax-field" tabindex="-1" autocomplete="off">
            <input type="hidden" name="source" value="Floating Call Me Back Modal">

            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div class="form-group">
                <label class="form-label">Your Name *</label>
                <input type="text" name="client_name" class="form-input" placeholder="e.g. Lord Alexander Vance" required>
              </div>

              <div class="form-group">
                <label class="form-label">Phone / WhatsApp Number *</label>
                <input type="tel" name="client_phone" class="form-input" placeholder="+971 50 000 0000" required>
              </div>

              <div class="form-group">
                <label class="form-label">Preferred Time to Call</label>
                <select name="call_time" class="form-select">
                  <option value="Immediately (Within 10 Mins)">Immediately (Within 10 Mins)</option>
                  <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                  <option value="Afternoon (12 PM - 5 PM)">Afternoon (12 PM - 5 PM)</option>
                  <option value="Evening (5 PM - 8 PM)">Evening (5 PM - 8 PM)</option>
                </select>
              </div>

              <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 0.5rem;">
                Request Call Back
              </button>
            </div>
          </form>

          <div class="form-success-box" id="callbackSuccessBox">
            <div class="success-reference">CALL REFERENCE: <span class="ref-number">CALL-8192</span></div>
            <h3 class="success-heading" style="font-size: 1.6rem;">Call Scheduled</h3>
            <p style="color: var(--color-warmgray); font-size: 0.95rem; line-height: 1.8; margin-bottom: 1.5rem;" class="form-thankyou-text">
              ${UNIVERSAL_THANK_YOU_MESSAGE}
            </p>
            <button class="btn btn-outline-charcoal modal-backdrop-close">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.modal-close-btn').addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });
    modal.querySelector('.modal-backdrop-close').addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });

    const form = modal.querySelector('#instantCallbackForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        hp_website_fax: form.querySelector('[name="hp_website_fax"]').value,
        client_name: form.querySelector('[name="client_name"]').value.trim(),
        client_phone: form.querySelector('[name="client_phone"]').value.trim(),
        call_time: form.querySelector('[name="call_time"]').value,
        source: 'Floating Call Me Back Modal'
      };

      try {
        const res = await fetch('/api/callbacks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
          form.style.display = 'none';
          const successBox = modal.querySelector('#callbackSuccessBox');
          if (successBox) {
            successBox.querySelector('.ref-number').textContent = data.refCode || 'CALL-7721';
            const tyElem = successBox.querySelector('.form-thankyou-text');
            if (tyElem) tyElem.textContent = UNIVERSAL_THANK_YOU_MESSAGE;
            successBox.classList.add('visible');
          }
          showToast(UNIVERSAL_THANK_YOU_MESSAGE);
        } else {
          showToast(data.error || 'Submission error');
        }
      } catch (err) {
        showToast('Connection error. Please try again.');
      }
    });
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// --------------------------------------------------------------------------
// 4. UNIVERSAL ANTI-SPAM FORM SUBMISSIONS
// --------------------------------------------------------------------------
function initUniversalForms() {
  document.querySelectorAll('form[data-ajax-endpoint]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const hp = form.querySelector('[name="hp_website_fax"]');
      if (hp && hp.value.trim() !== '') {
        showToast('Automated submission prevented.');
        return;
      }

      const endpoint = form.getAttribute('data-ajax-endpoint');
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
          form.style.display = 'none';
          const container = form.closest('.form-card-container') || form.parentElement;
          const successBox = container.querySelector('.form-success-box');
          if (successBox) {
            const refElem = successBox.querySelector('.ref-number');
            if (refElem) refElem.textContent = data.refCode || data.referenceCode || 'HRE-CONFIRMED';
            
            // Inject exact required thank you message
            let pDesc = successBox.querySelector('p');
            if (pDesc) {
              pDesc.textContent = UNIVERSAL_THANK_YOU_MESSAGE;
            }
            successBox.classList.add('visible');
          }

          if (form.getAttribute('data-brochure-download') === 'true') {
            triggerSimulatedBrochureDownload(payload.project_name || 'Project-Brochure');
          }

          showToast(UNIVERSAL_THANK_YOU_MESSAGE);
        } else {
          showToast(data.error || 'Please verify the details filled in.');
        }
      } catch (err) {
        showToast('Network error. Please try again.');
      }
    });
  });
}

function triggerSimulatedBrochureDownload(projectName) {
  setTimeout(() => {
    const blob = new Blob([
      `HADI REAL ESTATE — PRIVATE OFF-PLAN BROCHURE\n\nProject: ${projectName}\nInvestment Advisory: Discreet UAE Real Estate\nAll Prices in AED\nContact: inquiries@hadirealestate.ae`
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-dossier.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

// --------------------------------------------------------------------------
// 5. TOAST NOTIFICATIONS
// --------------------------------------------------------------------------
function showToast(message) {
  let toast = document.getElementById('toastNotice');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotice';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('visible');

  setTimeout(() => {
    toast.classList.remove('visible');
  }, 5000);
}
