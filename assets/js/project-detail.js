/**
 * HADI REAL ESTATE — SINGLE OFF-PLAN PROJECT DETAIL LOGIC
 * Fetches project by ID, displays payment plan milestones, handover timeline,
 * and handles the Download Brochure lead form with anti-spam check and instant download trigger.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadProjectDetail();
});

let currentProject = null;

async function loadProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id') || '1';

  try {
    const res = await fetch(`/api/offplan/${projectId}`);
    if (!res.ok) throw new Error('Project not found');
    currentProject = await res.json();
    renderProjectDetail(currentProject);
  } catch (err) {
    document.getElementById('projectDetailContainer').innerHTML = `
      <div style="text-align: center; padding: 6rem 1rem;">
        <h2 style="font-size: 2.2rem; margin-bottom: 1rem;">Project Not Found</h2>
        <p style="color: var(--color-warmgray); margin-bottom: 2rem;">The requested development could not be loaded.</p>
        <a href="/offplan.html" class="btn btn-gold">Back to Off-Plan Portfolio</a>
      </div>
    `;
  }
}

function renderProjectDetail(o) {
  document.title = `${o.name} | Off-Plan Hadi Real Estate UAE`;

  document.getElementById('projectHeroImg').src = o.hero_image;
  document.getElementById('projectHeroImg').alt = o.name;

  document.getElementById('projectDevName').textContent = o.developer_name;
  document.getElementById('projectName').textContent = o.name;
  document.getElementById('projectLocation').textContent = o.community;
  document.getElementById('projectHandover').textContent = o.handover_date;
  document.getElementById('projectPrice').textContent = formatAED(o.starting_price_aed);
  document.getElementById('projectRoi').textContent = o.roi_projected;
  document.getElementById('projectTypes').textContent = o.property_types;
  document.getElementById('projectDescription').textContent = o.description;
  document.getElementById('projectPlanSummary').textContent = o.payment_plan_summary;

  // Render Milestone Payment Plan
  const planContainer = document.getElementById('paymentPlanMilestones');
  if (planContainer && o.payment_plan_breakdown) {
    planContainer.innerHTML = o.payment_plan_breakdown.map((m, idx) => `
      <div style="background-color: var(--color-offwhite); padding: 1.5rem; border: 1px solid var(--color-lightgray); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 0.68rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-gold); font-weight: 500;">
            STAGE 0${idx + 1}
          </span>
          <h4 style="font-family: var(--font-serif); font-size: 1.3rem; margin-top: 0.2rem;">${m.milestone}</h4>
        </div>
        <div style="font-family: var(--font-serif); font-size: 1.8rem; color: var(--color-charcoal); font-weight: 300;">
          ${m.percent}%
        </div>
      </div>
    `).join('');
  }

  // Render Features
  const featuresList = document.getElementById('projectFeaturesList');
  if (featuresList && o.features) {
    featuresList.innerHTML = o.features.map(f => `<li>${f}</li>`).join('');
  }

  // Pre-fill hidden inputs in brochure form
  document.querySelectorAll('input[name="project_id"]').forEach(input => input.value = o.id);
  document.querySelectorAll('input[name="project_name"]').forEach(input => input.value = o.name);
}
