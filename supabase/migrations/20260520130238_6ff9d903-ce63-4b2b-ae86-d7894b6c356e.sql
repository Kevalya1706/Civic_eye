
-- 1. Extend contractors with credential fields
ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS lead_engineer_name text,
  ADD COLUMN IF NOT EXISTS engineer_id text,
  ADD COLUMN IF NOT EXISTS emergency_contact text;

-- Backfill company_name from name where empty
UPDATE public.contractors SET company_name = name WHERE company_name IS NULL;

-- 2. Seed default contractors per department for default ward
INSERT INTO public.contractors (name, company_name, department, ward, lead_engineer_name, engineer_id, emergency_contact, phone, active)
VALUES
  ('Apex Infrastructure', 'Apex Infrastructure Pvt. Ltd.', 'Road Dept', 'Pune Central', 'Rahul Sharma', 'MNC-8842', '+91 98234 11221', '+91 98234 11221', true),
  ('Volt Power Services', 'Volt Power Services Pvt. Ltd.', 'Electricity', 'Pune Central', 'Anita Deshmukh', 'MNC-7731', '+91 98234 22332', '+91 98234 22332', true),
  ('AquaFlow Utilities', 'AquaFlow Utilities Pvt. Ltd.', 'Water & Sewage', 'Pune Central', 'Vikram Joshi', 'MNC-6620', '+91 98234 33443', '+91 98234 33443', true),
  ('CleanCity Services', 'CleanCity Services Pvt. Ltd.', 'Waste Management', 'Pune Central', 'Priya Kulkarni', 'MNC-5519', '+91 98234 44554', '+91 98234 44554', true),
  ('StormDrain Co', 'StormDrain Co. Pvt. Ltd.', 'Drainage', 'Pune Central', 'Sandeep More', 'MNC-4408', '+91 98234 55665', '+91 98234 55665', true)
ON CONFLICT DO NOTHING;

-- 3. Backfill ward on existing tickets
UPDATE public.tickets SET ward = 'Pune Central' WHERE ward IS NULL;

-- 4. Auto-assign contractor trigger
CREATE OR REPLACE FUNCTION public.auto_assign_contractor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contractor_id uuid;
  v_ward text;
BEGIN
  v_ward := COALESCE(NEW.ward, 'Pune Central');
  NEW.ward := v_ward;

  SELECT id INTO v_contractor_id
    FROM public.contractors
    WHERE department = NEW.department
      AND ward = v_ward
      AND active = true
    ORDER BY created_at ASC
    LIMIT 1;

  -- Fallback: any active contractor for that department
  IF v_contractor_id IS NULL THEN
    SELECT id INTO v_contractor_id
      FROM public.contractors
      WHERE department = NEW.department
        AND active = true
      ORDER BY created_at ASC
      LIMIT 1;
  END IF;

  IF v_contractor_id IS NOT NULL THEN
    NEW.assigned_contractor_id := v_contractor_id;
    IF NEW.assigned_at IS NULL THEN
      NEW.assigned_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_contractor ON public.tickets;
CREATE TRIGGER trg_auto_assign_contractor
  BEFORE INSERT OR UPDATE OF department, ward ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_contractor();

-- Backfill: re-trigger assignment by touching ward
UPDATE public.tickets SET ward = ward WHERE assigned_contractor_id IS NULL;

-- 5. S-Score-tiered SLA deadlines (replace existing set_ticket_sla)
CREATE OR REPLACE FUNCTION public.set_ticket_sla()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours int;
BEGIN
  -- Tier 1 Critical (>=85): 12h | Tier 2 High (70-85): 24h
  -- Tier 3 Medium (50-70): 48h | Tier 4 Low (<50): 120h (5 days)
  IF NEW.priority_score >= 85 THEN
    v_hours := 12;
  ELSIF NEW.priority_score >= 70 THEN
    v_hours := 24;
  ELSIF NEW.priority_score >= 50 THEN
    v_hours := 48;
  ELSE
    v_hours := 120;
  END IF;

  NEW.sla_deadline := COALESCE(NEW.created_at, now()) + (v_hours || ' hours')::interval;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ticket_sla ON public.tickets;
CREATE TRIGGER trg_set_ticket_sla
  BEFORE INSERT OR UPDATE OF priority_score ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_sla();

-- Backfill sla_deadline on existing rows
UPDATE public.tickets
  SET priority_score = priority_score
  WHERE sla_deadline IS NULL OR true;

-- 6. Social cost helper (S_score * days_overdue * traffic_density)
CREATE OR REPLACE FUNCTION public.calc_social_cost(_ticket_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.tickets;
  v_days numeric;
  v_traffic numeric;
  v_cost numeric;
BEGIN
  SELECT * INTO t FROM public.tickets WHERE id = _ticket_id;
  IF t IS NULL OR t.status = 'Resolved' THEN
    RETURN 0;
  END IF;
  v_days := GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(t.sla_deadline, t.created_at))) / 86400.0);
  v_traffic := COALESCE(t.traffic_density, 1.0);
  -- Rupees: scale factor 25,000 so a S=80 / 2 days / traffic 1.5 ticket ≈ ₹6,00,000
  v_cost := t.priority_score * v_days * v_traffic * 25000;
  RETURN ROUND(v_cost, 2);
END;
$$;
