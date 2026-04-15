
-- Create enums
CREATE TYPE public.ticket_status AS ENUM ('Open', 'In Progress', 'Resolved', 'Suspicious');
CREATE TYPE public.ticket_category AS ENUM ('Pothole', 'Pole Fault', 'Water Leak', 'Waste Overflow', 'Drainage Block', 'Road Damage');
CREATE TYPE public.department_type AS ENUM ('Road Dept', 'Electricity', 'Water & Sewage', 'Waste Management', 'Drainage');
CREATE TYPE public.precision_tier AS ENUM ('high', 'standard', 'low');

-- PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  total_reported INT NOT NULL DEFAULT 0,
  total_verified INT NOT NULL DEFAULT 0,
  civic_points INT NOT NULL DEFAULT 100,
  trust_score FLOAT NOT NULL DEFAULT 0,
  badge TEXT NOT NULL DEFAULT 'New Reporter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)), NEW.email);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TICKETS TABLE
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  fixed_photo_url TEXT,
  category public.ticket_category NOT NULL,
  department public.department_type NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city TEXT,
  neighborhood TEXT,
  full_precise_address TEXT,
  description TEXT NOT NULL DEFAULT '',
  priority_score FLOAT NOT NULL DEFAULT 0,
  status public.ticket_status NOT NULL DEFAULT 'Open',
  upvotes INT NOT NULL DEFAULT 0,
  user_trust_score FLOAT NOT NULL DEFAULT 0,
  precision_tier public.precision_tier DEFAULT 'standard',
  image_hash TEXT,
  near_school_or_hospital BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  admin_reviewed_at TIMESTAMPTZ,
  crew_dispatched_at TIMESTAMPTZ,
  nudge_count INT NOT NULL DEFAULT 0,
  last_nudged_at TIMESTAMPTZ
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Users can insert own tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can update tickets" ON public.tickets FOR UPDATE USING (true);

-- DEPARTMENT SCORES TABLE
CREATE TABLE public.department_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department public.department_type NOT NULL UNIQUE,
  efficiency_score FLOAT NOT NULL DEFAULT 100,
  total_tickets INT NOT NULL DEFAULT 0,
  resolved_tickets INT NOT NULL DEFAULT 0,
  avg_resolution_hours FLOAT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.department_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view dept scores" ON public.department_scores FOR SELECT USING (true);
CREATE POLICY "Anyone can update dept scores" ON public.department_scores FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert dept scores" ON public.department_scores FOR INSERT WITH CHECK (true);

INSERT INTO public.department_scores (department) VALUES ('Road Dept'), ('Electricity'), ('Water & Sewage'), ('Waste Management'), ('Drainage');

-- TRIGGER: On ticket INSERT → increment total_reported
CREATE OR REPLACE FUNCTION public.on_ticket_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET total_reported = total_reported + 1, updated_at = now() WHERE user_id = NEW.user_id;
  UPDATE public.department_scores SET total_tickets = total_tickets + 1, updated_at = now() WHERE department = NEW.department;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ticket_created AFTER INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.on_ticket_created();

-- TRIGGER: On ticket resolved → increment verified + civic points + recalculate badge
CREATE OR REPLACE FUNCTION public.on_ticket_resolved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reported INT; v_verified INT; v_trust FLOAT; v_badge TEXT;
BEGIN
  IF NEW.status = 'Resolved' AND OLD.status != 'Resolved' THEN
    UPDATE public.profiles SET total_verified = total_verified + 1, civic_points = civic_points + 50, updated_at = now() WHERE user_id = NEW.user_id;
    SELECT total_reported, total_verified INTO v_reported, v_verified FROM public.profiles WHERE user_id = NEW.user_id;
    v_trust := CASE WHEN v_reported > 0 THEN (v_verified::FLOAT / v_reported::FLOAT) * 100 ELSE 0 END;
    v_badge := CASE WHEN v_verified > 10 AND v_trust > 90 THEN 'Trusted Reporter' WHEN v_reported >= 3 THEN 'Active Reporter' ELSE 'New Reporter' END;
    UPDATE public.profiles SET trust_score = v_trust, badge = v_badge, updated_at = now() WHERE user_id = NEW.user_id;
    UPDATE public.department_scores SET resolved_tickets = resolved_tickets + 1, updated_at = now() WHERE department = NEW.department;
  END IF;
  IF NEW.status = 'In Progress' AND (OLD.status IS NULL OR OLD.status != 'In Progress') THEN
    NEW.crew_dispatched_at := now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ticket_resolved BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.on_ticket_resolved();

-- TRIGGER: Nudge penalty
CREATE OR REPLACE FUNCTION public.on_ticket_nudged()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.nudge_count > OLD.nudge_count THEN
    UPDATE public.department_scores SET efficiency_score = GREATEST(0, efficiency_score - 5), updated_at = now() WHERE department = NEW.department;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ticket_nudged BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.on_ticket_nudged();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
