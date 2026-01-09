import { db } from "./firebase.js";
import { collection, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const listContainer = document.getElementById("riskList");
  if (!listContainer) return console.error("No container found with id 'riskList'");

  let data = [];
  const cutoff = Timestamp.fromDate(new Date(Date.now() - 30 * 86400000));

  const snap = await getDocs(collection(db, "reports"));
  snap.forEach(d => {
    const r = d.data();
    if (r.type !== "lost") return;
    if (r.status === "claimed") return;
    if (!r.dateReported || r.dateReported > cutoff) return;
    data.push({ id: d.id, ...r });
  });

  const modal = document.createElement("div");
  modal.id = "imageModal";
  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.top = 0;
  modal.style.left = 0;
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.75)";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.padding = "24px";
  modal.style.boxSizing = "border-box";
  modal.style.zIndex = "9999";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";

  const modalImg = document.createElement("img");
  modalImg.style.maxWidth = "100%";
  modalImg.style.maxHeight = "100%";
  modalImg.style.objectFit = "contain";
  modalImg.style.borderRadius = "8px";
  modalImg.style.boxShadow = "0 8px 24px rgba(0,0,0,0.6)";
  modal.appendChild(modalImg);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✖";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "16px";
  closeBtn.style.right = "16px";
  closeBtn.style.fontSize = "1.5rem";
  closeBtn.style.fontWeight = "bold";
  closeBtn.style.background = "transparent";
  closeBtn.style.color = "#fff";
  closeBtn.style.border = "none";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.zIndex = "10000";
  closeBtn.style.padding = "4px 8px";
  closeBtn.style.transition = "all 0.3s ease";
  closeBtn.style.opacity = "0.9";

  closeBtn.onclick = () => (modal.style.display = "none");

  closeBtn.style.display = "none"; 
  modal.appendChild(closeBtn);

  document.body.appendChild(modal);

  function openModal(src) {
    modalImg.src = src;
    modal.style.display = "flex";
    closeBtn.style.display = "block"; 
  }

  modal.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
  };

  function render(arr) {
    listContainer.innerHTML = "";
    const table = document.createElement("table");

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Date Reported", "ID", "Image", "Item Name", "Location", "Reporter Name", "Reporter Contact"].forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    arr.forEach(d => {
      const row = document.createElement("tr");

      ["dateReported","id","imageUrl","itemName","location","reporterName","reporterContact"].forEach(key => {
        const td = document.createElement("td");

        if (key === "dateReported") td.textContent = d[key]?.toDate().toLocaleDateString() || "";
        else if (key === "imageUrl") {
          const btn = document.createElement("button");
          btn.textContent = "Show";
          btn.classList.add('show-button');
          btn.onclick = () => {
            if (!d[key]) {
              alert("No image available for this report.");
              return;
            }
            modalImg.src = d[key];
            modal.style.display = "flex";
          };
          td.appendChild(btn);
        } else td.textContent = d[key] || "";

        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    listContainer.appendChild(table);
  }

  render(data);
});
