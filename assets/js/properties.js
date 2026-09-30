/**
 * HADI REAL ESTATE — PROPERTIES LISTING SCRIPT
 * Live filters, sorting, URL synchronization, and card rendering
 */

document.addEventListener('DOMContentLoaded', () => {
  initPropertiesPage();
});

let allProperties = [];

async function initPropertiesPage() {
  const grid = document.getElementById('propertiesGrid');
  const countDisplay = document.getElementById('propertiesCount');
  const searchInput = document.getElementById('propSearchInput');
  const communitySelect = document.getElementById('propCommunitySelect');
  const typeSelect = document.getElementById('propTypeSelect');
  const bedsSelect = document.getElementById('propBedsSelect');
  const priceSelect = document.getElementById('propPriceSelect');
  const sortSelect = document.getElementById('propSortSelect');
  const resetBtn = document.getElementById('propResetBtn');

  // Parse URL query params
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('community')) communitySelect.value = urlParams.get('community');
  if (urlParams.get('type')) typeSelect.value = urlParams.get('type');
  if (urlParams.get('bedrooms')) bedsSelect.value = urlParams.get('bedrooms');
  if (urlParams.get('maxPrice')) priceSelect.value = urlParams.get('maxPrice');
  if (urlParams.get('search')) searchInput.value = urlParams.get('search');

  try {
    const res = await fetch('/api/properties');
    allProperties = await res.json();
    applyFilters();
  } catch (err) {
    console.error('Failed to fetch properties:', err);
  }

  function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    const community = communitySelect.value;
    const type = typeSelect.value;
    const beds = bedsSelect.value;
    const maxPrice = priceSelect.value;
    const sort = sortSelect.value;

    let filtered = allProperties.filter(p => {
      if (community !== 'all' && !p.community.toLowerCase().includes(community.toLowerCase())) return false;
      if (type !== 'all' && !p.property_type.toLowerCase().includes(type.toLowerCase())) return false;
      if (beds !== 'all') {
        const b = parseInt(beds, 10);
        if (b >= 5 ? p.bedrooms < 5 : p.bedrooms !== b) return false;
      }
      if (maxPrice !== 'all' && p.price_aed > parseInt(maxPrice, 10)) return false;
      if (query && !p.title.toLowerCase().includes(query) && !p.community.toLowerCase().includes(query)) return false;
      return true;
    });

    // Sorting
    if (sort === 'price-asc') {
      filtered.sort((a, b) => a.price_aed - b.price_aed);
    } else if (sort === 'price-desc') {
      filtered.sort((a, b) => b.price_aed - a.price_aed);
    } else if (sort === 'beds-desc') {
      filtered.sort((a, b) => b.bedrooms - a.bedrooms);
    }

    if (countDisplay) {
      countDisplay.textContent = `Showing ${filtered.length} of ${allProperties.length} residences`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <p style="font-family: var(--font-serif); font-size: 1.8rem; margin-bottom: 0.5rem;">No Properties Found</p>
          <p style="color: var(--color-warmgray); font-size: 0.9rem;">Try adjusting your search criteria or resetting filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => `
      <article class="property-card" onclick="window.location.href='/property-detail.html?id=${p.id}'">
        <div class="property-card-photo-wrapper">
          <img src="${p.image}" alt="${p.title}" class="property-card-photo" loading="lazy">
          <span class="property-card-badge">${p.is_ready ? 'Ready to Move' : 'Off-Plan'}</span>
        </div>
        <div class="property-card-content">
          <div class="property-card-divider"></div>
          <h3 class="property-card-title">${p.title}</h3>
          <div class="property-card-specs">
            <span>${p.bedrooms} Beds</span>
            <span>•</span>
            <span>${p.bathrooms} Baths</span>
            <span>•</span>
            <span>${Number(p.sqft).toLocaleString()} Sq.Ft</span>
          </div>
          <div class="property-card-meta">
            <span class="property-card-area">${p.community}</span>
            <span class="property-card-price">${formatAED(p.price_aed)}</span>
          </div>
        </div>
      </article>
    `).join('');
  }

  [searchInput, communitySelect, typeSelect, bedsSelect, priceSelect, sortSelect].forEach(el => {
    if (el) el.addEventListener('input', applyFilters);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      searchInput.value = '';
      communitySelect.value = 'all';
      typeSelect.value = 'all';
      bedsSelect.value = 'all';
      priceSelect.value = 'all';
      sortSelect.value = 'price-desc';
      applyFilters();
    });
  }
}
