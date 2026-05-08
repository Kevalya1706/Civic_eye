
INSERT INTO storage.buckets (id, name, public) VALUES ('press-releases', 'press-releases', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read press releases"
ON storage.objects FOR SELECT
USING (bucket_id = 'press-releases');
