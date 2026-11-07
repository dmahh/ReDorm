ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_email_check;
UPDATE public.students
  SET email = split_part(email, '@', 1) || '@qairu.edu.kz'
  WHERE id IN (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  );
ALTER TABLE public.students
  ADD CONSTRAINT students_email_qairu_check CHECK (email ~* '^[^@\s]+@qairu\.edu\.kz$') NOT VALID;