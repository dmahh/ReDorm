CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  email text NOT NULL UNIQUE CHECK (email ~* '^[^@\s]+@[^@\s]+\.edu$'),
  dorm text NOT NULL,
  token_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  category text NOT NULL CHECK (category IN ('Electronics','Study Materials','Furniture','Kitchen','Appliances','Free')),
  condition text NOT NULL CHECK (condition IN ('Like New','Good','Used')),
  transaction_type text NOT NULL CHECK (transaction_type IN ('Sell','Free','Swap')),
  price numeric(10,2) CHECK (price IS NULL OR price >= 0),
  swap_details text,
  building text NOT NULL,
  photos text[] NOT NULL DEFAULT '{}',
  seller_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  seller_name text NOT NULL,
  seller_dorm text NOT NULL,
  reserved boolean NOT NULL DEFAULT false,
  reserved_by uuid REFERENCES public.students(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.items TO anon, authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listings are publicly viewable" ON public.items FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX items_created_at_idx ON public.items (created_at DESC);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX messages_item_idx ON public.messages (item_id, created_at);
CREATE INDEX messages_participants_idx ON public.messages (sender_id, recipient_id);

INSERT INTO public.students (id, name, email, dorm) VALUES
  ('11111111-1111-4111-8111-111111111111','Aisha Khan','aisha.khan@stateu.edu','Maple Hall'),
  ('22222222-2222-4222-8222-222222222222','Marcus Lee','marcus.lee@stateu.edu','Oak Hall'),
  ('33333333-3333-4333-8333-333333333333','Sofia Ramirez','sofia.ramirez@stateu.edu','Birch Hall'),
  ('44444444-4444-4444-8444-444444444444','Daniel Kim','daniel.kim@stateu.edu','Cedar Hall'),
  ('55555555-5555-4555-8555-555555555555','Priya Patel','priya.patel@stateu.edu','Pine Hall');

INSERT INTO public.items (title, description, category, condition, transaction_type, price, swap_details, building, photos, seller_id, seller_name, seller_dorm, created_at) VALUES
  ('Adjustable LED desk lamp','Three brightness levels and a USB charging port in the base. Perfect for late-night study sessions. Bulb works great.','Electronics','Like New','Sell',12,NULL,'Maple Hall',ARRAY['/images/items/desk-lamp.jpg'],'11111111-1111-4111-8111-111111111111','Aisha Khan','Maple Hall', now() - interval '2 hours'),
  ('Compact mini fridge (3.1 cu ft)','Keeps drinks cold and has a small freezer section. Cleaned and defrosted, ready for move-in. You pick up from Oak Hall lobby.','Appliances','Good','Sell',45,NULL,'Oak Hall',ARRAY['/images/items/mini-fridge.jpg'],'22222222-2222-4222-8222-222222222222','Marcus Lee','Oak Hall', now() - interval '5 hours'),
  ('Intro to Psychology textbook','11th edition, a few highlighted pages but otherwise clean. Used for PSY 101.','Study Materials','Good','Swap',NULL,'Looking for a Calculus I textbook or a lab coat','Birch Hall',ARRAY['/images/items/psych-textbook.jpg'],'33333333-3333-4333-8333-333333333333','Sofia Ramirez','Birch Hall', now() - interval '1 day'),
  ('Electric kettle','1.7L stainless kettle, boils in minutes. Moving out and can''t take it with me.','Kitchen','Like New','Free',NULL,NULL,'Maple Hall',ARRAY['/images/items/electric-kettle.jpg'],'11111111-1111-4111-8111-111111111111','Aisha Khan','Maple Hall', now() - interval '1 day 3 hours'),
  ('Folding desk chair','Sturdy folding chair with a cushioned seat. Some scuffs on the legs.','Furniture','Used','Sell',15,NULL,'Cedar Hall',ARRAY['/images/items/desk-chair.jpg'],'44444444-4444-4444-8444-444444444444','Daniel Kim','Cedar Hall', now() - interval '2 days'),
  ('Portable Bluetooth speaker','Great battery life, loud enough for a dorm room. Comes with charging cable.','Electronics','Good','Swap',NULL,'Open to swapping for a desk fan or headphones','Oak Hall',ARRAY['/images/items/bluetooth-speaker.jpg'],'22222222-2222-4222-8222-222222222222','Marcus Lee','Oak Hall', now() - interval '2 days 6 hours'),
  ('Countertop microwave','700W microwave, turntable included. Works perfectly, just a bit worn on the outside.','Appliances','Used','Sell',25,NULL,'Pine Hall',ARRAY['/images/items/microwave.jpg'],'55555555-5555-4555-8555-555555555555','Priya Patel','Pine Hall', now() - interval '3 days'),
  ('3-tier bookshelf','Light wood bookshelf, easy to carry. Fits nicely next to a dorm bed.','Furniture','Good','Free',NULL,NULL,'Birch Hall',ARRAY['/images/items/bookshelf.jpg'],'33333333-3333-4333-8333-333333333333','Sofia Ramirez','Birch Hall', now() - interval '3 days 4 hours'),
  ('Storage bins & hangers bundle','Two stackable bins plus about 20 hangers. Free to whoever wants them first.','Free','Good','Free',NULL,NULL,'Cedar Hall',ARRAY['/images/items/storage-bins.jpg'],'44444444-4444-4444-8444-444444444444','Daniel Kim','Cedar Hall', now() - interval '4 days'),
  ('TI-84 Plus graphing calculator','Barely used, includes a slide cover and fresh batteries. Required for most math courses.','Study Materials','Like New','Sell',40,NULL,'Pine Hall',ARRAY['/images/items/graphing-calculator.jpg'],'55555555-5555-4555-8555-555555555555','Priya Patel','Pine Hall', now() - interval '5 days');