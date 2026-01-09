import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "login.html";

  const list = document.getElementById("conversationList");
  list.innerHTML = "";

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", user.uid)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    list.textContent = "No conversations yet";
    return;
  }

  for (const convoDoc of snap.docs) {
    const convo = convoDoc.data();

    let label = "Conversation";

    if (convo.reportId) {
      const reportSnap = await getDoc(doc(db, "reports", convo.reportId));
      if (reportSnap.exists()) {
        label = `Item: ${reportSnap.data().itemName}`;
      }
    }

    const btn = document.createElement("button");
    btn.textContent = label;

    btn.onclick = () => {
      location.href = `conversation.html?id=${convoDoc.id}`;
    };

    list.appendChild(btn);
  }
});
