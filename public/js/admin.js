import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

window.addEventListener("DOMContentLoaded", () => {
  const claimsDiv = document.getElementById("claims");
  const deleteBtn = document.getElementById("deleteBtn");
  const deleteId = document.getElementById("deleteId");

  onAuthStateChanged(auth, async user => {
    if (!user) return location.href = "login.html";
    await loadClaims();
  });

  async function loadClaims() {
    claimsDiv.innerHTML = "";

    const claimsSnap = await getDocs(collection(db, "claims"));

    for (const claimDoc of claimsSnap.docs) {
      const claim = claimDoc.data();
      if (claim.status !== "pending") continue;

      const reportRef = doc(db, "reports", claim.reportId);
      const reportSnap = await getDoc(reportRef);
      if (!reportSnap.exists()) continue;

      const report = reportSnap.data();

      const div = document.createElement("div");
      div.innerHTML = `
        <strong>CLAIM</strong><br>
        Claimant: ${claim.claimantName}<br>
        Claimed Lost Date: ${claim.lostDate}<br>
        Contact: ${claim.contact}<br><br>

        <strong>REPORT</strong><br>
        Item: ${report.itemName}<br>
        Reported On: ${report.dateReported.toDate().toLocaleDateString()}<br>
        Location: ${report.location}<br>
        Reporter: ${report.reporterName}
        <hr>
      `;

      const approveBtn = document.createElement("button");
      const rejectBtn = document.createElement("button");

      approveBtn.textContent = "Approve";
      rejectBtn.textContent = "Reject";

      approveBtn.onclick = async () => {
        const freshReport = await getDoc(reportRef);
        if (!freshReport.exists()) return;
        if (freshReport.data().status === "claimed") {
          alert("This report has already been claimed.");
          return;
        }

        await updateDoc(doc(db, "claims", claimDoc.id), {
          status: "approved",
          approvedAt: Timestamp.now()
        });

        await updateDoc(reportRef, {
          status: "claimed"
        });

        const convoRef = await addDoc(collection(db, "conversations"), {
          reportId: claim.reportId,
          claimId: claimDoc.id,
          reporterId: report.reporterId,
          claimantId: claim.userId,
          adminId: auth.currentUser.uid,
          participants: [
            report.reporterId,
            claim.userId,
            auth.currentUser.uid
          ],
          status: "active",
          createdAt: Timestamp.now()
        });

        await addDoc(collection(db, "conversations", convoRef.id, "messages"), {
          senderId: auth.currentUser.uid,
          senderRole: "admin",
          text: "Your claim has been approved. Use this chat to coordinate pickup.",
          timestamp: Timestamp.now()
        });

        div.remove();
      };

      rejectBtn.onclick = async () => {
        await updateDoc(doc(db, "claims", claimDoc.id), {
          status: "rejected",
          rejectedAt: Timestamp.now()
        });

        await updateDoc(reportRef, {
          status: "open"
        });

        div.remove();
      };

      div.append(approveBtn, rejectBtn);
      claimsDiv.appendChild(div);
    }
  }

  deleteBtn.onclick = async () => {
    if (!deleteId.value) return alert("Enter report ID");
    await deleteDoc(doc(db, "reports", deleteId.value));
    alert("Report deleted");
    deleteId.value = "";
  };
});