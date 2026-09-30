/**
 * HADI REAL ESTATE — HOME PAGE SCRIPT
 * Loads featured properties, featured off-plan projects, and handles search bar routing
 */

document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedProperties();
  loadFeaturedOffPlan();
  initHomeSearchBar();
});

async function loadFeaturedProperties() {
  const container = document.getElementById('featuredPropertiesGrid');
  if (!container) return;

  try {
    const res = await fetch('/api/properties');
    const properties = await res.json();
    
    // Select top 6 featured / signature properties
    const featured = properties.slice(0, 6);

    container.innerHTML = featured.map(p => `
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
  } catch (err) {
    console.error('Error loading featured properties:', err);
  }
}

async function loadFeaturedOffPlan() {
  const container = document.getElementById('featuredOffPlanGrid');
  if (!container) return;

  try {
    const res = await fetch('/api/offplan');
    const projects = await res.json();
    const featured = projects.slice(0, 3);

    container.innerHTML = featured.map(o => `
      <article class="offplan-card" onclick="window.location.href='/project-detail.html?id=${o.id}'">
        <div class="offplan-card-photo">
          <img src="${o.hero_image}" alt="${o.name}" loading="lazy">
        </div>
        <div class="offplan-card-body">
          <span class="offplan-card-dev">${o.developer_name}</span>
          <h3 class="offplan-card-title">${o.name}</h3>
          <span style="font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-warmgray); margin-bottom: 0.8rem; display: block;">
            ${o.community} • Handover ${o.handover_date}
          </span>
          <p style="font-size: 0.85rem; color: var(--color-warmgray); line-height: 1.6; margin-bottom: 1rem;">
            ${o.description.substring(0, 110)}...
          </p>
          <div class="offplan-card-chips">
            <span class="chip-tag">${o.payment_plan_summary}</span>
            <span class="chip-tag">${o.roi_projected}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--color-lightgray);">
            <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--color-warmgray);">From</span>
            <span style="font-family: var(--font-serif); font-size: 1.4rem; color: var(--color-gold); font-weight: 400;">${formatAED(o.starting_price_aed)}</span>
          </div>
        </div>
      </article>
    `).join('');
  } catch (err) {
    console.error('Error loading offplan projects:', err);
  }
}

function initHomeSearchBar() {
  const form = document.getElementById('heroSearchForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const community = form.querySelector('[name="community"]').value;
    const type = form.querySelector('[name="property_type"]').value;
    const beds = form.querySelector('[name="bedrooms"]').value;
    const maxPrice = form.querySelector('[name="max_price"]').value;

    const params = new URLSearchParams();
    if (community && community !== 'all') params.append('community', community);
    if (type && type !== 'all') params.append('type', type);
    if (beds && beds !== 'all') params.append('bedrooms', beds);
    if (maxPrice && maxPrice !== 'all') params.append('maxPrice', maxPrice);

    window.location.href = `/properties.html?${params.toString()}`;
  });
}
