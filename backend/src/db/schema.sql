-- AzureDrop database schema. Applied by `npm run migrate` (idempotent).

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  blob_name     TEXT UNIQUE NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL CHECK (size_bytes >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS share_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id    UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id    ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_name       ON files(lower(original_name));
CREATE INDEX IF NOT EXISTS idx_share_tokens_file ON share_tokens(file_id);
