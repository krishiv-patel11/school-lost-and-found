import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const convoId = new URLSearchParams(window.location.search).get("id");

const messagesDiv = document.getElementById("messagesContainer");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendMessageBtn");

onAuthStateChanged(auth, async user => {
  if (!user || !convoId) {
    window.location.href = "inbox.html";
    return;
  }

  const convoRef = doc(db, "conversations", convoId);
  const convoSnap = await getDoc(convoRef);

  if (!convoSnap.exists()) {
    alert("Conversation not found");
    window.location.href = "inbox.html";
    return;
  }

  const convo = convoSnap.data();

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const role = userSnap.exists() ? userSnap.data().role : "user";

  const isParticipant = convo.participants.includes(user.uid) || role === "admin";
  if (!isParticipant) {
    alert("You are not allowed to view this conversation");
    window.location.href = "inbox.html";
    return;
  }

  const messagesQuery = query(
    collection(db, "conversations", convoId, "messages"),
    orderBy("timestamp", "asc")
  );

  const nameCache = {};

  onSnapshot(messagesQuery, async snap => {
    messagesDiv.innerHTML = "";

    const missingIds = new Set();
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.senderRole !== "admin" && !nameCache[data.senderId]) {
        missingIds.add(data.senderId);
      }
    });

    await Promise.all(Array.from(missingIds).map(async uid => {
      try {
        const senderSnap = await getDoc(doc(db, "users", uid));
        nameCache[uid] = senderSnap.exists()
          ? senderSnap.data().name || "User"
          : "User";
      } catch {
        nameCache[uid] = "User";
      }
    }));

    snap.docs.forEach(d => {
      const data = d.data();
      const m = document.createElement("div");

      const displayName =
        data.senderRole === "admin"
          ? "Admin"
          : nameCache[data.senderId] || "User";

      m.textContent = `${displayName}: ${data.text}`;
      messagesDiv.appendChild(m);
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

  sendBtn.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;

    await addDoc(collection(db, "conversations", convoId, "messages"), {
      senderId: user.uid,
      senderRole: role,
      text,
      timestamp: Timestamp.now()
    });

    input.value = "";
  };
});
