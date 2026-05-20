
-- 1. Wards table
CREATE TABLE IF NOT EXISTS public.wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  city text NOT NULL DEFAULT 'Pune',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view wards" ON public.wards FOR SELECT USING (true);
CREATE POLICY "Officers manage wards" ON public.wards FOR ALL
  USING (has_role(auth.uid(), 'commissioner'::app_role) OR has_role(auth.uid(), 'hod'::app_role))
  WITH CHECK (has_role(auth.uid(), 'commissioner'::app_role) OR has_role(auth.uid(), 'hod'::app_role));

-- Seed wards from existing ward text values
INSERT INTO public.wards (name)
SELECT DISTINCT ward FROM public.tickets WHERE ward IS NOT NULL
UNION
SELECT DISTINCT ward FROM public.contractors WHERE ward IS NOT NULL
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.wards (name) VALUES
  ('Pune Central'), ('Kothrud'), ('Shivajinagar'), ('Hadapsar'), ('Aundh'), ('Kharadi')
ON CONFLICT (name) DO NOTHING;

-- 2. ward_id on contractors and tickets
ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS ward_id uuid REFERENCES public.wards(id);
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ward_id uuid REFERENCES public.wards(id);

-- Backfill ward_id from ward text
UPDATE public.contractors c SET ward_id = w.id
  FROM public.wards w WHERE c.ward_id IS NULL AND w.name = c.ward;
UPDATE public.tickets t SET ward_id = w.id
  FROM public.wards w WHERE t.ward_id IS NULL AND w.name = t.ward;

CREATE INDEX IF NOT EXISTS idx_contractors_dept_ward ON public.contractors(department, ward_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_tickets_ward_id ON public.tickets(ward_id);

-- 3. Image + audit columns on tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS resolution_image_url text,
  ADD COLUMN IF NOT EXISTS ai_integrity_score int,
  ADD COLUMN IF NOT EXISTS ai_audit_status text NOT NULL DEFAULT 'PENDING'
    CHECK (ai_audit_status IN ('PENDING','PROCESSING','VERIFIED_SUCCESS','FAILED_FRAUD','ERROR')),
  ADD COLUMN IF NOT EXISTS ai_analysis_notes jsonb;

-- Backfill image_url from existing photo_url for backwards compatibility
UPDATE public.tickets SET image_url = photo_url WHERE image_url IS NULL AND photo_url IS NOT NULL;
UPDATE public.tickets SET resolution_image_url = fixed_photo_url WHERE resolution_image_url IS NULL AND fixed_photo_url IS NOT NULL;

-- 4. Updated auto-assign trigger — ward_id first, then ward text fallback
CREATE OR REPLACE FUNCTION public.auto_assign_contractor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contractor_id uuid;
  v_ward_id uuid;
  v_ward text;
BEGIN
  v_ward := COALESCE(NEW.ward, 'Pune Central');
  NEW.ward := v_ward;

  -- Resolve ward_id from text if not already set
  IF NEW.ward_id IS NULL THEN
    SELECT id INTO v_ward_id FROM public.wards WHERE name = v_ward LIMIT 1;
    IF v_ward_id IS NULL THEN
      INSERT INTO public.wards (name) VALUES (v_ward)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_ward_id;
    END IF;
    NEW.ward_id := v_ward_id;
  END IF;

  -- Match by ward_id + department first
  SELECT id INTO v_contractor_id
    FROM public.contractors
    WHERE department = NEW.department
      AND ward_id = NEW.ward_id
      AND active = true
    ORDER BY created_at ASC LIMIT 1;

  -- Fallback to ward text match
  IF v_contractor_id IS NULL THEN
    SELECT id INTO v_contractor_id
      FROM public.contractors
      WHERE department = NEW.department
        AND ward = v_ward
        AND active = true
      ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- Final fallback: any active contractor for the department
  IF v_contractor_id IS NULL THEN
    SELECT id INTO v_contractor_id
      FROM public.contractors
      WHERE department = NEW.department AND active = true
      ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_contractor_id IS NOT NULL THEN
    NEW.assigned_contractor_id := v_contractor_id;
    IF NEW.assigned_at IS NULL THEN
      NEW.assigned_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_assign_contractor ON public.tickets;
CREATE TRIGGER trg_auto_assign_contractor
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_contractor();

-- 5. Re-attach existing ticket triggers (set_ticket_sla, on_ticket_created, on_ticket_resolved, log_ticket_resolved, on_ticket_nudged) in case they were dropped
DROP TRIGGER IF EXISTS trg_set_ticket_sla ON public.tickets;
CREATE TRIGGER trg_set_ticket_sla BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_ticket_sla();

DROP TRIGGER IF EXISTS trg_on_ticket_created ON public.tickets;
CREATE TRIGGER trg_on_ticket_created AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.on_ticket_created();

DROP TRIGGER IF EXISTS trg_on_ticket_resolved ON public.tickets;
CREATE TRIGGER trg_on_ticket_resolved BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.on_ticket_resolved();

DROP TRIGGER IF EXISTS trg_log_ticket_resolved ON public.tickets;
CREATE TRIGGER trg_log_ticket_resolved AFTER UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_resolved();

DROP TRIGGER IF EXISTS trg_on_ticket_nudged ON public.tickets;
CREATE TRIGGER trg_on_ticket_nudged AFTER UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.on_ticket_nudged();

-- 6. Storage bucket for ticket photos (public read)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('ticket-photos', 'ticket-photos', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can read ticket photos" ON storage.objects;
CREATE POLICY "Public can read ticket photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-photos');

DROP POLICY IF EXISTS "Authenticated upload ticket photos" ON storage.objects;
CREATE POLICY "Authenticated upload ticket photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-photos');

DROP POLICY IF EXISTS "Owners update ticket photos" ON storage.objects;
CREATE POLICY "Owners update ticket photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ticket-photos' AND owner = auth.uid());
