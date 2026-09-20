-- Migration: Create slot_bookings table and book_slot function
-- Description: Establishes a 72-hour queuing system for slots with atomic row-level locking

-- 1. Create the slot_bookings table to track the queue for each slot
CREATE TABLE IF NOT EXISTS slot_bookings (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  holder_name TEXT,
  logo_url TEXT,
  website_url TEXT,
  x_handle TEXT,
  amount_paid INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled', -- 'pending', 'scheduled', 'active', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_slot_bookings_slot_id ON slot_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_bookings_status ON slot_bookings(status);
CREATE INDEX IF NOT EXISTS idx_slot_bookings_time ON slot_bookings(starts_at, ends_at);

-- 3. Enable RLS and create policies
ALTER TABLE slot_bookings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active and scheduled bookings to display the queue
CREATE POLICY "Public can read slot_bookings" ON slot_bookings FOR SELECT USING (true);

-- Ensure service role has full access (used by the API)
CREATE POLICY "Service role has full access" ON slot_bookings USING (true) WITH CHECK (true);

-- 4. Create the atomic book_slot PostgreSQL function
-- This function handles concurrency using row-level locking (FOR UPDATE)
-- to ensure two concurrent purchases don't get the same time slot.
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
  -- 4a. Lock the parent slot row. This is CRITICAL for concurrency.
  -- Any concurrent transaction calling this function for the same p_slot_id will wait here.
  PERFORM 1 FROM slots WHERE id = p_slot_id FOR UPDATE;

  -- 4b. Find the absolute latest ends_at for this specific slot from active/scheduled bookings
  SELECT MAX(sb.ends_at) INTO v_latest_end 
  FROM slot_bookings sb 
  WHERE sb.slot_id = p_slot_id AND sb.status IN ('active', 'scheduled');

  -- 4c. Calculate queue position
  -- If there's no active/scheduled booking, or if the latest booking ended in the past, start immediately
  IF v_latest_end IS NULL OR v_latest_end < CURRENT_TIMESTAMP THEN
    v_starts_at := CURRENT_TIMESTAMP;
  ELSE
    -- If there is a queue, start EXACTLY when the last booking ends
    v_starts_at := v_latest_end;
  END IF;

  -- 4d. Fixed 72-hour duration
  v_ends_at := v_starts_at + INTERVAL '72 hours';

  -- 4e. Insert the new booking into the queue
  INSERT INTO slot_bookings (
    id, slot_id, order_id, holder_name, logo_url, website_url, x_handle, amount_paid, starts_at, ends_at, status
  ) VALUES (
    p_booking_id, p_slot_id, p_order_id, p_holder_name, p_logo_url, p_website_url, p_x_handle, p_amount_paid, v_starts_at, v_ends_at, 'scheduled'
  );

  -- 4f. Update the slots table to mark it as 'live'
  -- We don't overwrite holder data on the slots table itself here. 
  -- The frontend will pull the active booking from slot_bookings.
  UPDATE slots SET 
    status = 'live'
  WHERE id = p_slot_id;

  -- 4g. Return the calculated times
  RETURN QUERY SELECT p_booking_id, v_starts_at, v_ends_at;
END;
$$;
