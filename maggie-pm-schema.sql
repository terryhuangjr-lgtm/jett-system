-- TABLE: properties
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL,
  unit_number TEXT,
  city TEXT DEFAULT 'New York',
  state TEXT DEFAULT 'NY',
  zip_code TEXT,
  property_type TEXT CHECK (property_type IN ('condo', 'co-op', 'house', 'townhouse', 'multi-family')),
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  square_footage INTEGER,
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT,
  owner_language TEXT DEFAULT 'English',
  purchase_date DATE,
  purchase_price NUMERIC(12,2),
  current_market_value NUMERIC(12,2),
  monthly_management_fee NUMERIC(8,2),
  building_management_company TEXT,
  building_management_contact TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'vacant', 'maintenance', 'listed_for_sale')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  language_preference TEXT DEFAULT 'English',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  move_in_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'former', 'pending_approval')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: leases
CREATE TABLE IF NOT EXISTS leases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lease_start DATE NOT NULL,
  lease_end DATE NOT NULL,
  monthly_rent NUMERIC(8,2) NOT NULL,
  security_deposit NUMERIC(8,2),
  rent_due_day INTEGER DEFAULT 1,
  auto_renew BOOLEAN DEFAULT FALSE,
  renewal_terms TEXT,
  lease_document_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending_renewal', 'terminated')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  amount NUMERIC(8,2) NOT NULL,
  payment_type TEXT CHECK (payment_type IN ('rent', 'security_deposit', 'late_fee', 'maintenance', 'other')),
  payment_date DATE,
  due_date DATE,
  payment_method TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'late', 'partial', 'waived')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT CHECK (task_type IN (
    'lease_renewal', 'rent_collection', 'maintenance_request',
    'inspection', 'board_application', 'move_in', 'move_out',
    'owner_report', 'general', 'follow_up'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to TEXT,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: activity_log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  source TEXT DEFAULT 'system' CHECK (source IN ('system', 'agent', 'manual', 'email', 'telegram')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIEW: upcoming_lease_expirations
CREATE OR REPLACE VIEW upcoming_lease_expirations AS
SELECT
  l.id AS lease_id,
  p.address,
  p.unit_number,
  t.first_name || ' ' || t.last_name AS tenant_name,
  t.phone AS tenant_phone,
  t.email AS tenant_email,
  l.lease_end,
  l.monthly_rent,
  (l.lease_end - CURRENT_DATE) AS days_until_expiry,
  p.owner_name
FROM leases l
JOIN properties p ON l.property_id = p.id
JOIN tenants t ON l.tenant_id = t.id
WHERE l.status = 'active'
  AND l.lease_end <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY l.lease_end ASC;

-- VIEW: monthly_rent_status
CREATE OR REPLACE VIEW monthly_rent_status AS
SELECT
  p.address,
  p.unit_number,
  t.first_name || ' ' || t.last_name AS tenant_name,
  l.monthly_rent,
  l.rent_due_day,
  pay.status AS payment_status,
  pay.payment_date,
  p.owner_name
FROM leases l
JOIN properties p ON l.property_id = p.id
JOIN tenants t ON l.tenant_id = t.id
LEFT JOIN payments pay ON pay.lease_id = l.id
  AND EXTRACT(MONTH FROM pay.due_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM pay.due_date) = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE l.status = 'active'
ORDER BY p.address;

-- VIEW: open_tasks_by_priority
CREATE OR REPLACE VIEW open_tasks_by_priority AS
SELECT
  t.id,
  t.title,
  t.task_type,
  t.priority,
  t.due_date,
  t.status,
  p.address,
  p.unit_number,
  ten.first_name || ' ' || ten.last_name AS tenant_name
FROM tasks t
LEFT JOIN properties p ON t.property_id = p.id
LEFT JOIN tenants ten ON t.tenant_id = ten.id
WHERE t.status IN ('pending', 'in_progress')
ORDER BY
  CASE t.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  t.due_date ASC;

-- RLS: enable on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS: allow all (service key auth for now)
CREATE POLICY IF NOT EXISTS "Allow all" ON properties FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all" ON tenants FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all" ON leases FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all" ON payments FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all" ON tasks FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all" ON activity_log FOR ALL USING (true);

-- Enable realtime on activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
