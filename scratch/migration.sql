-- scratch/migration.sql

CREATE TABLE IF NOT EXISTS slot_bookings (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL REFERENCES slots(id),
  order_id TEXT NOT NULL,
  holder_name TEXT,
  logo_url TEXT,
  website_url TEXT,
  x_handle TEXT,
  amount_paid INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE slot_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read slot_bookings" ON slot_bookings FOR SELECT USING (true);

-- Atomic function to book a slot safely and handle the queue
CREATE OR REPLACE FUNCTION book_slot(
  p_booking_id TEXT,
  p_slot_id TEXT,
  p_order_id TEXT,
  p_holder_name TEXT,
  p_logo_url TEXT,
  p_website_url TEXT,
  p_x_handle TEXT,
  p_amount_paid INTEGER
) RETURNS TABLE (
  booking_id TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_starts_at TIMESTAMPTZ;
  v_ends_at TIMESTAMPTZ;
  v_latest_end TIMESTAMPTZ;
BEGIN
  -- Lock the slot row to prevent concurrent bookings
  PERFORM 1 FROM slots WHERE id = p_slot_id FOR UPDATE;

  -- Find the latest ends_at for this slot
  SELECT MAX(sb.ends_at) INTO v_latest_end 
  FROM slot_bookings sb 
  WHERE sb.slot_id = p_slot_id AND sb.status IN ('active', 'scheduled');

  -- If there's no active/scheduled booking, or if it ended in the past, start now
  IF v_latest_end IS NULL OR v_latest_end < CURRENT_TIMESTAMP THEN
    v_starts_at := CURRENT_TIMESTAMP;
  ELSE
    v_starts_at := v_latest_end;
  END IF;

  v_ends_at := v_starts_at + INTERVAL '72 hours';

  INSERT INTO slot_bookings (
    id, slot_id, order_id, holder_name, logo_url, website_url, x_handle, amount_paid, starts_at, ends_at, status
  ) VALUES (
    p_booking_id, p_slot_id, p_order_id, p_holder_name, p_logo_url, p_website_url, p_x_handle, p_amount_paid, v_starts_at, v_ends_at, 'scheduled'
  );

  RETURN QUERY SELECT p_booking_id, v_starts_at, v_ends_at;
END;
$$;
