import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  updateDoc,
  arrayUnion,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

window.addEventListener("DOMContentLoaded", () => {
  const inqName = document.getElementById("inqName");
  const inqDescription = document.getElementById("inqDescription");
  const inqId = document.getElementById("inqId");
  const inqType = document.getElementById("inqType");
  const submitInquiry = document.getElementById("submitInquiry");
  const list = document.getElementById("inquiryList");

  async function loadInquiries() {
    list.innerHTML = "";
    const snap = await getDocs(collection(db, "inquiries"));

    snap.forEach(async d => {
      const data = d.data();
      const div = document.createElement("div");
      div.className = "inquiry-card";


      const name = data.name || "Anonymous";
      const header = document.createElement("div");
      header.className = "inquiry-header";

      const strong = document.createElement("strong");
      strong.textContent = name;

      const text = document.createElement("span");
      text.textContent = ` — ${data.type}: ${data.description}`;

      header.appendChild(strong);
      header.appendChild(text);
      div.appendChild(header);

      const repliesDiv = document.createElement("div");
      repliesDiv.className = "inquiry-replies";


      if (data.replies) {
        data.replies.forEach(r => {
          const rDiv = document.createElement("div");
          rDiv.textContent = `${r.name}: ${r.text}`;
          repliesDiv.appendChild(rDiv);
        });
      }

      const replyInput = document.createElement("input");
      replyInput.placeholder = "Write a reply...";
      replyInput.className = "inquiry-reply-input";
      const replyBtn = document.createElement("button");
      replyBtn.textContent = "Reply";
      replyBtn.type = "button";
      replyBtn.className = "inquiry-reply-btn";


      replyBtn.onclick = async () => {
        const user = auth.currentUser;
        if (!user) return alert("You must be logged in to reply.");
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userName = userSnap.exists() ? userSnap.data().name || "Anonymous" : "Anonymous";

        if (!replyInput.value) return;

        await updateDoc(doc(db, "inquiries", d.id), {
          replies: arrayUnion({ text: replyInput.value, name: userName, timestamp: Timestamp.now() })
        });

        replyInput.value = "";
        loadInquiries();
      };

      const del = document.createElement("button");
      del.textContent = "Delete";
      del.type = "button";
      del.className = "inquiry-delete-btn";
      const user = auth.currentUser;
      if (user) {
        const snapUser = await getDoc(doc(db, "users", user.uid));
        const role = snapUser.exists() ? snapUser.data().role : "user";
        const isOwner = data.userId === user.uid;
        if (!(isOwner || role === "admin")) del.style.display = "none";
      }

      del.onclick = async () => {
        await deleteDoc(doc(db, "inquiries", d.id));
        div.remove();
      };

      div.appendChild(repliesDiv);
      div.appendChild(replyInput);
      div.appendChild(replyBtn);
      div.appendChild(del);
      list.appendChild(div);
    });
  }

  submitInquiry.onclick = async () => {
    const nameValue = inqName.value || "Anonymous";
    const descriptionValue = inqDescription.value;
    const idValue = inqId.value;
    const typeValue = inqType.value;

    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to submit.");

    try {
      await addDoc(collection(db, "inquiries"), {
        name: nameValue,
        description: descriptionValue,
        reportId: idValue,
        type: typeValue,
        userId: user.uid,
        replies: [],
        timestamp: Timestamp.now()
      });

      inqName.value = "";
      inqDescription.value = "";
      inqId.value = "";
      inqType.selectedIndex = 0;

      loadInquiries();
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      alert("Failed to submit inquiry");
    }
  };

  loadInquiries();
});
