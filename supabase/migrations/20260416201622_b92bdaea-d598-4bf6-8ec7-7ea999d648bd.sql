-- v8.0 Civic Ledger: trust_score starts at 85, +20 per high-accuracy report, +100 on admin verification

-- Update profile defaults
ALTER TABLE public.profiles ALTER COLUMN trust_score SET DEFAULT 85;
UPDATE public.profiles SET trust_score = 85 WHERE trust_score = 0 AND total_reported = 0;

-- New trigger: +20 civic points per high/standard precision ticket creation
CREATE OR REPLACE FUNCTION public.on_ticket_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles 
    SET total_reported = total_reported + 1, 
        civic_points = civic_points + CASE WHEN NEW.precision_tier IN ('high','standard') THEN 20 ELSE 5 END,
        updated_at = now() 
    WHERE user_id = NEW.user_id;
  UPDATE public.department_scores SET total_tickets = total_tickets + 1, updated_at = now() WHERE department = NEW.department;
  RETURN NEW;
END;
$function$;

-- Updated resolution trigger: +100 on admin verification, +1% trust per verified, -5% on fraud
CREATE OR REPLACE FUNCTION public.on_ticket_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reported INT; v_verified INT; v_trust FLOAT; v_badge TEXT;
BEGIN
  IF NEW.status = 'Resolved' AND OLD.status != 'Resolved' THEN
    UPDATE public.profiles 
      SET total_verified = total_verified + 1, 
          civic_points = civic_points + 100,
          trust_score = LEAST(100, trust_score + 1),
          updated_at = now() 
      WHERE user_id = NEW.user_id;
    SELECT total_reported, total_verified, trust_score INTO v_reported, v_verified, v_trust 
      FROM public.profiles WHERE user_id = NEW.user_id;
    v_badge := CASE 
      WHEN v_verified > 10 AND v_trust > 90 THEN 'Trusted Reporter' 
      WHEN v_reported >= 3 THEN 'Active Reporter' 
      ELSE 'New Reporter' 
    END;
    UPDATE public.profiles SET badge = v_badge, updated_at = now() WHERE user_id = NEW.user_id;
    UPDATE public.department_scores SET resolved_tickets = resolved_tickets + 1, updated_at = now() WHERE department = NEW.department;
  END IF;
  IF NEW.status = 'Suspicious' AND OLD.status != 'Suspicious' THEN
    UPDATE public.profiles 
      SET trust_score = GREATEST(0, trust_score - 5),
          updated_at = now() 
      WHERE user_id = NEW.user_id;
  END IF;
  IF NEW.status = 'In Progress' AND (OLD.status IS NULL OR OLD.status != 'In Progress') THEN
    NEW.crew_dispatched_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Update handle_new_user to set trust_score 85
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, trust_score)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)), NEW.email, 85);
  RETURN NEW;
END;
$function$;