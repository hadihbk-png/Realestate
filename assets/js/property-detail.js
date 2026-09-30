/**
 * HADI REAL ESTATE — SINGLE PROPERTY DETAIL LOGIC
 * Fetches property by ID, populates gallery, specs, and handles Book Viewing & Enquire forms
 */

document.addEventListener('DOMContentLoaded', () => {
  loadPropertyDetail();
});

let currentProperty = null;

async function loadPropertyDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const propId = urlParams.get('id') || '1';

  try {
    const res = await fetch(`/api/properties/${propId}`);
    if (!res.ok) throw new Error('Property not found');
    currentProperty = await res.json();
    renderPropertyDetail(currentProperty);
  } catch (err) {
    document.getElementById('propertyDetailContainer').innerHTML = `
      <div style="text-align: center; padding: 6rem 1rem;">
        <h2 style="font-size: 2.2rem; margin-bottom: 1rem;">Residence Not Found</h2>
        <p style="color: var(--color-warmgray); margin-bottom: 2rem;">The requested luxury property could not be loaded.</p>
        <a href="/properties.html" class="btn btn-gold">Back to Portfolio</a>
      </div>
    `;
  }
}

function renderPropertyDetail(p) {
  document.title = `${p.title} | Hadi Real Estate UAE`;

  // Hero Image & Title
  const mainImg = document.getElementById('propMainImage');
  if (mainImg) {
    mainImg.src = p.image;
    mainImg.alt = p.title;
  }

  document.getElementById('propBadge').textContent = p.is_ready ? 'Ready to Move' : 'Off-Plan';
  document.getElementById('propTitle').textContent = p.title;
  document.getElementById('propCommunity').textContent = p.community;
  document.getElementById('propPrice').textContent = formatAED(p.price_aed);
  document.getElementById('propDescription').textContent = p.description;

  // Specs
  document.getElementById('propBeds').textContent = `${p.bedrooms} Beds`;
  document.getElementById('propBaths').textContent = `${p.bathrooms} Baths`;
  document.getElementById('propSqft').textContent = `${Number(p.sqft).toLocaleString()} Sq.Ft`;
  document.getElementById('propType').textContent = p.property_type;

  // Features
  const featuresList = document.getElementById('propFeaturesList');
  if (featuresList && p.features) {
    featuresList.innerHTML = p.features.map(f => `<li>${f}</li>`).join('');
  }

  // Gallery Thumbnails
  const thumbsContainer = document.getElementById('propThumbsContainer');
  if (thumbsContainer && p.gallery_images && p.gallery_images.length > 0) {
    const images = [p.image, ...p.gallery_images.filter(img => img !== p.image)];
    thumbsContainer.innerHTML = images.map((img, idx) => `
      <img src="${img}" alt="${p.title} ${idx + 1}" class="gallery-thumb ${idx === 0 ? 'active' : ''}" onclick="switchMainImage('${img}', this)" style="width: 100px; height: 75px; object-fit: cover; cursor: pointer; border: 1px solid var(--color-lightgray);">
    `).join('');
  }

  // Pre-fill hidden property IDs in forms
  document.querySelectorAll('input[name="property_id"]').forEach(input => input.value = p.id);
  document.querySelectorAll('input[name="property_title"]').forEach(input => input.value = p.title);

  // Set default viewing date to tomorrow
  const dateInput = document.getElementById('viewingDateInput');
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = tomorrow.toISOString().split('T')[0];
    dateInput.min = new Date().toISOString().split('T')[0];
  }
}

function switchMainImage(imgSrc, thumbElem) {
  document.getElementById('propMainImage').src = imgSrc;
  document.querySelectorAll('.gallery-thumb').forEach(t => t.style.borderColor = 'var(--color-lightgray)');
  thumbElem.style.borderColor = 'var(--color-gold)';
}
