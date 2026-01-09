import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const roleSnap = await getDoc(doc(db, "users", user.uid));
  if (!roleSnap.exists() || roleSnap.data().role !== "admin") {
    location.href = "home.html";
    return;
  }

  const usersDiv = document.getElementById("users");
  usersDiv.innerHTML = "Loading users...";

  const snap = await getDocs(collection(db, "users"));
  usersDiv.innerHTML = "";

  snap.forEach(userDoc => {
    const data = userDoc.data();
    const uid = userDoc.id;

    const div = document.createElement("div");

    const roleBtn = document.createElement("button");
    roleBtn.textContent = data.role === "admin" ? "Demote to User" : "Promote to Admin";

    roleBtn.onclick = async () => {
      await updateDoc(doc(db, "users", uid), {
        role: data.role === "admin" ? "user" : "admin"
      });
      location.reload();
    };

    const banBtn = document.createElement("button");
    banBtn.textContent = data.banned ? "Unban" : "Ban";

    if (uid === user.uid) {
      roleBtn.disabled = true;
      banBtn.disabled = true;
    }

    banBtn.onclick = async () => {
      await updateDoc(doc(db, "users", uid), {
        banned: !data.banned
      });
      location.reload();
    };

    div.innerHTML = `
      <strong>Name:</strong> ${data.name || "N/A"}<br>
      <strong>UID:</strong> ${uid}<br>
      <strong>Role:</strong> ${data.role || "user"}<br>
      <strong>Status:</strong> ${data.banned ? "BANNED" : "Active"}<br><br>
    `;

    div.appendChild(roleBtn);
    div.appendChild(banBtn);
    usersDiv.appendChild(div);
  });
});
