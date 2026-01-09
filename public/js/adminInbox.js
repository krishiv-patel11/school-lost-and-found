import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const convoList = document.getElementById("conversationList");
const messagesDiv = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let activeConversation = null;

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "login.html";

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", user.uid)
  );

  const snap = await getDocs(q);

  snap.forEach(d => {
    const div = document.createElement("div");
    div.textContent = `Report ${d.data().reportId}`;
    div.onclick = () => {
      activeConversation = d.id;
      loadMessages(d.id);
    };
    convoList.appendChild(div);
  });
});

function loadMessages(id) {
  const q = query(
    collection(db, "conversations", id, "messages"),
    orderBy("timestamp")
  );

  onSnapshot(q, snap => {
    messagesDiv.innerHTML = "";
    snap.forEach(d => {
      const data = d.data();
      const p = document.createElement("p");
      p.textContent = `${data.senderRole}: ${data.text}`;
      messagesDiv.appendChild(p);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

sendBtn.onclick = async () => {
  if (!activeConversation || !input.value.trim()) return;

  const user = auth.currentUser;
  await addDoc(
    collection(db, "conversations", activeConversation, "messages"),
    {
      senderId: user.uid,
      senderRole: "admin",
      text: input.value.trim(),
      timestamp: Timestamp.now()
    }
  );

  input.value = "";
};
