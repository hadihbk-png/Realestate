-- ==============================================================================
-- HADI REAL ESTATE — NEON POSTGRESQL SCHEMA (ENHANCED FOR CRM & ADMIN)
-- ==============================================================================

-- 1. Staff Logins & Agents
CREATE TABLE IF NOT EXISTS staff_logins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Agent', -- 'Admin' or 'Agent'
  phone VARCHAR(50) NOT NULL,
  license_no VARCHAR(50) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  monthly_target_aed BIGINT DEFAULT 25000000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Developers
CREATE TABLE IF NOT EXISTS developers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  origin VARCHAR(100) DEFAULT 'Dubai, UAE',
  established_year INTEGER DEFAULT 2012,
  description TEXT,
  track_record_value_aed BIGINT DEFAULT 8500000000,
  completed_projects_count INTEGER DEFAULT 18,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Off-Plan Projects
CREATE TABLE IF NOT EXISTS offplan_projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(180) UNIQUE NOT NULL,
  developer_id INTEGER REFERENCES developers(id) ON DELETE SET NULL,
  developer_name VARCHAR(150) NOT NULL,
  community VARCHAR(120) NOT NULL,
  starting_price_aed BIGINT NOT NULL,
  handover_date VARCHAR(50) NOT NULL,
  payment_plan_summary VARCHAR(100) NOT NULL,
  payment_plan_breakdown JSONB,
  roi_projected VARCHAR(50) DEFAULT '8.5% - 9.5%',
  property_types VARCHAR(150) DEFAULT '1, 2, 3 & 4 Bedroom Residences',
  description TEXT NOT NULL,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  brochure_filename VARCHAR(150) DEFAULT 'brochure.pdf',
  hero_image TEXT NOT NULL,
  gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_featured BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Properties (Ready & Off-Plan)
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  community VARCHAR(120) NOT NULL,
  property_type VARCHAR(80) NOT NULL,
  price_aed BIGINT NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  sqft INTEGER NOT NULL,
  description TEXT NOT NULL,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  image TEXT NOT NULL,
  gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_ready BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_sold BOOLEAN DEFAULT false,
  sold_price_aed BIGINT,
  sold_date DATE,
  assigned_agent_id INTEGER REFERENCES staff_logins(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Buyer Leads (With Scoring, Stages & Activity Tracking)
CREATE TABLE IF NOT EXISTS buyer_leads (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(50) NOT NULL,
  budget_aed VARCHAR(80) NOT NULL,
  preferred_community VARCHAR(120),
  property_type VARCHAR(80),
  source VARCHAR(120) DEFAULT 'Website Inquire Form',
  stage VARCHAR(50) DEFAULT 'New', -- 'New', 'Contacted', 'Viewing', 'Offer', 'Won', 'Lost'
  status VARCHAR(60) DEFAULT 'New',
  score INTEGER DEFAULT 50, -- 0 to 100
  score_label VARCHAR(20) DEFAULT 'WARM', -- 'HOT', 'WARM', 'COLD'
  payment_method VARCHAR(100),
  timeline VARCHAR(100),
  specific_property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  specific_property_title VARCHAR(200),
  notes TEXT,
  assigned_agent_id INTEGER REFERENCES staff_logins(id) ON DELETE SET NULL,
  assigned_agent_name VARCHAR(150),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notes (Associated with Leads and Properties)
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES buyer_leads(id) ON DELETE CASCADE,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  author_agent_id INTEGER REFERENCES staff_logins(id) ON DELETE SET NULL,
  author_name VARCHAR(150),
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Viewings
CREATE TABLE IF NOT EXISTS viewings (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  property_title VARCHAR(200) NOT NULL,
  lead_id INTEGER REFERENCES buyer_leads(id) ON DELETE SET NULL,
  client_name VARCHAR(150) NOT NULL,
  client_phone VARCHAR(50) NOT NULL,
  agent_id INTEGER REFERENCES staff_logins(id) ON DELETE SET NULL,
  agent_name VARCHAR(150),
  viewing_date DATE NOT NULL,
  viewing_time VARCHAR(50) NOT NULL,
  status VARCHAR(60) DEFAULT 'Confirmed', -- Confirmed, Completed, Cancelled
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Completed Sales
CREATE TABLE IF NOT EXISTS completed_sales (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  property_name VARCHAR(200) NOT NULL,
  lead_id INTEGER REFERENCES buyer_leads(id) ON DELETE SET NULL,
  buyer_name VARCHAR(150) NOT NULL,
  agent_id INTEGER REFERENCES staff_logins(id) ON DELETE SET NULL,
  agent_name VARCHAR(150) NOT NULL,
  sale_price_aed BIGINT NOT NULL,
  commission_aed BIGINT NOT NULL, -- 2% commission
  closing_date DATE NOT NULL,
  community VARCHAR(120) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
