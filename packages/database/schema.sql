-- Event Timeline — PostgreSQL Schema
-- Requires: PostgreSQL 16+, pgvector extension

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE event_status AS ENUM ('developing', 'settled', 'long_term', 'disputed');
CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE credibility_tier AS ENUM ('tier1', 'tier2', 'tier3', 'unknown');
CREATE TYPE location_type AS ENUM ('country', 'region', 'city', 'point');
CREATE TYPE timeline_node_type AS ENUM (
  'outbreak', 'escalation', 'turning_point',
  'official_statement', 'development', 'aftermath'
);
CREATE TYPE event_relation_type AS ENUM ('background', 'consequence', 'parallel', 'sub_event');
CREATE TYPE tracking_status AS ENUM ('candidate', 'tracking', 'archived');

-- ============================================================
-- Sources
-- ============================================================

CREATE TABLE sources (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  domain        VARCHAR(255) NOT NULL UNIQUE,
  country_code  CHAR(2),
  language      VARCHAR(10),
  credibility_tier credibility_tier NOT NULL DEFAULT 'unknown',
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Locations
-- ============================================================

CREATE TABLE locations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  name_en       VARCHAR(200),
  type          location_type NOT NULL,
  country_code  CHAR(2),
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  parent_id     UUID REFERENCES locations(id),
  wikidata_id   VARCHAR(20),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_country ON locations (country_code);
CREATE INDEX idx_locations_coords ON locations (latitude, longitude);

-- ============================================================
-- Topics
-- ============================================================

CREATE TABLE topics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          VARCHAR(50) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  name_en       VARCHAR(100),
  icon          VARCHAR(50),
  sort_order    INT NOT NULL DEFAULT 0
);

INSERT INTO topics (slug, name, name_en, sort_order) VALUES
  ('politics',    '政治', 'Politics',    1),
  ('disaster',    '灾害', 'Disaster',    2),
  ('conflict',    '冲突', 'Conflict',    3),
  ('economy',     '财经', 'Economy',     4),
  ('tech',        '科技', 'Technology',  5),
  ('health',      '健康', 'Health',      6),
  ('society',     '社会', 'Society',     7),
  ('environment', '环境', 'Environment', 8),
  ('sports',      '体育', 'Sports',      9),
  ('culture',     '文化', 'Culture',    10);

-- ============================================================
-- Articles
-- ============================================================

CREATE TABLE articles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id     UUID NOT NULL REFERENCES sources(id),
  external_id   VARCHAR(255),
  url           TEXT NOT NULL,
  title         TEXT NOT NULL,
  title_zh      TEXT,
  snippet       TEXT,
  snippet_zh    TEXT,
  language      VARCHAR(10) NOT NULL DEFAULT 'en',
  published_at  TIMESTAMPTZ NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tone          DOUBLE PRECISION,
  image_url     TEXT,
  location_id   UUID REFERENCES locations(id),
  is_duplicate  BOOLEAN NOT NULL DEFAULT FALSE,
  embedding     vector(1536),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_articles_url ON articles (url);
CREATE INDEX idx_articles_published ON articles (published_at DESC);
CREATE INDEX idx_articles_source ON articles (source_id, published_at DESC);
CREATE INDEX idx_articles_embedding ON articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- Events
-- ============================================================

CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            VARCHAR(200) NOT NULL UNIQUE,
  title           VARCHAR(300) NOT NULL,
  title_en        VARCHAR(300),
  summary         TEXT NOT NULL,
  status          event_status NOT NULL DEFAULT 'developing',
  tracking_status tracking_status NOT NULL DEFAULT 'candidate',
  confidence      confidence_level NOT NULL DEFAULT 'medium',
  heat_score      DOUBLE PRECISION NOT NULL DEFAULT 0,
  article_count   INT NOT NULL DEFAULT 0,
  source_count    INT NOT NULL DEFAULT 0,
  location_id     UUID REFERENCES locations(id),
  category_hint   VARCHAR(50),
  first_seen_at   TIMESTAMPTZ NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL,
  last_collected_at TIMESTAMPTZ,
  peak_at         TIMESTAMPTZ,
  cover_image_url TEXT,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  raw_payload     JSONB,
  embedding       vector(1536),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_heat ON events (heat_score DESC, last_updated_at DESC);
CREATE INDEX idx_events_status ON events (status, last_updated_at DESC);
CREATE INDEX idx_events_tracking ON events (tracking_status, heat_score DESC);
CREATE INDEX idx_events_location ON events (location_id);
CREATE INDEX idx_events_first_seen ON events (first_seen_at DESC);
CREATE INDEX idx_events_search ON events USING gin(to_tsvector('simple', title || ' ' || COALESCE(summary, '')));
CREATE INDEX idx_events_embedding ON events USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ============================================================
-- Event ↔ Article (many-to-many)
-- ============================================================

CREATE TABLE event_articles (
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  relevance_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, article_id)
);

CREATE INDEX idx_event_articles_article ON event_articles (article_id);

-- ============================================================
-- Timeline Items
-- ============================================================

CREATE TABLE timeline_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  occurred_at         TIMESTAMPTZ NOT NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT,
  node_type           timeline_node_type NOT NULL DEFAULT 'development',
  importance          INT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  source_article_ids  UUID[] NOT NULL DEFAULT '{}',
  is_ai_generated     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_event ON timeline_items (event_id, occurred_at DESC);

-- ============================================================
-- Event ↔ Topic (many-to-many)
-- ============================================================

CREATE TABLE event_topics (
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  topic_id    UUID NOT NULL REFERENCES topics(id),
  confidence  DOUBLE PRECISION DEFAULT 1.0,
  PRIMARY KEY (event_id, topic_id)
);

-- ============================================================
-- Event Relations
-- ============================================================

CREATE TABLE event_relations (
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  related_event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  relation_type     event_relation_type NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, related_event_id),
  CHECK (event_id != related_event_id)
);

-- ============================================================
-- Users
-- ============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE,
  phone         VARCHAR(20) UNIQUE,
  display_name  VARCHAR(100),
  locale        VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Subscriptions
-- ============================================================

CREATE TABLE subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  notify_on_update  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX idx_subscriptions_user ON subscriptions (user_id);

-- ============================================================
-- Notifications
-- ============================================================

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  timeline_item_id  UUID REFERENCES timeline_items(id),
  title             VARCHAR(300) NOT NULL,
  body              TEXT,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);

-- ============================================================
-- Pipeline tracking
-- ============================================================

CREATE TABLE fetch_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type   VARCHAR(50) NOT NULL,
  category      VARCHAR(50),
  status        VARCHAR(20) NOT NULL DEFAULT 'running',
  articles_found INT DEFAULT 0,
  articles_new  INT DEFAULT 0,
  error_message TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);

CREATE INDEX idx_fetch_logs_source ON fetch_logs (source_type, started_at DESC);

-- ============================================================
-- Event query packs (for tracked event re-collection)
-- ============================================================

CREATE TABLE event_queries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  keywords      TEXT[] NOT NULL DEFAULT '{}',
  aliases       TEXT[] NOT NULL DEFAULT '{}',
  exclude_words TEXT[] NOT NULL DEFAULT '{}',
  gdelt_query   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_queries_event ON event_queries (event_id);

-- ============================================================
-- Collection runs
-- ============================================================

CREATE TABLE collection_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_type        VARCHAR(50) NOT NULL,
  source_type     VARCHAR(50),
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  category        VARCHAR(50),
  status          VARCHAR(20) NOT NULL DEFAULT 'running',
  articles_found  INT NOT NULL DEFAULT 0,
  articles_new    INT NOT NULL DEFAULT 0,
  events_created  INT NOT NULL DEFAULT 0,
  events_promoted INT NOT NULL DEFAULT 0,
  error_message   TEXT,
  metadata        JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

CREATE INDEX idx_collection_runs_type ON collection_runs (run_type, started_at DESC);
CREATE INDEX idx_collection_runs_event ON collection_runs (event_id, started_at DESC);

-- ============================================================
-- Daily snapshots
-- ============================================================

CREATE TABLE event_daily_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  heat_score      DOUBLE PRECISION NOT NULL DEFAULT 0,
  article_count   INT NOT NULL DEFAULT 0,
  source_count    INT NOT NULL DEFAULT 0,
  new_articles_24h INT NOT NULL DEFAULT 0,
  summary         TEXT,
  top_headlines   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, snapshot_date)
);

CREATE INDEX idx_snapshots_event_date ON event_daily_snapshots (event_id, snapshot_date DESC);

-- ============================================================
-- Hotspot candidates (pre-event clustering buffer)
-- ============================================================

CREATE TABLE hotspot_candidates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_key     VARCHAR(64) NOT NULL,
  title           VARCHAR(300) NOT NULL,
  category_hint   VARCHAR(50),
  heat_score      DOUBLE PRECISION NOT NULL DEFAULT 0,
  article_count   INT NOT NULL DEFAULT 0,
  source_count    INT NOT NULL DEFAULT 0,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'open',
  first_seen_at   TIMESTAMPTZ NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_hotspot_candidates_cluster ON hotspot_candidates (cluster_key);
CREATE INDEX idx_hotspot_candidates_status ON hotspot_candidates (status, heat_score DESC);
