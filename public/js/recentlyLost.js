import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const table = document.getElementById("lostTable");
  if (!table) return console.error("No table found with id 'lostTable'");

  const body = table.querySelector("tbody");
  if (!body) return console.error("No tbody found inside 'lostTable'");

  let data = [];
  let sortConfig = { key: "dateReported", asc: true };

  const snap = await getDocs(collection(db, "reports"));
  snap.forEach(d => {
    const r = d.data();
    if (r.status === "claimed") return;
    data.push({ id: d.id, ...r });
  });

  const modal = document.createElement("div");
  modal.id = "imageModal";
  Object.assign(modal.style, {
    display: "none",
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    boxSizing: "border-box",
    zIndex: "9999",
    flexDirection: "column",
  });

  const modalImg = document.createElement("img");
  Object.assign(modalImg.style, {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
  });
  modal.appendChild(modalImg);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✖";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "16px",
    right: "16px",
    fontSize: "1.5rem",
    background: "transparent",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "none",
  });
  closeBtn.onclick = () => (modal.style.display = "none");
  modal.appendChild(closeBtn);

  modal.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
  };

  document.body.appendChild(modal);

  function openModal(src) {
    modalImg.src = src;
    modal.style.display = "flex";
    closeBtn.style.display = "block";
  }

  /* =============================
     RENDER FUNCTION
  ============================= */
  function render(arr) {
    body.innerHTML = "";
    arr.forEach(d => {
      const row = body.insertRow();
      row.insertCell().textContent = d.dateReported?.toDate?.().toLocaleDateString() || "";
      row.insertCell().textContent = d.id;

      const imgCell = row.insertCell();
      if (d.imageUrl) {
        const btn = document.createElement("button");
        btn.textContent = "Show";
        btn.classList.add("show-button");
        btn.onclick = () => openModal(d.imageUrl);
        imgCell.appendChild(btn);
      } else {
        imgCell.textContent = "—";
      }

      row.insertCell().textContent = d.location || "";
      row.insertCell().textContent = d.reporterName || "";
      row.insertCell().textContent = d.reporterContact || "";
    });
  }

  /* =============================
     SORT FUNCTION
  ============================= */
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
  const keys = ["dateReported", "id", "imageUrl", "location", "reporterName", "reporterContact"];
  headers.forEach((th, i) => (th.onclick = () => sortBy(keys[i])));

  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      const v = e.target.value.toLowerCase();
      render(
        data.filter(d =>
          Object.values(d).some(val => val && val.toString().toLowerCase().includes(v))
        )
      );
    });
  }

  render(data);
});
