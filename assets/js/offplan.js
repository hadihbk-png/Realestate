/**
 * HADI REAL ESTATE — OFF-PLAN PROJECTS SCRIPT
 * Loads off-plan projects with filters: community, handover year, and developer
 */

document.addEventListener('DOMContentLoaded', () => {
  initOffPlanPage();
});

let allProjects = [];

async function initOffPlanPage() {
  const grid = document.getElementById('offplanGrid');
  const countDisplay = document.getElementById('offplanCount');
  const communitySelect = document.getElementById('offplanCommunitySelect');
  const handoverSelect = document.getElementById('offplanHandoverSelect');

  try {
    const res = await fetch('/api/offplan');
    allProjects = await res.json();
    render();
  } catch (err) {
    console.error('Failed to load off-plan projects:', err);
  }

  function render() {
    const comm = communitySelect ? communitySelect.value : 'all';
    const year = handoverSelect ? handoverSelect.value : 'all';

    const filtered = allProjects.filter(o => {
      if (comm !== 'all' && !o.community.toLowerCase().includes(comm.toLowerCase())) return false;
      if (year !== 'all' && !o.handover_date.includes(year)) return false;
      return true;
    });

    if (countDisplay) {
      countDisplay.textContent = `Displaying ${filtered.length} visionary developments`;
    }

    grid.innerHTML = filtered.map(o => `
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
          <p style="font-size: 0.88rem; color: var(--color-warmgray); line-height: 1.6; margin-bottom: 1.2rem;">
            ${o.description.substring(0, 120)}...
          </p>
          <div class="offplan-card-chips">
            <span class="chip-tag">${o.payment_plan_summary}</span>
            <span class="chip-tag">${o.roi_projected}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--color-lightgray);">
            <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--color-warmgray);">Starting From</span>
            <span style="font-family: var(--font-serif); font-size: 1.45rem; color: var(--color-gold); font-weight: 400;">${formatAED(o.starting_price_aed)}</span>
          </div>
        </div>
      </article>
    `).join('');
  }

  if (communitySelect) communitySelect.addEventListener('change', render);
  if (handoverSelect) handoverSelect.addEventListener('change', render);
}
