CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  abstract TEXT DEFAULT '',
  authors TEXT DEFAULT '[]',
  doi TEXT UNIQUE,
  journal TEXT DEFAULT '',
  publication_year INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_articles_title ON articles(title);
CREATE INDEX IF NOT EXISTS idx_articles_abstract ON articles(abstract);
CREATE INDEX IF NOT EXISTS idx_articles_doi ON articles(doi);
