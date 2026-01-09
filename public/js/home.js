import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const foundGallery = document.getElementById("foundGallery");

  try {
    const claimsQuery = query(
      collection(db, "claims"),
      where("status", "==", "approved"),
      orderBy("approvedAt", "desc"),
      limit(5)
    );

    const claimsSnap = await getDocs(claimsQuery);

    if (claimsSnap.empty) {
      foundGallery.innerHTML = "<p>No recently found items.</p>";
      return;
    }

    for (const claimDoc of claimsSnap.docs) {
      const claim = claimDoc.data();

      if (!claim.reportId) continue;

      const reportSnap = await getDoc(doc(db, "reports", claim.reportId));
      if (!reportSnap.exists()) continue;

      const report = reportSnap.data();

      const card = document.createElement("div");
      card.className = "gallery-item";

      card.innerHTML = `
        <img
          src="${report.imageUrl || "./assets/placeholder.png"}"
          alt="${report.itemName}"
        >
        <p>${report.itemName}</p>
      `;

      foundGallery.appendChild(card);
    }
  } catch (err) {
    console.error("Failed to load recently found items:", err);
    foundGallery.innerHTML = "<p>Error loading items.</p>";
  }

  document.querySelectorAll(".faq-question").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const answer = btn.nextElementSibling;
      answer.style.display =
        answer.style.display === "block" ? "none" : "block";
    });
  });
});
