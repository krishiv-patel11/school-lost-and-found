import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const table = document.getElementById("foundTable");
  if (!table) return console.error("No table found with id 'foundTable'");

  const body = table.querySelector("tbody");
  if (!body) return console.error("No tbody found inside 'foundTable'");

  let data = [];
  let sortConfig = { key: "approvedAt", asc: false };

  const snap = await getDocs(query(collection(db, "claims"), orderBy("approvedAt", "desc")));

  for (const d of snap.docs) {
    const claim = d.data();
    if (claim.status !== "approved") continue;

    const reportSnap = await getDoc(doc(db, "reports", claim.reportId));
    if (!reportSnap.exists()) continue;

    const report = reportSnap.data();
    if (report.status !== "claimed") continue;

    data.push({
      dateReported: report.dateReported,
      reportId: claim.reportId,
      itemName: report.itemName,
      location: report.location,
      reporterName: report.reporterName,
      reporterContact: report.reporterContact,
      claimantName: claim.claimantName,
      approvedAt: claim.approvedAt,
      imageUrl: report.imageUrl || ""
    });
  }

  function render(arr) {
    body.innerHTML = "";
    arr.forEach(d => {
      const row = body.insertRow();
      row.insertCell().textContent = d.dateReported?.toDate().toLocaleDateString() || "";
      row.insertCell().textContent = d.reportId || "";

      const imgCell = row.insertCell();
      if (d.imageUrl) {
        const btn = document.createElement("button");
        btn.textContent = "Show";
        btn.onclick = () => showImageModal(d.imageUrl, d.itemName);
        imgCell.appendChild(btn);
      } else {
        imgCell.textContent = "—";
      }

      row.insertCell().textContent = d.itemName || "";
      row.insertCell().textContent = d.location || "";
      row.insertCell().textContent = d.reporterName || "";
      row.insertCell().textContent = d.reporterContact || "";
      row.insertCell().textContent = d.claimantName || "";
      row.insertCell().textContent = d.approvedAt?.toDate().toLocaleString() || "";
    });
  }

  function sortBy(key) {
    sortConfig.asc = sortConfig.key === key ? !sortConfig.asc : true;
    sortConfig.key = key;

    data.sort((a, b) => {
      let vA = a[key];
      let vB = b[key];
      if (vA?.toDate) vA = vA.toDate().getTime();
      if (vB?.toDate) vB = vB.toDate().getTime();

      if (typeof vA === "number" && typeof vB === "number") return sortConfig.asc ? vA - vB : vB - vA;
      return sortConfig.asc ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
    });

    render(data);
  }

  const headers = table.querySelectorAll("th");
  const keys = ["dateReported", "reportId", "imageUrl", "itemName", "location", "reporterName", "reporterContact", "claimantName", "approvedAt"];
  headers.forEach((th, i) => {
    th.onclick = () => sortBy(keys[i]);
  });

  render(data);

  function showImageModal(url, alt) {
    const existing = document.getElementById("imageModal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "imageModal";

    const container = document.createElement("div");

    const img = document.createElement("img");
    img.src = url;
    img.alt = alt || "Image";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "X";
    closeBtn.onclick = () => overlay.remove();

    container.appendChild(img);
    container.appendChild(closeBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }
});
