-- Atomic function to increment last_sequence and return the new value
-- This prevents race conditions and ensures deletions don't reset the counter
CREATE OR REPLACE FUNCTION increment_set_sequence(set_id_input uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_seq integer;
BEGIN
  UPDATE fafa_product_sets
  SET last_sequence = last_sequence + 1
  WHERE id = set_id_input
  RETURNING last_sequence INTO new_seq;

  IF new_seq IS NULL THEN
    RAISE EXCEPTION 'Set not found: %', set_id_input;
  END IF;

  RETURN new_seq;
END;
$$;
