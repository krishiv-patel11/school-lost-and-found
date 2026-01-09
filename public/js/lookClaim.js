import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { collection, getDocs, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

let REPORTS = [];
let PREVIEW_REPORT = null;
let CLAIMED_IDS = new Set();

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async user => {
    if (!user) return window.location.href = "login.html";

    const addBtn = document.getElementById("addKeyword");
    const searchBtn = document.getElementById("searchBtn");
    const submitLookup = document.getElementById("submitLookup");
    const confirmClaimBtn = document.getElementById("confirmClaim");
    const cancelClaimBtn = document.getElementById("cancelClaim");

    if (addBtn) addBtn.onclick = addKeyword;
    if (searchBtn) searchBtn.onclick = runSearch;
    if (submitLookup) submitLookup.onclick = previewClaim;
    if (confirmClaimBtn) confirmClaimBtn.onclick = confirmClaim;
    if (cancelClaimBtn) cancelClaimBtn.onclick = () => togglePreview(false);

    await preloadReports();
  });
});

async function preloadReports() {
  const [rSnap, cSnap] = await Promise.all([
    getDocs(collection(db,"reports")),
    getDocs(collection(db,"claims"))
  ]);

  CLAIMED_IDS.clear();
  cSnap.forEach(c => CLAIMED_IDS.add(c.data().reportId));

  REPORTS = [];
  rSnap.forEach(d => {
    const r = d.data();
    if (!["open","pending"].includes(r.status)) return;
    if (CLAIMED_IDS.has(d.id)) return;
    REPORTS.push({ id: d.id, ...r });
  });
}

function addKeyword() {
  const wrap = document.createElement("div");
  const input = document.createElement("input");
  input.className = "keywordInput";
  input.placeholder = "Keyword";
  const remove = document.createElement("button");
  remove.textContent = "✕";
  remove.onclick = () => wrap.remove();
  wrap.appendChild(input);
  wrap.appendChild(remove);
  document.getElementById("keywordContainer")?.appendChild(wrap);
}

async function runSearch() {
  const words = [...document.querySelectorAll(".keywordInput")]
    .map(i => i.value.trim())
    .filter(Boolean);

  if (!words.length) {
    document.getElementById("results").textContent = "Add at least one keyword.";
    return;
  }

  try {
    const res = await fetch("http://127.0.0.1:5001/school-lost-and-found-dde60/us-central1/semanticSearch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: words.join(" ") })
    });

    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    REPORTS = data;
    displayResults(data);

  } catch (err) {
    console.error(err);
    alert("Search failed: " + err.message);
  }
}

function displayResults(results) {
  const container = document.getElementById("results");
  container.innerHTML = "";
  if (!results.length) { 
    container.textContent = "No matches found."; 
    return; 
  }

  results.forEach(r => {
    const div = document.createElement("div");
    div.className = "result-card";
    div.innerHTML = `
      <strong>${r.itemName || "Unknown Item"}</strong><br>
      ${r.description || ""}<br>
      <small>${r.location || ""}</small><br>
      Match: ${r.similarity}%<br>
      ${r.imageUrl ? `<button class="showImageBtn">Show</button>` : ""}<br>
      <small>ID: ${r.id}</small>
    `;

    if (r.imageUrl) {
      const btn = div.querySelector(".showImageBtn");
      btn.addEventListener("click", () => showImage(r.imageUrl));
    }

    container.appendChild(div);
  });
}

window.showImage = src => {
  const modal = document.getElementById("imageModal");
  const img = document.getElementById("modalImage");
  if (!modal || !img) return;
  img.src = src;
  modal.style.display = "flex";
};

document.getElementById("closeModalBtn").onclick = () => {
  document.getElementById("imageModal").style.display = "none";
};

document.getElementById("imageModal").addEventListener("click", e => {
  if (e.target.id === "imageModal") {
    e.target.style.display = "none";
  }
});

window.closeModal = () => {
  const modal = document.getElementById("imageModal");
  if (modal) modal.style.display = "none";
};

function previewClaim() {
  const id = document.getElementById("claimId")?.value.trim();
  const report = REPORTS.find(r => r.id === id);
  if (!report) { alert("Invalid Report ID"); return; }
  PREVIEW_REPORT = report;
  const img = document.getElementById("previewImg");
  if (img) img.src = report.imageUrl || "";
  togglePreview(true);
}

function togglePreview(show) {
  const preview = document.getElementById("claimPreview");
  if (preview) preview.style.display = show ? "block" : "none";
}

async function confirmClaim() {
  if (!PREVIEW_REPORT) return;
  const name = document.getElementById("claimName")?.value.trim();
  const contact = document.getElementById("claimContact")?.value.trim();
  if (!name || !contact) { alert("Please fill out all fields."); return; }

  await addDoc(collection(db,"claims"), { 
    reportId: PREVIEW_REPORT.id, 
    claimantName: name, 
    contact, 
    userId: auth.currentUser.uid,
    status: "pending", 
    timestamp: Timestamp.now() 
  });

  alert("Claim submitted.");
  togglePreview(false);
  await preloadReports();
}

const closeBtn = document.getElementById("closeModalBtn");
if (closeBtn) closeBtn.addEventListener("click", () => {
  const modal = document.getElementById("imageModal");
  modal.style.display = "none";
});

const modal = document.getElementById("imageModal");
if (modal) {
  modal.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });
}
