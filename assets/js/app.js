/**
 * HADI REAL ESTATE — LUXURY UAE REAL ESTATE INTERACTION LOGIC
 * Architecture: Vanilla JS, Zero External Libraries
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initProperties();
  initMortgageCalculator();
  initModals();
  initForms();
  initSmoothScroll();
});

/* --------------------------------------------------------------------------
   1. NAVIGATION & SCROLL MANAGEMENT
   -------------------------------------------------------------------------- */
function initNavbar() {
  const topNav = document.getElementById('topNav');
  const navBrandLogo = document.getElementById('navBrandLogo');
  const mobileToggle = document.getElementById('mobileNavToggle');
  const fullscreenMenu = document.getElementById('fullscreenMobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link, .mobile-btn');

  function handleScroll() {
    if (window.scrollY > 40) {
      topNav.classList.add('scrolled');
      navBrandLogo.classList.remove('brand-logo--white');
      navBrandLogo.classList.add('brand-logo--charcoal');
    } else {
      topNav.classList.remove('scrolled');
      navBrandLogo.classList.remove('brand-logo--charcoal');
      navBrandLogo.classList.add('brand-logo--white');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Trigger initial check

  // Mobile menu toggle
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

/* --------------------------------------------------------------------------
   2. CURATED PROPERTY DATA & FILTERING
   -------------------------------------------------------------------------- */
const PROPERTIES_DATA = [
  {
    id: 'palm-horizon',
    name: 'The Palm Horizon Villa',
    category: 'villas',
    status: 'Ready to Move',
    isOffPlan: false,
    community: 'Palm Jumeirah, Dubai',
    priceAED: 48000000,
    priceDisplay: 'From AED 48,000,000',
    beds: 6,
    baths: 7,
    sqft: 11200,
    image: 'assets/images/palm-villa.jpg',
    description: 'An architectural masterwork perched on an exclusive private frond. Featuring private white-sand beach access, 22-meter infinity pool facing the Dubai skyline, Italian travertine cladding, and floor-to-ceiling panoramic glass walls.',
    features: ['Direct Beachfront Access', 'Private Infinity Pool', 'Designer Show Kitchen', 'Smart Automation Suite', 'Staff Quarters']
  },
  {
    id: 'downtown-penthouse',
    name: 'The Celeste Sky Penthouse',
    category: 'penthouses',
    status: 'Exclusive Ready',
    isOffPlan: false,
    community: 'Downtown Dubai',
    priceAED: 34500000,
    priceDisplay: 'From AED 34,500,000',
    beds: 4,
    baths: 5,
    sqft: 7850,
    image: 'assets/images/downtown-penthouse.jpg',
    description: 'Commanding uninterrupted 360-degree vistas of the illuminated Burj Khalifa and the Arabian Gulf. Includes private high-speed elevator access, double-height ceilings, Calacatta marble throughout, and rooftop jacuzzi terrace.',
    features: ['Burj Khalifa View', 'Private Sky Pool & Terrace', 'Double Height Ceilings', 'Calacatta Gold Marble', 'Concierge & Valet']
  },
  {
    id: 'hills-mansion',
    name: 'The Oasis Serenity Mansion',
    category: 'villas',
    status: 'Ready to Move',
    isOffPlan: false,
    community: 'Dubai Hills Estate',
    priceAED: 58000000,
    priceDisplay: 'From AED 58,000,000',
    beds: 7,
    baths: 9,
    sqft: 16500,
    image: 'assets/images/hills-mansion.jpg',
    description: 'A discreet architectural sanctuary set directly overlooking championship fairways. Features cascading water reflection courts, private cinema, wellness spa, subterranean 8-car gallery, and sculpted olive tree courtyards.',
    features: ['Championship Golf Course View', 'Private Cinema & Spa', '8-Car Subterranean Gallery', 'Reflection Water Gardens', 'Ultra-Private Plot']
  },
  {
    id: 'celeste-tower',
    name: 'Celeste Tower Residences',
    category: 'offplan',
    status: 'Off-Plan • Q4 2027',
    isOffPlan: true,
    community: 'Downtown Dubai',
    priceAED: 4800000,
    priceDisplay: 'From AED 4,800,000',
    beds: 3,
    baths: 4,
    sqft: 2850,
    image: 'assets/images/celeste-tower.jpg',
    description: 'A 50-storey sculptural icon featuring cantilevered sky gardens and organic fluid glass curves. Designed for discerning investors seeking premium rental yields and long-term capital appreciation in central Dubai.',
    features: ['Flexible 70/30 Payment Plan', 'Cantilevered Sky Gardens', 'Private Resident Club & Cigar Lounge', '9.4% Projected Net Yield', 'VIP Handover Q4 2027']
  },
  {
    id: 'waterfront-residence',
    name: 'Jumeirah Pearl Waterfront',
    category: 'ready',
    status: 'Ready to Move',
    isOffPlan: false,
    community: 'Pearl Jumeira, Dubai',
    priceAED: 26000000,
    priceDisplay: 'From AED 26,000,000',
    beds: 5,
    baths: 6,
    sqft: 8900,
    image: 'assets/images/waterfront-residence.jpg',
    description: 'Serene coastal elegance situated along the calm turquoise marina canal. Boasts private yacht berth capability, double-height light-filled salon, bespoke walnut paneling, and sunset harbor views.',
    features: ['Private Yacht Berth Berth Capable', 'Double Height Salon', 'Panoramic Marina Views', 'Chef Prep Kitchen', 'Private Elevator']
  },
  {
    id: 'estate-sanctuary',
    name: 'The Dune Sanctuary',
    category: 'offplan',
    status: 'Off-Plan • Q2 2028',
    isOffPlan: true,
    community: 'Saadiyat Island, Abu Dhabi',
    priceAED: 32000000,
    priceDisplay: 'From AED 32,000,000',
    beds: 6,
    baths: 8,
    sqft: 12400,
    image: 'assets/images/estate-sanctuary.jpg',
    description: 'An elite low-density architectural development harmonizing desert sanctuary dunes with private turquoise lagoons. Located moments from Abu Dhabi’s world-renowned cultural district and Louvre Abu Dhabi.',
    features: ['60/40 Payment Plan', 'Private Crystal Lagoon', 'Adjacent to Cultural District', 'Sustainable LEED Platinum', 'VIP Beach Club Membership']
  }
];

function initProperties() {
  const grid = document.getElementById('propertiesGrid');
  const tabs = document.querySelectorAll('.filter-tab');

  if (!grid) return;

  function renderProperties(filterCategory = 'all') {
    grid.innerHTML = '';

    const filtered = PROPERTIES_DATA.filter(item => {
      if (filterCategory === 'all') return true;
      if (filterCategory === 'ready') return !item.isOffPlan;
      if (filterCategory === 'offplan') return item.isOffPlan;
      return item.category === filterCategory;
    });

    filtered.forEach(prop => {
      const card = document.createElement('article');
      card.className = 'property-card';
      card.setAttribute('data-id', prop.id);
      
      card.innerHTML = `
        <div class="property-card-photo-wrapper">
          <img src="${prop.image}" alt="${prop.name}" class="property-card-photo" loading="lazy">
          <span class="property-card-badge ${prop.isOffPlan ? 'offplan' : ''}">${prop.status}</span>
        </div>
        <div class="property-card-content">
          <div class="property-card-divider"></div>
          <h3 class="property-card-title">${prop.name}</h3>
          <div class="property-card-specs">
            <span class="property-card-spec-item">${prop.beds} Beds</span>
            <span>•</span>
            <span class="property-card-spec-item">${prop.baths} Baths</span>
            <span>•</span>
            <span class="property-card-spec-item">${prop.sqft.toLocaleString()} Sq.Ft</span>
          </div>
          <div class="property-card-meta">
            <span class="property-card-area">${prop.community}</span>
            <span class="property-card-price">${prop.priceDisplay}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openPropertyModal(prop));
      grid.appendChild(card);
    });
  }

  // Filter tabs click
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProperties(tab.getAttribute('data-filter'));
    });
  });

  // Initial render
  renderProperties('all');
}

/* --------------------------------------------------------------------------
   3. UAE MORTGAGE CALCULATOR
   Standard UAE Central Bank Regulations:
   - Expats/Nationals min 20% down payment
   - DLD Transfer Fee: 4% of property price
   - Mortgage registration fee: 0.25% of loan amount + AED 290
   - Term: up to 25 years
   -------------------------------------------------------------------------- */
function initMortgageCalculator() {
  const priceSlider = document.getElementById('calcPriceSlider');
  const priceDisplay = document.getElementById('calcPriceDisplay');
  const downSlider = document.getElementById('calcDownSlider');
  const downDisplay = document.getElementById('calcDownDisplay');
  const termSlider = document.getElementById('calcTermSlider');
  const termDisplay = document.getElementById('calcTermDisplay');
  const rateSlider = document.getElementById('calcRateSlider');
  const rateDisplay = document.getElementById('calcRateDisplay');

  const monthlyDisplay = document.getElementById('calcMonthlyPayment');
  const loanAmountDisplay = document.getElementById('calcLoanAmount');
  const totalInterestDisplay = document.getElementById('calcTotalInterest');
  const dldFeeDisplay = document.getElementById('calcDldFee');

  if (!priceSlider || !downSlider || !termSlider || !rateSlider) return;

  function formatAED(amount) {
    return 'AED ' + Math.round(amount).toLocaleString('en-US');
  }

  function calculate() {
    const price = parseFloat(priceSlider.value);
    const downPercent = parseFloat(downSlider.value);
    const years = parseFloat(termSlider.value);
    const interestRate = parseFloat(rateSlider.value);

    const downPaymentAmount = price * (downPercent / 100);
    const loanAmount = price - downPaymentAmount;

    // Display inputs
    priceDisplay.textContent = formatAED(price);
    downDisplay.textContent = `${downPercent}% (${formatAED(downPaymentAmount)})`;
    termDisplay.textContent = `${years} Years`;
    rateDisplay.textContent = `${interestRate.toFixed(2)}%`;

    // Monthly installment formula
    const monthlyRate = (interestRate / 100) / 12;
    const totalMonths = years * 12;

    let monthlyPayment = 0;
    if (monthlyRate > 0) {
      monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    } else {
      monthlyPayment = loanAmount / totalMonths;
    }

    const totalPaid = monthlyPayment * totalMonths;
    const totalInterest = totalPaid - loanAmount;
    const dldFee = price * 0.04; // 4% DLD fee

    monthlyDisplay.textContent = formatAED(monthlyPayment);
    loanAmountDisplay.textContent = formatAED(loanAmount);
    totalInterestDisplay.textContent = formatAED(totalInterest);
    dldFeeDisplay.textContent = formatAED(dldFee);
  }

  priceSlider.addEventListener('input', calculate);
  downSlider.addEventListener('input', calculate);
  termSlider.addEventListener('input', calculate);
  rateSlider.addEventListener('input', calculate);

  // Initialize calculation
  calculate();
}

/* --------------------------------------------------------------------------
   4. MODALS (PROPERTY QUICK VIEW & VIP REGISTRATION)
   -------------------------------------------------------------------------- */
let activePropertyForInquiry = null;

function initModals() {
  const propertyModal = document.getElementById('propertyModal');
  const vipModal = document.getElementById('vipModal');
  const closeButtons = document.querySelectorAll('.modal-close-btn, .modal-backdrop-close');

  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (propertyModal) propertyModal.classList.remove('active');
      if (vipModal) vipModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  });

  // Escape key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (propertyModal) propertyModal.classList.remove('active');
      if (vipModal) vipModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Open VIP Modal triggers
  const registerTriggers = document.querySelectorAll('.trigger-register-modal');
  registerTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openVipModal();
    });
  });
}

function openPropertyModal(prop) {
  const modal = document.getElementById('propertyModal');
  if (!modal) return;

  activePropertyForInquiry = prop;

  document.getElementById('modalPropImg').src = prop.image;
  document.getElementById('modalPropImg').alt = prop.name;
  document.getElementById('modalPropTag').textContent = prop.status;
  document.getElementById('modalPropTitle').textContent = prop.name;
  document.getElementById('modalPropLocation').textContent = prop.community;
  document.getElementById('modalPropPrice').textContent = prop.priceDisplay;
  document.getElementById('modalPropDesc').textContent = prop.description;
  document.getElementById('modalPropBeds').textContent = `${prop.beds} Bedrooms`;
  document.getElementById('modalPropBaths').textContent = `${prop.baths} Bathrooms`;
  document.getElementById('modalPropSqft').textContent = `${prop.sqft.toLocaleString()} Sq.Ft`;
  document.getElementById('modalPropType').textContent = prop.isOffPlan ? 'Off-Plan Project' : 'Ready Residence';

  const featuresList = document.getElementById('modalPropFeatures');
  if (featuresList) {
    featuresList.innerHTML = prop.features.map(f => `<li>• ${f}</li>`).join('');
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function openVipModal(presetProperty = null) {
  const modal = document.getElementById('vipModal');
  if (!modal) return;

  const select = document.getElementById('vipPropertySelect');
  if (select && presetProperty) {
    select.value = presetProperty.name;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/* --------------------------------------------------------------------------
   5. CLIENT INQUIRY & VIP REGISTRATION (NO EMAIL SENDING AS REQUESTED)
   -------------------------------------------------------------------------- */
function initForms() {
  const inquiryForm = document.getElementById('vipInquiryForm');
  const modalInquiryForm = document.getElementById('modalVipForm');
  const modalInquireNowBtn = document.getElementById('modalInquireNowBtn');

  if (modalInquireNowBtn) {
    modalInquireNowBtn.addEventListener('click', () => {
      const propModal = document.getElementById('propertyModal');
      if (propModal) propModal.classList.remove('active');
      openVipModal(activePropertyForInquiry);
    });
  }

  function handleFormSubmission(form, isModal = false) {
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = form.querySelector('[name="client_name"]').value.trim();
      const phone = form.querySelector('[name="client_phone"]').value.trim();
      
      if (!name || !phone) {
        showToast('Please provide your name and contact phone number.');
        return;
      }

      // Generate a luxury reference ID
      const refCode = 'HRE-' + Math.floor(10000 + Math.random() * 90000);

      // Hide input elements, show elegant luxury confirmation card
      const formCard = form.closest('.form-card-container') || form.parentElement;
      const successBox = formCard.querySelector('.form-success-box');

      if (successBox) {
        const refElem = successBox.querySelector('.ref-number');
        if (refElem) refElem.textContent = refCode;
        form.style.display = 'none';
        successBox.classList.add('visible');
      }

      showToast(`Interest registered. Reference: ${refCode}`);
    });
  }

  handleFormSubmission(inquiryForm, false);
  handleFormSubmission(modalInquiryForm, true);
}

/* --------------------------------------------------------------------------
   6. TOAST NOTIFICATION
   -------------------------------------------------------------------------- */
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
  }, 4000);
}

/* --------------------------------------------------------------------------
   7. SMOOTH SCROLL FOR IN-PAGE LINKS
   -------------------------------------------------------------------------- */
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}
