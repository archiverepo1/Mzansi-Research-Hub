const API = "https://holy-frost-78fd.archiverepo1.workers.dev";

// 🔍 SEARCH
async function search() {
  const q = document.getElementById("searchInput").value.trim();

  const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}`);
  const data = await res.json();

  renderResults(data);
}

// 📥 ADD DOI
async function addDOI() {
  const doi = document.getElementById("doiInput").value.trim();

  if (!doi) {
    alert("Enter a DOI");
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
      alert("✅ Article added: " + data.title);
      search();
    } else {
      alert("❌ " + (data.error || "DOI not found"));
    }
  } catch (err) {
    console.error(err);
    alert("Request failed");
  }
}

// 🎨 RENDER RESULTS
function renderResults(records) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  if (!records.length) {
    container.innerHTML = "<p>No results found</p>";
    return;
  }

  records.forEach((r) => {
    const div = document.createElement("div");
    div.className = "card";

    const authors = parseAuthors(r.authors);

    div.innerHTML = `
      <h3 onclick="loadRelated('${r.id}')">${r.title}</h3>
      <p>${truncate(r.abstract)}</p>
      <small>${authors}</small>
    `;

    container.appendChild(div);
  });
}

// 🔗 RELATED
async function loadRelated(id) {
  const res = await fetch(`${API}/related?id=${id}`);
  const data = await res.json();

  const container = document.getElementById("related");

  container.innerHTML = data
    .map(
      (r) => `
    <div class="card">
      <h4>${r.title}</h4>
      <small>Relevance: ${(r.score * 100).toFixed(1)}%</small>
    </div>
  `
    )
    .join("");
}

// 🧠 HELPERS
function parseAuthors(a) {
  try {
    const parsed = JSON.parse(a);
    return parsed.join(", ");
  } catch {
    return a || "";
  }
}

function truncate(text = "", max = 300) {
  return text.length > max ? text.slice(0, max) + "..." : text;
}
