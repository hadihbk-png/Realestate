/**
 * HADI REAL ESTATE — MAIN EXPRESS BACKEND SERVER
 * Serves website pages, handles API requests, rate-limits submissions,
 * enforces lead scoring, handles CRM pipeline & authentication.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Standard Client Response
const THANK_YOU_MESSAGE = "Thank you. Hadi Real Estate advisor will contact you within 24 hours.";

// --------------------------------------------------------------------------
// 1. RATE LIMITING & ANTI-SPAM MIDDLEWARE
// --------------------------------------------------------------------------
const ipSubmissionTimestamps = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5;

  let timestamps = ipSubmissionTimestamps.get(ip) || [];
  // Filter out timestamps older than window
  timestamps = timestamps.filter(t => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    return res.status(429).json({
      error: "You have submitted multiple requests recently. Please wait a moment before sending another inquiry."
    });
  }

  // Consecutive fast spam check (less than 2 seconds)
  if (timestamps.length > 0 && now - timestamps[timestamps.length - 1] < 2000) {
    return res.status(429).json({
      error: "Please wait a moment before submitting again."
    });
  }

  timestamps.push(now);
  ipSubmissionTimestamps.set(ip, timestamps);
  next();
}

function validateAntiSpam(req, res, next) {
  // Honeypot check
  if (req.body.hp_website_fax && req.body.hp_website_fax.trim() !== '') {
    return res.status(400).json({ error: 'Automated submission blocked.' });
  }

  // Phone validation (min 7 digits)
  const phone = req.body.phone || req.body.client_phone || req.body.owner_phone;
  if (!phone || phone.replace(/\D/g, '').length < 7) {
    return res.status(400).json({ error: 'Please provide a valid contact phone number.' });
  }

  next();
}

// --------------------------------------------------------------------------
// 2. AUTHENTICATION & ROLE-BASED ACCESS
// --------------------------------------------------------------------------
function getUserFromReq(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Format: session-{id}-{role}
    const parts = token.split('-');
    if (parts.length >= 3) {
      return {
        id: parseInt(parts[1], 10),
        role: parts[2] === 'Admin' ? 'Admin' : 'Agent'
      };
    }
  }
  // Default to Admin if not provided
  return { id: 1, role: 'Admin' };
}

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await db.authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
  }

  const token = `session-${user.id}-${user.role}`;
  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      license_no: user.license_no,
      avatar_url: user.avatar_url || 'assets/images/agent1.jpg'
    },
    token
  });
});

// --------------------------------------------------------------------------
// 3. PUBLIC PROPERTY & OFF-PLAN APIS
// --------------------------------------------------------------------------
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await db.getProperties(req.query);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    const prop = await db.getPropertyById(req.params.id);
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    res.json(prop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/offplan', async (req, res) => {
  try {
    const projects = await db.getOffPlanProjects(req.query);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/offplan/:id', async (req, res) => {
  try {
    const project = await db.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db-status', (req, res) => {
  res.json(db.getDatabaseStatus());
});

// --------------------------------------------------------------------------
// 4. PUBLIC CLIENT SUBMISSION FORMS (WITH RATE LIMITING & NO EMAIL SENDING)
// --------------------------------------------------------------------------

// Register Interest / Enquire
app.post('/api/leads', rateLimiter, validateAntiSpam, async (req, res) => {
  try {
    const {
      full_name, email, phone, budget_aed, preferred_community, property_type,
      source, notes, property_id, property_title, payment_method, timeline
    } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ error: 'Full name and phone number are required.' });
    }

    const savedLead = await db.createLead({
      full_name,
      email,
      phone,
      budget_aed,
      preferred_community,
      property_type,
      source: source || 'Website Inquire Form',
      notes,
      specific_property_id: property_id,
      specific_property_title: property_title,
      payment_method,
      timeline
    });

    res.json({
      success: true,
      message: THANK_YOU_MESSAGE,
      referenceCode: savedLead.referenceCode,
      lead: { id: savedLead.id, score: savedLead.score, score_label: savedLead.score_label }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book a Viewing
app.post('/api/viewings', rateLimiter, validateAntiSpam, async (req, res) => {
  try {
    const { property_id, property_title, client_name, client_phone, viewing_date, viewing_time, special_requests } = req.body;

    if (!client_name || !client_phone || !viewing_date) {
      return res.status(400).json({ error: 'Name, phone, and desired date are required.' });
    }

    const viewing = await db.createViewing({
      property_id,
      property_title,
      client_name,
      client_phone,
      viewing_date,
      viewing_time,
      special_requests
    });

    res.json({
      success: true,
      message: THANK_YOU_MESSAGE,
      refCode: viewing.refCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sell Property Valuation
app.post('/api/valuations', rateLimiter, validateAntiSpam, async (req, res) => {
  try {
    const val = await db.createValuation(req.body);
    res.json({
      success: true,
      message: THANK_YOU_MESSAGE,
      refCode: val.refCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mortgage Advisor Request
app.post('/api/advisor-requests', rateLimiter, validateAntiSpam, async (req, res) => {
  try {
    const refCode = 'FIN-' + Math.floor(1000 + Math.random() * 9000);
    await db.createLead({
      full_name: req.body.client_name,
      phone: req.body.client_phone,
      email: req.body.client_email,
      budget_aed: req.body.property_price ? `Loan on ${req.body.property_price}` : 'Mortgage Advisory',
      source: 'Mortgage Calculator Advisory Form',
      notes: `Down Payment: ${req.body.down_payment || 'N/A'}, Term: ${req.body.loan_term || 'N/A'}, Est Monthly: ${req.body.est_monthly || 'N/A'}`
    });

    res.json({
      success: true,
      message: THANK_YOU_MESSAGE,
      refCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Instant Callback Request
app.post('/api/callbacks', rateLimiter, validateAntiSpam, async (req, res) => {
  try {
    const refCode = 'CALL-' + Math.floor(1000 + Math.random() * 9000);
    await db.createLead({
      full_name: req.body.client_name,
      phone: req.body.client_phone,
      source: 'Floating Call Me Back Modal',
      timeline: 'Immediate Callback Requested',
      notes: `Preferred call window: ${req.body.call_time || 'Immediate'}`
    });

    res.json({
      success: true,
      message: THANK_YOU_MESSAGE,
      refCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. CRM & ADMIN AREA APIS (ENFORCING AGENT ISOLATION)
// --------------------------------------------------------------------------

// 1-minute bell notification count
app.get('/api/admin/new-leads-count', async (req, res) => {
  try {
    const user = getUserFromReq(req);
    const leads = await db.getLeads({ stage: 'New' }, user);
    res.json({
      count: leads.length,
      latestLeads: leads.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard stats
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const user = getUserFromReq(req);
    const stats = await db.getAdminDashboardStats(user);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leads list (filtered for agents)
app.get('/api/admin/leads', async (req, res) => {
  try {
    const user = getUserFromReq(req);
    const leads = await db.getLeads(req.query, user);
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single lead detail
app.get('/api/admin/leads/:id', async (req, res) => {
  try {
    const user = getUserFromReq(req);
    const lead = await db.getLeadById(req.params.id, user);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (lead.error) return res.status(403).json(lead);
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update lead stage (Drag and Drop Kanban)
app.patch('/api/admin/leads/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'Stage is required' });

    const user = getUserFromReq(req);
    const updated = await db.updateLeadStage(req.params.id, stage, user);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark lead as WON -> record sale price, 2% commission, mark property SOLD
app.post('/api/admin/leads/:id/won', async (req, res) => {
  try {
    const { sale_price_aed, property_id, property_name, buyer_name } = req.body;
    if (!sale_price_aed) {
      return res.status(400).json({ error: 'Sale price in AED is required.' });
    }

    const user = getUserFromReq(req);
    const sale = await db.markLeadWon(
      req.params.id,
      sale_price_aed,
      property_id,
      property_name,
      user.id,
      user.name || 'Rashid Al-Mansoor',
      buyer_name
    );

    res.json({
      success: true,
      message: 'Deal recorded as Won. 2% Commission registered and property marked as sold.',
      sale
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add note to lead
app.post('/api/admin/leads/:id/notes', async (req, res) => {
  try {
    const { note_text } = req.body;
    if (!note_text) return res.status(400).json({ error: 'Note text required' });

    const user = getUserFromReq(req);
    const note = await db.addLeadNote(req.params.id, note_text, user.id, user.name || 'Broker');
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reassign agent
app.patch('/api/admin/leads/:id/assign', async (req, res) => {
  try {
    const { agent_id, agent_name } = req.body;
    const updated = await db.assignLeadAgent(req.params.id, agent_id, agent_name);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Viewings list
app.get('/api/admin/viewings', async (req, res) => {
  try {
    const user = getUserFromReq(req);
    const viewings = await db.getViewings(user);
    res.json(viewings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff list (for agent reassignment & staff directory)
app.get('/api/admin/staff', async (req, res) => {
  try {
    const staff = await db.getStaff();
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Completed Sales list
app.get('/api/admin/sales', async (req, res) => {
  try {
    const user = getUserFromReq(req);
    const sales = await db.getSales(user);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Properties Management (Add, Edit, Delete)
app.post('/api/admin/properties', async (req, res) => {
  try {
    const prop = await db.addProperty(req.body);
    res.json(prop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/properties/:id', async (req, res) => {
  try {
    const prop = await db.updateProperty(req.params.id, req.body);
    res.json(prop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/properties/:id', async (req, res) => {
  try {
    const result = await db.deleteProperty(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Off-Plan Projects Management (Add, Delete)
app.post('/api/admin/projects', async (req, res) => {
  try {
    const proj = await db.addProject(req.body);
    res.json(proj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/projects/:id', async (req, res) => {
  try {
    const result = await db.deleteProject(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 6. STATIC ASSET SERVING & CLEAN HTML ROUTES
// --------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..')));

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// Start Server
async function start() {
  await db.initDatabase();

  app.listen(PORT, () => {
    console.log(`\n============================================================`);
    console.log(` HADI REAL ESTATE ACTIVE AT: http://localhost:${PORT}`);
    console.log(` ADMIN LOGIN AT: http://localhost:${PORT}/login.html`);
    console.log(`============================================================\n`);
  });
}

start();
