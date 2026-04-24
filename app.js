const API = "https://holy-frost-78fd.archiverepo1.workers.dev";

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function search() {
  const q = document.getElementById("searchInput").value.trim();
  const results = document.getElementById("results");
  const related = document.getElementById("related");

  results.innerHTML = "<p>Searching...</p>";
  related.innerHTML = "";

  if (!q) {
    results.innerHTML = "<p>Enter a search term.</p>";
    return;
  }

  try {
    const data = await apiGet(`/search?q=${encodeURIComponent(q)}`);
    renderResults(Array.isArray(data) ? data : []);
  } catch (err) {
    results.innerHTML = `<p>Search failed: ${err.message}</p>`;
  }
}

async function addDOI() {
  const doi = document.getElementById("doiInput").value.trim();
  const status = document.getElementById("status");
  if (!doi) {
    status.innerHTML = "<p>Enter a DOI.</p>";
    return;
  }

  status.innerHTML = "<p>Adding DOI...</p>";

  try {
    const res = await fetch(`${API}/doi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doi }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      status.innerHTML = `<p>Failed: ${data.error || "Unknown error"}</p>`;
      return;
    }

    status.innerHTML = `<p>Added: ${data.title}</p>`;
    search();
  } catch (err) {
    status.innerHTML = `<p>Request failed: ${err.message}</p>`;
  }
}

function renderResults(records) {
  const results = document.getElementById("results");
  const related = document.getElementById("related");
  results.innerHTML = "";

  if (!records.length) {
    results.innerHTML = "<p>No results found. The database is probably empty.</p>";
    related.innerHTML = "";
    return;
  }

  records.forEach((r) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3 onclick="loadRelated('${r.id}')">${r.title || "Untitled"}</h3>
      <p>${truncate(r.abstract, 300)}</p>
      <small>${parseAuthors(r.authors)}</small>
      <div style="font-size:0.85em;color:#666;margin-top:6px;">
        ${r.journal || "Unknown journal"} ${r.publication_year ? "• " + r.publication_year : ""}
      </div>
    `;
    results.appendChild(div);
  });
}

async function loadRelated(id) {
  const related = document.getElementById("related");
  related.innerHTML = "<p>Loading related articles...</p>";

  try {
    const data = await apiGet(`/related?id=${encodeURIComponent(id)}`);
    if (!data.length) {
      related.innerHTML = "<p>No related articles found.</p>";
      return;
    }

    related.innerHTML = data.map(r => `
      <div class="card">
        <h4>${r.title || "Untitled"}</h4>
        <small>Relevance: ${(r.score * 100).toFixed(1)}%</small>
      </div>
    `).join("");
  } catch (err) {
    related.innerHTML = `<p>Failed to load related articles: ${err.message}</p>`;
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
