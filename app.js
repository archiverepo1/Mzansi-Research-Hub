// ✅ Configure API endpoint
const API = "https://holy-frost-78fd.archiverepo1.workers.dev";

// Helper: clear status banner
function clearStatus() {
  const status = document.getElementById("status");
  if (!status) return;
  status.innerHTML = "";
  status.style.display = "none";
}

// Helper: show status banner
function showStatus(text, isError = false) {
  const status = document.getElementById("status");
  if (!status) return;
  status.style.display = "block";
  status.innerHTML = `<p style="color:${isError ? 'red' : '#007A4D'}">${text}</p>`;
}

// 🔍 SEARCH
async function search() {
  const q = document.getElementById("searchInput").value.trim();

  clearStatus();
  const container = document.getElementById("results");
  container.innerHTML = "Searching...";

  if (!q) {
    container.innerHTML = "<p>Type something to search.</p>";
    return;
  }

  try {
    const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const records = Array.isArray(data?.records) ? data.records : data;

    renderResults(records);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p>Error searching: ${err.message}</p>`;
  }
}

// 📥 ADD DOI
async function addDOI() {
  const doi = document.getElementById("doiInput").value.trim();

  clearStatus();
  if (!doi) {
    showStatus("Enter a DOI", true);
    return;
  }

  try {
    const res = await fetch(`${API}/doi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ doi }),
    });

    const data = await res.json();

    if (data.success) {
      showStatus(`✅ Article added: ${data.title}`);
      document.getElementById("doiInput").value = "";
      search();
    } else {
      const msg = data.error || "DOI not found";
      showStatus("❌ " + msg, true);
    }
  } catch (err) {
    console.error(err);
    showStatus("❌ Request failed (network or server error)", true);
  }
}

// 🎨 RENDER RESULTS
function renderResults(records) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  if (!records || !records.length) {
    container.innerHTML = "<p>No results found</p>";
    document.getElementById("related").innerHTML = "";
    return;
  }

  records.forEach((r) => {
    const div = document.createElement("div");
    div.className = "card";

    const authors = parseAuthors(r.authors);

    div.innerHTML = `
      <h3 onclick="loadRelated('${r.id}')">${r.title || "Untitled"}</h3>
      <p>${truncate(r.abstract, 300)}</p>
      <small>${authors}</small>
      <div style="font-size:0.8em; margin-top:5px; color:#666;">
        ${r.journal || "Journal unknown"} • ${r.publication_year || "Year unknown"}
      </div>
    `;

    container.appendChild(div);
  });
}

// 🔗 RELATED ARTICLES
async function loadRelated(id) {
  clearStatus();
  const relatedContainer = document.getElementById("related");
  relatedContainer.innerHTML = "Loading related articles...";

  try {
    const res = await fetch(`${API}/related?id=${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const related = Array.isArray(data) ? data : [];

    if (!related.length) {
      relatedContainer.innerHTML = "<p>No strongly related articles found.</p>";
      return;
    }

    relatedContainer.innerHTML = related
      .map(
        (r) => `
        <div class="card">
          <h4 onclick="highlightResult('${r.id}')">${r.title || "Untitled"}</h4>
          <small>Relevance: ${(r.score * 100).toFixed(1)}%</small>
          <p style="font-size:0.9em; color:#666;">${truncate(r.abstract, 120)}</p>
        </div>
      `
      )
      .join("");
  } catch (err) {
    console.error(err);
    relatedContainer.innerHTML = `<p>Error loading related articles: ${err.message}</p>`;
  }
}

// 🎯 HELPER: scroll to a result (optional)
function highlightResult(id) {
  const element = document.querySelector(`[onclick*="'${id}'"]`);
  if (element) element.scrollIntoView({ behavior: "smooth" });
}

// 🧠 HELPERS
function parseAuthors(a) {
  if (!a) return "";
  try {
    const parsed = JSON.parse(a);
    if (Array.isArray(parsed)) return parsed.join(", ");
    return String(parsed);
  } catch {
    return String(a);
  }
}

function truncate(text = "", max = 300) {
  if (!text) return "";
  const clean = text.trim();
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}
