-- schema.sql
DROP TABLE IF EXISTS slots;
CREATE TABLE slots (
  id TEXT PRIMARY KEY,
  size TEXT NOT NULL, -- 'big', 'small', 'micro'
  holder_name TEXT,
  logo_url TEXT,
  website_url TEXT,
  x_handle TEXT,
  current_bid INTEGER NOT NULL, -- Stored in paise (INR * 100)
  status TEXT DEFAULT 'available', -- 'available', 'pending', 'live'
  protection_expiry TIMESTAMPTZ,
  slot_expiry TIMESTAMPTZ
);

DROP TABLE IF EXISTS bids;
CREATE TABLE bids (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  order_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'successful', 'failed', 'outbid'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (slot_id) REFERENCES slots(id)
);

DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  razorpay_order_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'created', -- 'created', 'paid', 'verified', 'failed'
  slot_id TEXT NOT NULL,
  user_data TEXT, -- JSON payload of buyer details
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Initial seed data
INSERT INTO slots (id, size, current_bid) VALUES
('micro-1', 'micro', 299900),
('micro-2', 'micro', 299900),
('small-1', 'small', 699900),
('small-2', 'small', 699900),
('small-3', 'small', 699900),
('small-4', 'small', 699900),
('small-5', 'small', 699900),
('big-1', 'big', 1999900),
('big-2', 'big', 1999900),
('big-3', 'big', 1999900);
