-- Delete the appointments with wrong year
DELETE FROM appointments 
WHERE scheduled_at::date = '2025-01-23';

-- Insert corrected appointments for 2026-01-23
INSERT INTO appointments (user_id, lead_id, professional_id, service_id, scheduled_at, status, "patientName", "serviceName", "professionalName", duracao, price, "phoneNumber")
SELECT 
  '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc',
  l.id,
  p.id,
  s.id,
  '2026-01-23 09:00:00+00',
  'pendente',
  l.name,
  s.name,
  p.name,
  s.duration,
  s.price,
  NULLIF(regexp_replace(l.phone, '[^0-9]', '', 'g'), '')::numeric
FROM leads l
CROSS JOIN (SELECT id, name FROM professionals WHERE user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc' AND is_active = true LIMIT 1) p
CROSS JOIN (SELECT id, name, duration, price FROM services WHERE user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc' AND is_available = true LIMIT 1) s
WHERE l.user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc'
LIMIT 1;

INSERT INTO appointments (user_id, lead_id, professional_id, service_id, scheduled_at, status, "patientName", "serviceName", "professionalName", duracao, price, "phoneNumber")
SELECT 
  '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc',
  l.id,
  p.id,
  s.id,
  '2026-01-23 10:30:00+00',
  'confirmado',
  l.name,
  s.name,
  p.name,
  s.duration,
  s.price,
  NULLIF(regexp_replace(l.phone, '[^0-9]', '', 'g'), '')::numeric
FROM leads l
CROSS JOIN (SELECT id, name FROM professionals WHERE user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc' AND is_active = true LIMIT 1) p
CROSS JOIN (SELECT id, name, duration, price FROM services WHERE user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc' AND is_available = true OFFSET 1 LIMIT 1) s
WHERE l.user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc'
OFFSET 1 LIMIT 1;

INSERT INTO appointments (user_id, lead_id, professional_id, service_id, scheduled_at, status, "patientName", "serviceName", "professionalName", duracao, price, "phoneNumber")
SELECT 
  '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc',
  l.id,
  p.id,
  s.id,
  '2026-01-23 14:00:00+00',
  'pendente',
  l.name,
  s.name,
  p.name,
  s.duration,
  s.price,
  NULLIF(regexp_replace(l.phone, '[^0-9]', '', 'g'), '')::numeric
FROM leads l
CROSS JOIN (SELECT id, name FROM professionals WHERE user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc' AND is_active = true LIMIT 1) p
CROSS JOIN (SELECT id, name, duration, price FROM services WHERE user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc' AND is_available = true OFFSET 2 LIMIT 1) s
WHERE l.user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc'
OFFSET 2 LIMIT 1;

INSERT INTO appointments (user_id, lead_id, professional_id, service_id, scheduled_at, status, "patientName", "serviceName", "professionalName", duracao, price, "phoneNumber")
SELECT 
  '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc',
  l.id,
  p.id,
  s.id,
  '2026-01-23 15:30:00+00',
  'risco',
  l.name,
  s.name,
  p.name,
  s.duration,
  s.price,
  NULLIF(regexp_replace(l.phone, '[^0-9]', '', 'g'), '')::numeric
FROM leads l
CROSS JOIN (SELECT id, name FROM professionals WHERE user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc' AND is_active = true LIMIT 1) p
CROSS JOIN (SELECT id, name, duration, price FROM services WHERE user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc' AND is_available = true OFFSET 3 LIMIT 1) s
WHERE l.user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc'
OFFSET 3 LIMIT 1;

INSERT INTO appointments (user_id, lead_id, professional_id, service_id, scheduled_at, status, "patientName", "serviceName", "professionalName", duracao, price, "phoneNumber")
SELECT 
  '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc',
  l.id,
  p.id,
  s.id,
  '2026-01-23 16:30:00+00',
  'pendente',
  l.name,
  s.name,
  p.name,
  s.duration,
  s.price,
  NULLIF(regexp_replace(l.phone, '[^0-9]', '', 'g'), '')::numeric
FROM leads l
CROSS JOIN (SELECT id, name FROM professionals WHERE user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc' AND is_active = true LIMIT 1) p
CROSS JOIN (SELECT id, name, duration, price FROM services WHERE user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc' AND is_available = true OFFSET 4 LIMIT 1) s
WHERE l.user_id = '0f9dda5b-1cb5-4604-adb9-34d3d6a687dc'
OFFSET 4 LIMIT 1;