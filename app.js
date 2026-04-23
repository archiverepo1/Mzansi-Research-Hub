const API = "https://holy-frost-78fd.archiverepo1.workers.dev/";

// SEARCH
async function search() {
  const q = document.getElementById("searchInput").value;

  const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}`);
  const data = await res.json();

  renderResults(data);
}

// DOI INGEST
async function addDOI() {
  const doi = document.getElementById("doiInput").value;

  const res = await fetch(`${API}/doi`, {
    method: "POST",
    body: JSON.stringify({ doi })
  });

  const data = await res.json();

  if (data.success) {
    alert("Article added");
    search();
  } else {
    alert("DOI not found");
  }
}

// RENDER
function renderResults(records) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  records.forEach(r => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3 onclick="loadRelated('${r.id}')">${r.title}</h3>
      <p>${r.abstract || ""}</p>
      <small>${r.authors?.join(", ") || ""}</small>
    `;

    container.appendChild(div);
  });
}

// RELATED
async function loadRelated(id) {
  const res = await fetch(`${API}/related?id=${id}`);
  const data = await res.json();

  const container = document.getElementById("related");
  container.innerHTML = data.map(r => `
    <div class="card">
      <h4>${r.title}</h4>
      <small>Score: ${r.score.toFixed(2)}</small>
    </div>
  `).join("");
}
