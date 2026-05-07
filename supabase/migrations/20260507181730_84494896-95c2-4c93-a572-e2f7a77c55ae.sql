
-- 1. Roles infrastructure
CREATE TYPE public.app_role AS ENUM ('citizen', 'officer', 'hod', 'commissioner');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  department public.department_type,
  ward TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Commissioners view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'commissioner'));

-- 2. Contractors
CREATE TABLE public.contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department public.department_type NOT NULL,
  ward TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contractors_dept_ward ON public.contractors(department, ward) WHERE active;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view contractors" ON public.contractors FOR SELECT USING (true);
CREATE POLICY "Officers manage contractors" ON public.contractors FOR ALL
  USING (public.has_role(auth.uid(), 'commissioner') OR public.has_role(auth.uid(), 'hod'))
  WITH CHECK (public.has_role(auth.uid(), 'commissioner') OR public.has_role(auth.uid(), 'hod'));

-- 3. Extend tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ward TEXT,
  ADD COLUMN IF NOT EXISTS assigned_contractor_id UUID REFERENCES public.contractors(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS traffic_density NUMERIC,
  ADD COLUMN IF NOT EXISTS press_released_at TIMESTAMPTZ;

-- 4. Enforcement events ledger
CREATE TABLE public.enforcement_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_enforcement_ticket ON public.enforcement_events(ticket_id);
CREATE INDEX idx_enforcement_type ON public.enforcement_events(event_type);
ALTER TABLE public.enforcement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view enforcement events" ON public.enforcement_events FOR SELECT USING (true);
CREATE POLICY "System can insert enforcement events" ON public.enforcement_events FOR INSERT WITH CHECK (true);

-- 5. Press releases
CREATE TABLE public.press_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  ward TEXT,
  social_cost NUMERIC NOT NULL,
  pdf_url TEXT,
  headline TEXT,
  summary TEXT,
  sent_to TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.press_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view press releases" ON public.press_releases FOR SELECT USING (true);
CREATE POLICY "Officers manage press releases" ON public.press_releases FOR ALL
  USING (public.has_role(auth.uid(), 'commissioner') OR public.has_role(auth.uid(), 'hod'))
  WITH CHECK (public.has_role(auth.uid(), 'commissioner') OR public.has_role(auth.uid(), 'hod'));
CREATE POLICY "System can insert press releases" ON public.press_releases FOR INSERT WITH CHECK (true);

-- 6. WebAuthn credentials
CREATE TABLE public.webauthn_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[],
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX idx_webauthn_user ON public.webauthn_credentials(user_id);
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own passkeys" ON public.webauthn_credentials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users delete own passkeys" ON public.webauthn_credentials FOR DELETE USING (auth.uid() = user_id);
-- inserts/updates done via edge function with service role; no client-side write policy

-- 7. SLA deadline trigger on ticket creation
CREATE OR REPLACE FUNCTION public.set_ticket_sla()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sla_deadline IS NULL THEN
    NEW.sla_deadline := NEW.created_at + INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_set_ticket_sla
BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_ticket_sla();

-- 8. Log resolved event
CREATE OR REPLACE FUNCTION public.log_ticket_resolved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'Resolved' AND (OLD.status IS NULL OR OLD.status != 'Resolved') THEN
    INSERT INTO public.enforcement_events (ticket_id, event_type, payload)
    VALUES (NEW.id, 'resolved', jsonb_build_object('resolved_at', now(), 'social_cost', NEW.social_cost));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_ticket_resolved
AFTER UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_resolved();

-- 9. Seed contractors (demo data)
INSERT INTO public.contractors (name, department, ward, phone, email) VALUES
  ('Pune Roads Co.', 'Road Dept', 'Kothrud', '+919999000001', 'roads.kothrud@civic.test'),
  ('Pune Roads Co.', 'Road Dept', 'Shivajinagar', '+919999000002', 'roads.shivaji@civic.test'),
  ('Pune Roads Co.', 'Road Dept', 'Default', '+919999000003', 'roads.default@civic.test'),
  ('PowerGrid Maint.', 'Electricity', 'Default', '+919999000004', 'power.default@civic.test'),
  ('PMC Water Works', 'Water & Sewage', 'Default', '+919999000005', 'water.default@civic.test'),
  ('CleanCity Services', 'Waste Management', 'Default', '+919999000006', 'waste.default@civic.test'),
  ('Drainage Pune', 'Drainage', 'Default', '+919999000007', 'drainage.default@civic.test');
