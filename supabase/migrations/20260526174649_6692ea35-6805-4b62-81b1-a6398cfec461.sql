
-- 1. PROFILES: hide email column from non-owners via view + column revoke
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;
-- Owner can still read their own email through a security-definer helper
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

-- 2. CONTRACTORS: restrict to signed-in users (still need it for admin UI)
DROP POLICY IF EXISTS "Anyone can view contractors" ON public.contractors;
CREATE POLICY "Authenticated can view contractors"
  ON public.contractors FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.contractors FROM anon;

-- 3. DEPARTMENT_SCORES: triggers run as SECURITY DEFINER so they still work;
-- drop the permissive policies and allow only officers via PostgREST.
DROP POLICY IF EXISTS "Anyone can insert dept scores" ON public.department_scores;
DROP POLICY IF EXISTS "Anyone can update dept scores" ON public.department_scores;
CREATE POLICY "Officers insert dept scores"
  ON public.department_scores FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'commissioner'::app_role) OR has_role(auth.uid(),'hod'::app_role));
CREATE POLICY "Officers update dept scores"
  ON public.department_scores FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'commissioner'::app_role) OR has_role(auth.uid(),'hod'::app_role));

-- 4. ENFORCEMENT_EVENTS: inserts come from triggers (SECURITY DEFINER) — close the public hole
DROP POLICY IF EXISTS "System can insert enforcement events" ON public.enforcement_events;
CREATE POLICY "Officers insert enforcement events"
  ON public.enforcement_events FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'commissioner'::app_role) OR has_role(auth.uid(),'hod'::app_role));

-- 5. USER_ROLES: explicit deny on self-mutation
CREATE POLICY "No self insert roles"
  ON public.user_roles FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "No self update roles"
  ON public.user_roles FOR UPDATE TO authenticated, anon USING (false);
CREATE POLICY "No self delete roles"
  ON public.user_roles FOR DELETE TO authenticated, anon USING (false);

-- 6. TICKETS: remove anon update (was USING true for public role)
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;
CREATE POLICY "Authenticated can update tickets"
  ON public.tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 7. STORAGE: press-releases bucket — officer-only write
CREATE POLICY "Officers upload press releases"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='press-releases' AND (has_role(auth.uid(),'commissioner'::app_role) OR has_role(auth.uid(),'hod'::app_role)));
CREATE POLICY "Officers update press releases"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='press-releases' AND (has_role(auth.uid(),'commissioner'::app_role) OR has_role(auth.uid(),'hod'::app_role)));
CREATE POLICY "Officers delete press releases"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='press-releases' AND (has_role(auth.uid(),'commissioner'::app_role) OR has_role(auth.uid(),'hod'::app_role)));

-- 8. STORAGE: ticket-photos — owners may delete their own files
CREATE POLICY "Owners delete ticket photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='ticket-photos' AND owner = auth.uid());

-- 9. WEBAUTHN_CHALLENGES: explicit deny — only service role (edge fns) may touch
CREATE POLICY "Deny client select webauthn_challenges"
  ON public.webauthn_challenges FOR SELECT TO authenticated, anon USING (false);
CREATE POLICY "Deny client insert webauthn_challenges"
  ON public.webauthn_challenges FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "Deny client update webauthn_challenges"
  ON public.webauthn_challenges FOR UPDATE TO authenticated, anon USING (false);
CREATE POLICY "Deny client delete webauthn_challenges"
  ON public.webauthn_challenges FOR DELETE TO authenticated, anon USING (false);
