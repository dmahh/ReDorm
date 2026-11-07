CREATE POLICY "Listing photos are viewable by everyone"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'item-photos');