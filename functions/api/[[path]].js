export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace("/api", "");

  try {
    if (request.method === "OPTIONS") return cors();

    if (path === "/" || path === "") {
      const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM articles").first();
      return json({ ok: true, message: "Mzansi API is live", articles: row.count });
    }

    if (path === "/recent") {
      const { results } = await env.DB.prepare(`
        SELECT * FROM articles
        ORDER BY COALESCE(created_at, '') DESC
        LIMIT 20
      `).all();

      return json(results || []);
    }

    if (path === "/search") {
      const q = cleanText(url.searchParams.get("q") || "");
      if (!q) return json([]);

      const tokens = q.toLowerCase().split(/\W+/).filter(w => w.length > 2).slice(0, 6);
      if (!tokens.length) return json([]);

      const clauses = tokens.map(() => `
        (
          LOWER(title) LIKE ?
          OR LOWER(abstract) LIKE ?
          OR LOWER(authors) LIKE ?
          OR LOWER(journal) LIKE ?
          OR LOWER(doi) LIKE ?
        )
      `).join(" AND ");

      const binds = [];
      for (const t of tokens) {
        const like = `%${t.replace(/[%_]/g, "")}%`;
        binds.push(like, like, like, like, like);
      }

      const { results } = await env.DB.prepare(`
        SELECT * FROM articles
        WHERE ${clauses}
        ORDER BY COALESCE(created_at, '') DESC
        LIMIT 50
      `).bind(...binds).all();

      return json(results || []);
    }

    if (path === "/doi" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const doi = normalizeDoi(body.doi || "");

      if (!doi) return json({ success: false, error: "DOI required" }, 400);

      const existing = await env.DB.prepare(
        "SELECT id, title FROM articles WHERE doi = ? LIMIT 1"
      ).bind(doi).first();

      if (existing) {
        return json({ success: true, duplicate: true, id: existing.id, title: existing.title });
      }

      const cr = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      if (!cr.ok) return json({ success: false, error: "DOI not found in Crossref" }, 404);

      const data = await cr.json();
      const item = data.message || {};

      const title = cleanText(item.title?.[0] || "No title");
      const abstract = cleanText(item.abstract || "");
      const authors = (item.author || [])
        .map(a => `${a.given || ""} ${a.family || ""}`.trim())
        .filter(Boolean);

      const journal = cleanText(item["container-title"]?.[0] || "");
      const publication_year =
        item.published?.["date-parts"]?.[0]?.[0] ||
        item.issued?.["date-parts"]?.[0]?.[0] ||
        null;

      const id = crypto.randomUUID();
      const created_at = new Date().toISOString();
      const publisher_url = `https://doi.org/${doi}`;

      await env.DB.prepare(`
        INSERT INTO articles
        (id, title, abstract, authors, doi, journal, publication_year, created_at, source, repository_url, publisher_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        title,
        abstract,
        JSON.stringify(authors),
        doi,
        journal,
        publication_year,
        created_at,
        "DOI Submission",
        "",
        publisher_url
      ).run();

      return json({ success: true, id, title, doi });
    }

    return json({ error: "Not found" }, 404);

  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

function normalizeDoi(v) {
  return String(v || "")
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function cleanText(v) {
  return String(v || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function cors() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
}
