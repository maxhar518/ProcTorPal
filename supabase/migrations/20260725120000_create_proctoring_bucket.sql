-- Create the proctoring storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('proctoring', 'proctoring', false)
ON CONFLICT DO NOTHING;
