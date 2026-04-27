const API = "https://mzansi.archiverepo1.workers.dev/";

document.addEventListener("DOMContentLoaded", () => {
  loadRecent();

  document.getElementById("searchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") search();
  });

  document.getElementById("doiInput").addEventListener("keydown", e => {
    if (e.key === "Enter") addDOI();
  }); 
});

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function setStatus(message, type = "info") {
  const status = document.getElementById("status");
  status.style.display = "block";
  status.innerHTML = `<p>${escapeHtml(message)}</p>`;
  status.className = type;
}

async function loadRecent() {
  const results = document.getElementById("results");
  const related = document.getElementById("related");

  results.innerHTML = "<p>Loading recent articles...</p>";
  related.innerHTML = "";

  try {
    const data = await apiGet("/recent");
    renderResults(Array.isArray(data) ? data : []);
  } catch (err) {
    results.innerHTML = `<p>Could not load recent articles: ${escapeHtml(err.message)}</p>`;
  }
}

async function search() {
  const q = document.getElementById("searchInput").value.trim();
  const results = document.getElementById("results");
  const related = document.getElementById("related");

  related.innerHTML = "";

  if (!q) {
    loadRecent();
    return;
  }

  results.innerHTML = "<p>Searching...</p>";

  try {
    const data = await apiGet(`/search?q=${encodeURIComponent(q)}`);
    renderResults(Array.isArray(data) ? data : []);
  } catch (err) {
    results.innerHTML = `<p>Search failed: ${escapeHtml(err.message)}</p>`;
  }
}

async function addDOI() {
  const doi = document.getElementById("doiInput").value.trim();

  if (!doi) {
    setStatus("Enter a DOI.", "error");
    return;
  }

  setStatus("Adding DOI and enriching metadata from Crossref...", "info");

  try {
    const res = await fetch(`${API}/doi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doi }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      setStatus(data.error || "DOI could not be added.", "error");
      return;
    }

    setStatus(data.duplicate ? `Already exists: ${data.title}` : `Added: ${data.title}`, "success");
    document.getElementById("doiInput").value = "";
    loadRecent();
  } catch (err) {
    setStatus(`Request failed: ${err.message}`, "error");
  }
}

function renderResults(records) {
  const results = document.getElementById("results");
  const related = document.getElementById("related");

  results.innerHTML = "";

  if (!records.length) {
    results.innerHTML = "<p>No results found. Add an article by DOI to begin.</p>";
    related.innerHTML = "";
    return;
  }

  records.forEach((r) => {
    const div = document.createElement("div");
    div.className = "card";

    const title = escapeHtml(r.title || "Untitled");
    const abstract = escapeHtml(truncate(r.abstract || "No abstract available.", 350));
    const authors = escapeHtml(parseAuthors(r.authors) || "Authors not listed");
    const journal = escapeHtml(r.journal || "Unknown journal");
    const year = r.publication_year ? ` • ${escapeHtml(String(r.publication_year))}` : "";
    const doi = r.doi ? `<div style="font-size:0.85em;color:#666;margin-top:4px;">DOI: ${escapeHtml(r.doi)}</div>` : "";

    div.innerHTML = `
      <h3>${title}</h3>
      <p>${abstract}</p>
      <small>${authors}</small>
      <div style="font-size:0.85em;color:#666;margin-top:6px;">
        ${journal}${year}
      </div>
      ${doi}
    `;

    div.querySelector("h3").addEventListener("click", () => loadRelated(r.id));
    results.appendChild(div);
  });
}

async function loadRelated(id) {
  const related = document.getElementById("related");
  related.innerHTML = "<p>Loading related articles...</p>";

  try {
    const data = await apiGet(`/related?id=${encodeURIComponent(id)}`);

    if (!Array.isArray(data) || !data.length) {
      related.innerHTML = "<p>No related articles found yet.</p>";
      return;
    }

    related.innerHTML = data.map(r => `
      <div class="card">
        <h4>${escapeHtml(r.title || "Untitled")}</h4>
        <p>${escapeHtml(truncate(r.abstract || "No abstract available.", 220))}</p>
        <small>${escapeHtml(parseAuthors(r.authors))}</small>
        <div style="font-size:0.85em;color:#666;margin-top:6px;">
          ${escapeHtml(r.journal || "Unknown journal")}
          ${r.publication_year ? " • " + escapeHtml(String(r.publication_year)) : ""}
        </div>
        <small>Relevance: ${(Number(r.score || 0) * 100).toFixed(1)}%</small>
      </div>
    `).join("");
  } catch (err) {
    related.innerHTML = `<p>Failed to load related articles: ${escapeHtml(err.message)}</p>`;
  }
}

function parseAuthors(a) {
  try {
    const parsed = JSON.parse(a);
    return Array.isArray(parsed) ? parsed.join(", ") : String(a || "");
  } catch {
    return String(a || "");
  }
}

function truncate(text = "", max = 300) {
  const t = String(text || "").trim();
  return t.length > max ? t.slice(0, max) + "..." : t;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
