
-- Challenges table for WebAuthn ceremonies
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  challenge text NOT NULL,
  type text NOT NULL CHECK (type IN ('registration','authentication')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_lookup ON public.webauthn_challenges(challenge);
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- No client-side access; edge functions use service role.

-- Allow users to manage their own passkeys (registration)
DROP POLICY IF EXISTS "Users insert own passkeys" ON public.webauthn_credentials;
CREATE POLICY "Users insert own passkeys" ON public.webauthn_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own passkeys" ON public.webauthn_credentials;
CREATE POLICY "Users update own passkeys" ON public.webauthn_credentials
  FOR UPDATE USING (auth.uid() = user_id);
