/**
 * HADI REAL ESTATE — DATABASE ACCESS LAYER & IN-MEMORY REPOSITORY
 * Enhanced with:
 * - Lead Scoring Engine (0-100; HOT, WARM, COLD)
 * - Stage Management (New, Contacted, Viewing, Offer, Won, Lost)
 * - 2% Commission Calculation on Closed Deals & Marking Property Sold
 * - Role-Based Visibility (Agents only see their own leads; Admin sees all)
 * - Activity Tracking & Stale Leads (3+ days inactive)
 * - Property & Project CRUD Operations
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const seedData = require('./seedData');

let pool = null;
let isNeonConnected = false;
let connectionError = null;

// In-Memory Repository
const memoryStore = {
  developers: JSON.parse(JSON.stringify(seedData.DEVELOPERS)),
  offplan_projects: JSON.parse(JSON.stringify(seedData.OFFPLAN_PROJECTS)),
  properties: JSON.parse(JSON.stringify(seedData.PROPERTIES)),
  staff_logins: JSON.parse(JSON.stringify(seedData.STAFF_LOGINS)),
  buyer_leads: JSON.parse(JSON.stringify(seedData.SAMPLE_LEADS)),
  viewings: JSON.parse(JSON.stringify(seedData.SAMPLE_VIEWINGS)),
  completed_sales: JSON.parse(JSON.stringify(seedData.SAMPLE_SALES)),
  notes: JSON.parse(JSON.stringify(seedData.SAMPLE_NOTES)),
  valuations: []
};

// ==============================================================================
// 1. LEAD SCORING ALGORITHM (0 - 100)
// ==============================================================================
function calculateLeadScore(lead) {
  let score = 0;

  // Criterion A: Phone number provided (+20 pts)
  const phone = (lead.phone || lead.client_phone || '').trim();
  if (phone.replace(/\D/g, '').length >= 7) {
    score += 20;
  }

  // Criterion B: Cash buyer / payment readiness (+25 pts)
  const allText = `${lead.budget_aed || ''} ${lead.notes || ''} ${lead.payment_method || ''}`.toLowerCase();
  if (
    allText.includes('cash') || 
    allText.includes('full asking price') || 
    allText.includes('own funds') || 
    allText.includes('pre-approved') || 
    allText.includes('immediate transfer') ||
    allText.includes('check') ||
    allText.includes('cheque')
  ) {
    score += 25;
  } else if (allText.includes('mortgage') || allText.includes('finance') || allText.includes('bank')) {
    score += 15;
  }

  // Criterion C: Ready to buy soon / Timeline (+20 pts)
  const timeText = `${lead.timeline || ''} ${lead.notes || ''} ${lead.source || ''}`.toLowerCase();
  if (
    timeText.includes('immediate') || 
    timeText.includes('viewing') || 
    timeText.includes('this week') || 
    timeText.includes('today') ||
    timeText.includes('urgent') ||
    timeText.includes('soon') ||
    timeText.includes('2 weeks')
  ) {
    score += 20;
  } else if (timeText.includes('month') || timeText.includes('30 days') || timeText.includes('60 days')) {
    score += 12;
  } else {
    score += 5;
  }

  // Criterion D: Bigger budgets (up to +25 pts)
  const budgetStr = (lead.budget_aed || '').toLowerCase();
  if (
    budgetStr.includes('75m') || 
    budgetStr.includes('60m') || 
    budgetStr.includes('68m') || 
    budgetStr.includes('58m') || 
    budgetStr.includes('52m') || 
    budgetStr.includes('48m')
  ) {
    score += 25;
  } else if (budgetStr.includes('35m') || budgetStr.includes('30m') || budgetStr.includes('32m') || budgetStr.includes('34m')) {
    score += 20;
  } else if (budgetStr.includes('15m') || budgetStr.includes('20m') || budgetStr.includes('23m') || budgetStr.includes('25m') || budgetStr.includes('18m')) {
    score += 15;
  } else if (budgetStr.includes('5m') || budgetStr.includes('7m') || budgetStr.includes('8m')) {
    score += 10;
  } else {
    score += 5;
  }

  // Criterion E: Specific property interest (+10 pts)
  if (lead.specific_property_id || lead.specific_property_title || lead.property_id || lead.property_title) {
    score += 10;
  } else if (lead.source && (lead.source.includes('Property Detail') || lead.source.includes('Book a Viewing') || lead.source.includes('Off-Plan'))) {
    score += 10;
  }

  // Clamp 0 - 100
  score = Math.min(100, Math.max(0, score));

  // Determine Label
  let score_label = 'WARM';
  if (score >= 70) {
    score_label = 'HOT';
  } else if (score < 40) {
    score_label = 'COLD';
  }

  return { score, score_label };
}

// ==============================================================================
// 2. DATABASE INITIALIZATION
// ==============================================================================
async function initDatabase() {
  const dbUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();

  if (!dbUrl || dbUrl === 'your_neon_database_connection_string_here') {
    console.log('\n------------------------------------------------------------');
    console.log(' [HADI REAL ESTATE] DATABASE NOTICE:');
    console.log(' No Neon DATABASE_URL found in .env');
    console.log(' Running with pre-seeded In-Memory Store (All 15 properties, 6 off-plans, 40 leads active).');
    console.log(' To connect Neon, paste your URL into: c:\\Users\\hadih\\HadiRealeState\\.env');
    console.log('------------------------------------------------------------\n');
    return false;
  }

  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000
    });

    const client = await pool.connect();
    console.log('\n============================================================');
    console.log(' [HADI REAL ESTATE] SUCCESS: Connected to Neon PostgreSQL!');
    console.log('============================================================\n');
    client.release();

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log(' [DB] Tables verified/created successfully in Neon.');
    }

    const countCheck = await pool.query('SELECT count(*) FROM properties');
    const existingCount = parseInt(countCheck.rows[0].count, 10);

    if (existingCount === 0) {
      console.log(' [DB] Seeding Neon database with sample data...');
      await seedNeonDatabase();
      console.log(' [DB] Neon database seeded with 5 developers, 6 off-plans, 15 properties, staff, 40 leads, 10 viewings, 5 sales!');
    } else {
      console.log(` [DB] Neon database active (${existingCount} properties found).`);
    }

    isNeonConnected = true;
    return true;
  } catch (err) {
    connectionError = err.message;
    console.error(' [DB] Neon connection notice:', err.message);
    console.log(' [DB] Gracefully using in-memory store with full dataset.');
    return false;
  }
}

async function seedNeonDatabase() {
  if (!pool) return;

  for (const s of seedData.STAFF_LOGINS) {
    await pool.query(
      `INSERT INTO staff_logins (id, name, email, password_hash, role, phone, license_no, bio, avatar_url, monthly_target_aed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.name, s.email, s.password_hash, s.role, s.phone, s.license_no, s.bio, s.avatar_url, s.monthly_target_aed]
    );
  }

  for (const d of seedData.DEVELOPERS) {
    await pool.query(
      `INSERT INTO developers (id, name, slug, origin, established_year, description, track_record_value_aed, completed_projects_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [d.id, d.name, d.slug, d.origin, d.established_year, d.description, d.track_record_value_aed, d.completed_projects_count]
    );
  }

  for (const o of seedData.OFFPLAN_PROJECTS) {
    await pool.query(
      `INSERT INTO offplan_projects (id, name, slug, developer_id, developer_name, community, starting_price_aed, handover_date, payment_plan_summary, payment_plan_breakdown, roi_projected, property_types, description, features, brochure_filename, hero_image, gallery_images, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (id) DO NOTHING`,
      [o.id, o.name, o.slug, o.developer_id, o.developer_name, o.community, o.starting_price_aed, o.handover_date, o.payment_plan_summary, JSON.stringify(o.payment_plan_breakdown), o.roi_projected, o.property_types, o.description, o.features, o.brochure_filename, o.hero_image, o.gallery_images, o.is_featured]
    );
  }

  for (const p of seedData.PROPERTIES) {
    await pool.query(
      `INSERT INTO properties (id, title, slug, community, property_type, price_aed, bedrooms, bathrooms, sqft, description, features, image, gallery_images, is_ready, is_featured, is_sold, sold_price_aed, sold_date, assigned_agent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.title, p.slug, p.community, p.property_type, p.price_aed, p.bedrooms, p.bathrooms, p.sqft, p.description, p.features, p.image, p.gallery_images, p.is_ready, p.is_featured, p.is_sold || false, p.sold_price_aed || null, p.sold_date || null, p.assigned_agent_id]
    );
  }

  for (const l of seedData.SAMPLE_LEADS) {
    await pool.query(
      `INSERT INTO buyer_leads (id, full_name, email, phone, budget_aed, preferred_community, property_type, source, stage, status, score, score_label, payment_method, timeline, specific_property_id, specific_property_title, notes, assigned_agent_id, assigned_agent_name, last_activity_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (id) DO NOTHING`,
      [l.id, l.full_name, l.email, l.phone, l.budget_aed, l.preferred_community, l.property_type, l.source, l.stage, l.status, l.score, l.score_label, l.payment_method, l.timeline, l.specific_property_id, l.specific_property_title, l.notes, l.assigned_agent_id, l.assigned_agent_name, l.last_activity_at]
    );
  }

  for (const v of seedData.SAMPLE_VIEWINGS) {
    await pool.query(
      `INSERT INTO viewings (id, property_id, property_title, lead_id, client_name, client_phone, agent_id, agent_name, viewing_date, viewing_time, status, special_requests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [v.id, v.property_id, v.property_title, v.lead_id, v.client_name, v.client_phone, v.agent_id, v.agent_name, v.viewing_date, v.viewing_time, v.status, v.special_requests]
    );
  }

  for (const s of seedData.SAMPLE_SALES) {
    await pool.query(
      `INSERT INTO completed_sales (id, property_id, property_name, lead_id, buyer_name, agent_id, agent_name, sale_price_aed, commission_aed, closing_date, community)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.property_id, s.property_name, s.lead_id, s.buyer_name, s.agent_id, s.agent_name, s.sale_price_aed, s.commission_aed, s.closing_date, s.community]
    );
  }

  for (const n of seedData.SAMPLE_NOTES) {
    await pool.query(
      `INSERT INTO notes (id, lead_id, property_id, author_agent_id, author_name, note_text, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [n.id, n.lead_id, n.property_id, n.author_agent_id, n.author_name, n.note_text, n.created_at]
    );
  }
}

// ==============================================================================
// 3. LEADS & PIPELINE CRUD
// ==============================================================================

// Round-robin agents for auto-assignment of incoming website leads
const AGENT_LIST = [
  { id: 2, name: 'Rashid Al-Mansoor' },
  { id: 3, name: 'Elena Rostova' },
  { id: 4, name: 'Tariq Al-Hashimi' }
];
let nextAgentIndex = 0;

async function createLead(lead) {
  const referenceCode = 'HRE-' + Math.floor(10000 + Math.random() * 90000);
  const { score, score_label } = calculateLeadScore(lead);

  const assigned = AGENT_LIST[nextAgentIndex % AGENT_LIST.length];
  nextAgentIndex++;

  const nowIso = new Date().toISOString();

  if (isNeonConnected && pool) {
    const res = await pool.query(
      `INSERT INTO buyer_leads (
        full_name, email, phone, budget_aed, preferred_community, property_type,
        source, stage, status, score, score_label, payment_method, timeline,
        specific_property_id, specific_property_title, notes,
        assigned_agent_id, assigned_agent_name, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        lead.full_name,
        lead.email || null,
        lead.phone,
        lead.budget_aed || 'Not Specified',
        lead.preferred_community || null,
        lead.property_type || null,
        lead.source || 'Website Form',
        'New',
        'New Lead',
        score,
        score_label,
        lead.payment_method || null,
        lead.timeline || null,
        lead.specific_property_id || lead.property_id || null,
        lead.specific_property_title || lead.property_title || null,
        lead.notes || null,
        assigned.id,
        assigned.name,
        nowIso
      ]
    );
    return { ...res.rows[0], referenceCode };
  }

  const newLead = {
    id: memoryStore.buyer_leads.length + 1,
    full_name: lead.full_name,
    email: lead.email || '',
    phone: lead.phone,
    budget_aed: lead.budget_aed || 'Not Specified',
    preferred_community: lead.preferred_community || '',
    property_type: lead.property_type || '',
    source: lead.source || 'Website Form',
    stage: 'New',
    status: 'New Lead',
    score,
    score_label,
    payment_method: lead.payment_method || '',
    timeline: lead.timeline || '',
    specific_property_id: lead.specific_property_id || lead.property_id || null,
    specific_property_title: lead.specific_property_title || lead.property_title || '',
    notes: lead.notes || '',
    assigned_agent_id: assigned.id,
    assigned_agent_name: assigned.name,
    last_activity_at: nowIso,
    created_at: nowIso
  };

  memoryStore.buyer_leads.unshift(newLead);
  return { ...newLead, referenceCode };
}

async function getLeads(filters = {}, user = { role: 'Admin', id: 1 }) {
  let leads = [];

  if (isNeonConnected && pool) {
    let query = 'SELECT * FROM buyer_leads WHERE 1=1';
    const params = [];
    let idx = 1;

    // Agent only sees their own leads
    if (user.role === 'Agent') {
      query += ` AND assigned_agent_id = $${idx}`;
      params.push(user.id);
      idx++;
    }

    if (filters.stage && filters.stage !== 'all') {
      query += ` AND stage = $${idx}`;
      params.push(filters.stage);
      idx++;
    }

    if (filters.score_label && filters.score_label !== 'all') {
      query += ` AND score_label = $${idx}`;
      params.push(filters.score_label);
      idx++;
    }

    if (filters.search) {
      query += ` AND (LOWER(full_name) LIKE LOWER($${idx}) OR LOWER(phone) LIKE LOWER($${idx}) OR LOWER(email) LIKE LOWER($${idx}) OR LOWER(notes) LIKE LOWER($${idx}))`;
      params.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.stale === 'true') {
      // 3+ days inactive and not Won or Lost
      query += ` AND last_activity_at < NOW() - INTERVAL '3 days' AND stage NOT IN ('Won', 'Lost')`;
    }

    query += ' ORDER BY id DESC';
    const res = await pool.query(query, params);
    leads = res.rows;
  } else {
    leads = memoryStore.buyer_leads.filter(l => {
      // Agent only sees their own leads
      if (user.role === 'Agent' && l.assigned_agent_id !== user.id) return false;

      if (filters.stage && filters.stage !== 'all' && l.stage !== filters.stage) return false;
      if (filters.score_label && filters.score_label !== 'all' && l.score_label !== filters.score_label) return false;

      if (filters.search) {
        const q = filters.search.toLowerCase();
        const str = `${l.full_name} ${l.phone} ${l.email || ''} ${l.notes || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }

      if (filters.stale === 'true') {
        const lastAct = new Date(l.last_activity_at || l.created_at).getTime();
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        if (lastAct > threeDaysAgo || l.stage === 'Won' || l.stage === 'Lost') return false;
      }

      return true;
    });
  }

  return leads;
}

async function getLeadById(id, user = { role: 'Admin', id: 1 }) {
  let lead = null;
  let notes = [];
  let viewings = [];

  if (isNeonConnected && pool) {
    const res = await pool.query('SELECT * FROM buyer_leads WHERE id = $1', [id]);
    lead = res.rows[0];
    if (lead) {
      const notesRes = await pool.query('SELECT * FROM notes WHERE lead_id = $1 ORDER BY id DESC', [id]);
      notes = notesRes.rows;
      const viewingsRes = await pool.query('SELECT * FROM viewings WHERE lead_id = $1 ORDER BY id DESC', [id]);
      viewings = viewingsRes.rows;
    }
  } else {
    lead = memoryStore.buyer_leads.find(l => l.id === parseInt(id, 10));
    if (lead) {
      notes = memoryStore.notes.filter(n => n.lead_id === lead.id);
      viewings = memoryStore.viewings.filter(v => v.lead_id === lead.id);
    }
  }

  if (!lead) return null;

  // Agent permission check
  if (user.role === 'Agent' && lead.assigned_agent_id !== user.id) {
    return { error: 'Unauthorized to view this lead.' };
  }

  return { ...lead, notes, viewings };
}

async function updateLeadStage(id, newStage, user = null) {
  const nowIso = new Date().toISOString();

  if (isNeonConnected && pool) {
    const res = await pool.query(
      `UPDATE buyer_leads 
       SET stage = $1, status = $1, last_activity_at = $2 
       WHERE id = $3 RETURNING *`,
      [newStage, nowIso, id]
    );
    return res.rows[0];
  }

  const lead = memoryStore.buyer_leads.find(l => l.id === parseInt(id, 10));
  if (lead) {
    lead.stage = newStage;
    lead.status = newStage;
    lead.last_activity_at = nowIso;
    return lead;
  }
  return null;
}

async function assignLeadAgent(leadId, agentId, agentName) {
  const nowIso = new Date().toISOString();

  if (isNeonConnected && pool) {
    const res = await pool.query(
      `UPDATE buyer_leads 
       SET assigned_agent_id = $1, assigned_agent_name = $2, last_activity_at = $3 
       WHERE id = $4 RETURNING *`,
      [agentId, agentName, nowIso, leadId]
    );
    return res.rows[0];
  }

  const lead = memoryStore.buyer_leads.find(l => l.id === parseInt(leadId, 10));
  if (lead) {
    lead.assigned_agent_id = parseInt(agentId, 10);
    lead.assigned_agent_name = agentName;
    lead.last_activity_at = nowIso;
    return lead;
  }
  return null;
}

async function addLeadNote(leadId, noteText, authorId, authorName) {
  const nowIso = new Date().toISOString();

  if (isNeonConnected && pool) {
    const res = await pool.query(
      `INSERT INTO notes (lead_id, author_agent_id, author_name, note_text, created_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [leadId, authorId, authorName, noteText, nowIso]
    );
    await pool.query(`UPDATE buyer_leads SET last_activity_at = $1 WHERE id = $2`, [nowIso, leadId]);
    return res.rows[0];
  }

  const newNote = {
    id: memoryStore.notes.length + 1,
    lead_id: parseInt(leadId, 10),
    author_agent_id: authorId,
    author_name: authorName,
    note_text: noteText,
    created_at: nowIso
  };
  memoryStore.notes.unshift(newNote);

  const lead = memoryStore.buyer_leads.find(l => l.id === parseInt(leadId, 10));
  if (lead) lead.last_activity_at = nowIso;

  return newNote;
}

// When a lead is marked "Won":
// Asks for the sale price, works out 2% commission, records the sale, and marks the property as SOLD!
async function markLeadWon(leadId, salePriceAed, propertyId, propertyName, agentId, agentName, buyerName) {
  const price = parseInt(salePriceAed, 10);
  const commission = Math.round(price * 0.02); // 2% commission
  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  // 1. Update lead stage to Won
  await updateLeadStage(leadId, 'Won');

  // 2. Mark property as sold
  if (propertyId) {
    if (isNeonConnected && pool) {
      await pool.query(
        `UPDATE properties 
         SET is_sold = true, sold_price_aed = $1, sold_date = $2 
         WHERE id = $3`,
        [price, todayStr, propertyId]
      );
    } else {
      const prop = memoryStore.properties.find(p => p.id === parseInt(propertyId, 10));
      if (prop) {
        prop.is_sold = true;
        prop.sold_price_aed = price;
        prop.sold_date = todayStr;
      }
    }
  }

  // 3. Record Completed Sale
  if (isNeonConnected && pool) {
    const res = await pool.query(
      `INSERT INTO completed_sales (
        property_id, property_name, lead_id, buyer_name, agent_id, agent_name,
        sale_price_aed, commission_aed, closing_date, community
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        propertyId || null,
        propertyName || 'Prime UAE Residence',
        leadId,
        buyerName || 'Private Client',
        agentId || 2,
        agentName || 'Rashid Al-Mansoor',
        price,
        commission,
        todayStr,
        'Dubai, UAE'
      ]
    );
    return res.rows[0];
  }

  const newSale = {
    id: memoryStore.completed_sales.length + 1,
    property_id: propertyId ? parseInt(propertyId, 10) : null,
    property_name: propertyName || 'Prime UAE Residence',
    lead_id: parseInt(leadId, 10),
    buyer_name: buyerName || 'Private Client',
    agent_id: agentId || 2,
    agent_name: agentName || 'Rashid Al-Mansoor',
    sale_price_aed: price,
    commission_aed: commission,
    closing_date: todayStr,
    community: 'Dubai, UAE'
  };
  memoryStore.completed_sales.unshift(newSale);
  return newSale;
}

// ==============================================================================
// 4. PROPERTY & PROJECT MANAGEMENT (ADD, EDIT, REMOVE)
// ==============================================================================

async function getProperties(filters = {}) {
  if (isNeonConnected && pool) {
    let query = 'SELECT * FROM properties WHERE 1=1';
    const params = [];
    let idx = 1;

    if (filters.community && filters.community !== 'all') {
      query += ` AND LOWER(community) LIKE LOWER($${idx})`;
      params.push(`%${filters.community}%`);
      idx++;
    }
    if (filters.property_type && filters.property_type !== 'all') {
      query += ` AND LOWER(property_type) LIKE LOWER($${idx})`;
      params.push(`%${filters.property_type}%`);
      idx++;
    }
    if (filters.bedrooms && filters.bedrooms !== 'all') {
      const beds = parseInt(filters.bedrooms, 10);
      if (beds >= 5) {
        query += ` AND bedrooms >= $${idx}`;
      } else {
        query += ` AND bedrooms = $${idx}`;
      }
      params.push(beds);
      idx++;
    }
    if (filters.max_price && filters.max_price !== 'all') {
      query += ` AND price_aed <= $${idx}`;
      params.push(parseInt(filters.max_price, 10));
      idx++;
    }
    if (filters.search) {
      query += ` AND (LOWER(title) LIKE LOWER($${idx}) OR LOWER(community) LIKE LOWER($${idx}))`;
      params.push(`%${filters.search}%`);
      idx++;
    }

    query += ' ORDER BY price_aed DESC';
    const res = await pool.query(query, params);
    return res.rows;
  }

  return memoryStore.properties.filter(p => {
    if (filters.community && filters.community !== 'all') {
      if (!p.community.toLowerCase().includes(filters.community.toLowerCase())) return false;
    }
    if (filters.property_type && filters.property_type !== 'all') {
      if (!p.property_type.toLowerCase().includes(filters.property_type.toLowerCase())) return false;
    }
    if (filters.bedrooms && filters.bedrooms !== 'all') {
      const b = parseInt(filters.bedrooms, 10);
      if (b >= 5 ? p.bedrooms < 5 : p.bedrooms !== b) return false;
    }
    if (filters.max_price && filters.max_price !== 'all' && p.price_aed > parseInt(filters.max_price, 10)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.community.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

async function getPropertyById(id) {
  if (isNeonConnected && pool) {
    const res = await pool.query('SELECT * FROM properties WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return memoryStore.properties.find(p => p.id === parseInt(id, 10) || p.slug === id) || null;
}

async function addProperty(data) {
  const slug = (data.title || 'property').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(100 + Math.random() * 900);
  const price = parseInt(data.price_aed, 10) || 5000000;
  const beds = parseInt(data.bedrooms, 10) || 3;
  const baths = parseInt(data.bathrooms, 10) || 4;
  const sqft = parseInt(data.sqft, 10) || 2500;

  if (isNeonConnected && pool) {
    const res = await pool.query(
      `INSERT INTO properties (
        title, slug, community, property_type, price_aed, bedrooms, bathrooms, sqft,
        description, features, image, is_ready, is_featured, is_sold
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false) RETURNING *`,
      [
        data.title, slug, data.community, data.property_type, price, beds, baths, sqft,
        data.description || 'Exclusive luxury residence.',
        data.features || ['Prime Location', 'Full Luxury Finishes'],
        data.image || 'assets/images/palm-villa.jpg',
        data.is_ready !== false,
        data.is_featured === true
      ]
    );
    return res.rows[0];
  }

  const newProp = {
    id: memoryStore.properties.length + 1,
    title: data.title,
    slug,
    community: data.community,
    property_type: data.property_type,
    price_aed: price,
    bedrooms: beds,
    bathrooms: baths,
    sqft,
    description: data.description || 'Exclusive luxury residence.',
    features: data.features || ['Prime Location', 'Full Luxury Finishes'],
    image: data.image || 'assets/images/palm-villa.jpg',
    gallery_images: [data.image || 'assets/images/palm-villa.jpg'],
    is_ready: data.is_ready !== false,
    is_featured: data.is_featured === true,
    is_sold: false
  };
  memoryStore.properties.unshift(newProp);
  return newProp;
}

async function updateProperty(id, data) {
  if (isNeonConnected && pool) {
    const res = await pool.query(
      `UPDATE properties 
       SET title = $1, community = $2, property_type = $3, price_aed = $4,
           bedrooms = $5, bathrooms = $6, sqft = $7, description = $8, is_sold = $9
       WHERE id = $10 RETURNING *`,
      [
        data.title, data.community, data.property_type, parseInt(data.price_aed, 10),
        parseInt(data.bedrooms, 10), parseInt(data.bathrooms, 10), parseInt(data.sqft, 10),
        data.description, data.is_sold === true, id
      ]
    );
    return res.rows[0];
  }

  const prop = memoryStore.properties.find(p => p.id === parseInt(id, 10));
  if (prop) {
    Object.assign(prop, {
      title: data.title || prop.title,
      community: data.community || prop.community,
      property_type: data.property_type || prop.property_type,
      price_aed: data.price_aed ? parseInt(data.price_aed, 10) : prop.price_aed,
      bedrooms: data.bedrooms ? parseInt(data.bedrooms, 10) : prop.bedrooms,
      bathrooms: data.bathrooms ? parseInt(data.bathrooms, 10) : prop.bathrooms,
      sqft: data.sqft ? parseInt(data.sqft, 10) : prop.sqft,
      description: data.description || prop.description,
      is_sold: data.is_sold !== undefined ? data.is_sold === true : prop.is_sold
    });
    return prop;
  }
  return null;
}

async function deleteProperty(id) {
  if (isNeonConnected && pool) {
    await pool.query('DELETE FROM properties WHERE id = $1', [id]);
    return { success: true };
  }
  const idx = memoryStore.properties.findIndex(p => p.id === parseInt(id, 10));
  if (idx !== -1) {
    memoryStore.properties.splice(idx, 1);
    return { success: true };
  }
  return { success: false, error: 'Property not found' };
}

// Off-Plan Projects
async function getOffPlanProjects(filters = {}) {
  if (isNeonConnected && pool) {
    let query = 'SELECT * FROM offplan_projects WHERE 1=1';
    const params = [];
    let idx = 1;
    if (filters.community && filters.community !== 'all') {
      query += ` AND LOWER(community) LIKE LOWER($${idx})`;
      params.push(`%${filters.community}%`);
      idx++;
    }
    if (filters.handover && filters.handover !== 'all') {
      query += ` AND handover_date LIKE $${idx}`;
      params.push(`%${filters.handover}%`);
      idx++;
    }
    query += ' ORDER BY starting_price_aed ASC';
    const res = await pool.query(query, params);
    return res.rows;
  }

  return memoryStore.offplan_projects.filter(o => {
    if (filters.community && filters.community !== 'all' && !o.community.toLowerCase().includes(filters.community.toLowerCase())) return false;
    if (filters.handover && filters.handover !== 'all' && !o.handover_date.includes(filters.handover)) return false;
    return true;
  });
}

async function getProjectById(id) {
  if (isNeonConnected && pool) {
    const res = await pool.query('SELECT * FROM offplan_projects WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return memoryStore.offplan_projects.find(o => o.id === parseInt(id, 10) || o.slug === id) || null;
}

async function addProject(data) {
  const slug = (data.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(100 + Math.random() * 900);
  const price = parseInt(data.starting_price_aed, 10) || 3500000;

  if (isNeonConnected && pool) {
    const res = await pool.query(
      `INSERT INTO offplan_projects (
        name, slug, developer_name, community, starting_price_aed, handover_date,
        payment_plan_summary, roi_projected, description, hero_image, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true) RETURNING *`,
      [
        data.name, slug, data.developer_name || 'Aura Luxe Developments',
        data.community, price, data.handover_date || 'Q4 2027',
        data.payment_plan_summary || '70/30 Payment Plan',
        data.roi_projected || '9.2% Net Expected Yield',
        data.description || 'Visionary off-plan development in UAE.',
        data.hero_image || 'assets/images/celeste-tower.jpg'
      ]
    );
    return res.rows[0];
  }

  const newProj = {
    id: memoryStore.offplan_projects.length + 1,
    name: data.name,
    slug,
    developer_name: data.developer_name || 'Aura Luxe Developments',
    community: data.community,
    starting_price_aed: price,
    handover_date: data.handover_date || 'Q4 2027',
    payment_plan_summary: data.payment_plan_summary || '70/30 Payment Plan',
    payment_plan_breakdown: [
      { milestone: 'On Booking', percent: 20 },
      { milestone: 'During Construction', percent: 50 },
      { milestone: 'On Handover', percent: 30 }
    ],
    roi_projected: data.roi_projected || '9.2% Net Expected Yield',
    description: data.description || 'Visionary off-plan development in UAE.',
    features: ['Prime Location', 'Flexible Payment Plan', 'High Projected ROI'],
    hero_image: data.hero_image || 'assets/images/celeste-tower.jpg',
    is_featured: true
  };
  memoryStore.offplan_projects.unshift(newProj);
  return newProj;
}

async function deleteProject(id) {
  if (isNeonConnected && pool) {
    await pool.query('DELETE FROM offplan_projects WHERE id = $1', [id]);
    return { success: true };
  }
  const idx = memoryStore.offplan_projects.findIndex(o => o.id === parseInt(id, 10));
  if (idx !== -1) {
    memoryStore.offplan_projects.splice(idx, 1);
    return { success: true };
  }
  return { success: false, error: 'Project not found' };
}

// ==============================================================================
// 5. VIEWINGS & VALUATIONS
// ==============================================================================
async function createViewing(viewing) {
  const refCode = 'VIEW-' + Math.floor(1000 + Math.random() * 9000);

  if (viewing.lead_id) {
    // If booked from existing lead in admin console
    await addLeadNote(
      viewing.lead_id,
      `Viewing scheduled for "${viewing.property_title || 'Private Residence'}" on ${viewing.viewing_date} at ${viewing.viewing_time || '11:00 AM'}. Requests: ${viewing.special_requests || 'None'}`,
      viewing.agent_id || 1,
      viewing.agent_name || 'Broker'
    );
    await updateLeadStage(viewing.lead_id, 'Viewing');
  } else {
    // Also record/sync this client as a lead!
    await createLead({
      full_name: viewing.client_name,
      phone: viewing.client_phone,
      source: 'Property Detail - Book a Viewing',
      specific_property_id: viewing.property_id,
      specific_property_title: viewing.property_title,
      timeline: `Viewing on ${viewing.viewing_date} (${viewing.viewing_time})`,
      notes: `Viewing booked for ${viewing.property_title}. Special requests: ${viewing.special_requests || 'None'}`
    });
  }

  if (isNeonConnected && pool) {
    const res = await pool.query(
      `INSERT INTO viewings (property_id, property_title, client_name, client_phone, agent_id, agent_name, viewing_date, viewing_time, status, special_requests, lead_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        viewing.property_id || null,
        viewing.property_title || 'Private Residence',
        viewing.client_name,
        viewing.client_phone,
        viewing.agent_id || 2,
        viewing.agent_name || 'Rashid Al-Mansoor',
        viewing.viewing_date,
        viewing.viewing_time || '11:00 AM',
        viewing.status || 'Confirmed',
        viewing.special_requests || null,
        viewing.lead_id || null
      ]
    );
    return { ...res.rows[0], refCode };
  }

  const newViewing = {
    id: memoryStore.viewings.length + 1,
    lead_id: viewing.lead_id || null,
    property_id: viewing.property_id || null,
    property_title: viewing.property_title || 'Private Residence',
    client_name: viewing.client_name,
    client_phone: viewing.client_phone,
    agent_id: viewing.agent_id || 2,
    agent_name: viewing.agent_name || 'Rashid Al-Mansoor',
    viewing_date: viewing.viewing_date,
    viewing_time: viewing.viewing_time || '11:00 AM',
    status: viewing.status || 'Confirmed',
    special_requests: viewing.special_requests || '',
    created_at: new Date().toISOString()
  };
  memoryStore.viewings.unshift(newViewing);
  return { ...newViewing, refCode };
}

async function getViewings(user = { role: 'Admin', id: 1 }) {
  if (isNeonConnected && pool) {
    let query = 'SELECT * FROM viewings';
    const params = [];
    if (user.role === 'Agent') {
      query += ' WHERE agent_id = $1';
      params.push(user.id);
    }
    query += ' ORDER BY id DESC';
    const res = await pool.query(query, params);
    return res.rows;
  }

  if (user.role === 'Agent') {
    return memoryStore.viewings.filter(v => v.agent_id === user.id);
  }
  return memoryStore.viewings;
}

async function createValuation(val) {
  const refCode = 'VAL-' + Math.floor(1000 + Math.random() * 9000);
  
  // Save seller as lead
  await createLead({
    full_name: val.owner_name,
    phone: val.owner_phone,
    email: val.owner_email,
    budget_aed: val.expected_price ? `Expected AED ${val.expected_price}` : 'Valuation Request',
    preferred_community: val.property_community,
    property_type: val.property_type,
    source: 'Sell Property Valuation Form',
    notes: `Seller valuation. Community: ${val.property_community}, Building: ${val.building_name || 'N/A'}, Beds: ${val.bedrooms}, SqFt: ${val.sqft || 'N/A'}`
  });

  return { refCode };
}

// ==============================================================================
// 6. DASHBOARD METRICS & LEADERBOARD
// ==============================================================================
async function getAdminDashboardStats(user = { role: 'Admin', id: 1 }) {
  const allLeads = await getLeads({}, user);
  const allViewings = await getViewings(user);
  
  let sales = [];
  if (isNeonConnected && pool) {
    let query = 'SELECT * FROM completed_sales';
    const params = [];
    if (user.role === 'Agent') {
      query += ' WHERE agent_id = $1';
      params.push(user.id);
    }
    const res = await pool.query(query, params);
    sales = res.rows;
  } else {
    sales = user.role === 'Agent' ? memoryStore.completed_sales.filter(s => s.agent_id === user.id) : memoryStore.completed_sales;
  }

  // 1. New leads today
  const todayStr = new Date().toISOString().split('T')[0];
  const newLeadsToday = allLeads.filter(l => (l.created_at || '').startsWith(todayStr)).length;

  // 2. Total deal value in pipeline
  const totalDealValue = sales.reduce((acc, s) => acc + Number(s.sale_price_aed || 0), 0);

  // 3. Viewings this week
  const viewingsThisWeek = allViewings.length;

  // 4. Sales & Commission this month (2%)
  const totalCommission = sales.reduce((acc, s) => acc + Number(s.commission_aed || 0), 0);

  // 5. Pipeline stage breakdown
  const stages = {
    New: allLeads.filter(l => l.stage === 'New').length,
    Contacted: allLeads.filter(l => l.stage === 'Contacted').length,
    Viewing: allLeads.filter(l => l.stage === 'Viewing').length,
    Offer: allLeads.filter(l => l.stage === 'Offer').length,
    Won: allLeads.filter(l => l.stage === 'Won').length,
    Lost: allLeads.filter(l => l.stage === 'Lost').length
  };

  // 6. Temperature breakdown
  const temperatures = {
    HOT: allLeads.filter(l => l.score_label === 'HOT').length,
    WARM: allLeads.filter(l => l.score_label === 'WARM').length,
    COLD: allLeads.filter(l => l.score_label === 'COLD').length
  };

  // 7. Stale Leads (no activity for 3+ days and not Won/Lost)
  const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
  const staleLeads = allLeads.filter(l => {
    if (l.stage === 'Won' || l.stage === 'Lost') return false;
    const t = new Date(l.last_activity_at || l.created_at).getTime();
    return t < threeDaysAgo;
  });

  // 8. Agent Leaderboard against monthly targets
  const allStaff = memoryStore.staff_logins.filter(st => st.role === 'Agent');
  const leaderboard = allStaff.map(agent => {
    const agentSales = memoryStore.completed_sales.filter(s => s.agent_id === agent.id);
    const volume = agentSales.reduce((acc, s) => acc + Number(s.sale_price_aed || 0), 0);
    const comm = agentSales.reduce((acc, s) => acc + Number(s.commission_aed || 0), 0);
    const target = Number(agent.monthly_target_aed || 25000000);
    const pct = Math.min(100, Math.round((volume / target) * 100));

    return {
      agent_id: agent.id,
      name: agent.name,
      license_no: agent.license_no,
      avatar_url: agent.avatar_url,
      target_aed: target,
      volume_aed: volume,
      commission_aed: comm,
      deals_count: agentSales.length,
      achievement_percent: pct
    };
  }).sort((a, b) => b.volume_aed - a.volume_aed);

  return {
    newLeadsToday,
    totalDealValue,
    viewingsThisWeek,
    salesCount: sales.length,
    salesVolume: totalDealValue,
    totalCommission,
    stages,
    temperatures,
    staleLeadsCount: staleLeads.length,
    staleLeads,
    leaderboard
  };
}

// Staff and Sales Helpers
async function getStaff() {
  if (isNeonConnected && pool) {
    const res = await pool.query('SELECT id, name, email, role, phone, license_no, bio, monthly_target_aed FROM staff_logins ORDER BY id ASC');
    return res.rows;
  }
  return memoryStore.staff_logins.map(s => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    phone: s.phone,
    license_no: s.license_no,
    bio: s.bio,
    monthly_target_aed: s.monthly_target_aed
  }));
}

async function getSales(user = { role: 'Admin', id: 1 }) {
  if (isNeonConnected && pool) {
    let query = 'SELECT * FROM completed_sales';
    const params = [];
    if (user.role === 'Agent') {
      query += ' WHERE agent_id = $1';
      params.push(user.id);
    }
    query += ' ORDER BY id DESC';
    const res = await pool.query(query, params);
    return res.rows;
  }
  if (user.role === 'Agent') {
    return memoryStore.completed_sales.filter(s => s.agent_id === user.id);
  }
  return memoryStore.completed_sales;
}

// User Authentication
async function authenticateUser(email, password) {
  const staff = memoryStore.staff_logins.find(
    s => s.email.toLowerCase() === email.toLowerCase() && s.password_hash === password
  );
  if (!staff) return null;

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role, // 'Admin' or 'Agent'
    phone: staff.phone,
    license_no: staff.license_no
  };
}

function getDatabaseStatus() {
  return {
    isNeonConnected,
    connectionError,
    databaseType: isNeonConnected ? 'Neon Serverless PostgreSQL' : 'Fallback Resilient Memory Repository',
    envFileLocation: path.resolve(__dirname, '..', '.env'),
    stats: {
      developers: memoryStore.developers.length,
      offplanProjects: memoryStore.offplan_projects.length,
      properties: memoryStore.properties.length,
      buyerLeads: memoryStore.buyer_leads.length,
      viewings: memoryStore.viewings.length,
      completedSales: memoryStore.completed_sales.length,
      staffAgents: memoryStore.staff_logins.length
    }
  };
}

module.exports = {
  initDatabase,
  getProperties,
  getPropertyById,
  addProperty,
  updateProperty,
  deleteProperty,
  getOffPlanProjects,
  getProjectById,
  addProject,
  deleteProject,
  getDevelopers: async () => memoryStore.developers,
  createLead,
  getLeads,
  getLeadById,
  updateLeadStage,
  assignLeadAgent,
  addLeadNote,
  markLeadWon,
  createViewing,
  getViewings,
  getStaff,
  getSales,
  createValuation,
  getAdminDashboardStats,
  authenticateUser,
  getDatabaseStatus
};
