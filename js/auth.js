import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      // Allow anonymous demo users
      if (user.isAnonymous) {
        location.href = "home.html";
        return;
      }

      location.href = "login.html";
      return;
    }


    const data = snap.data();

    if (data.banned) {
      await auth.signOut();
      alert("Your account has been banned.");
      location.href = "login.html";
      return;
    }

    location.href = data.role === "admin"
      ? "admin.html"
      : "home.html";

  } catch (err) {
    console.error("Auth check failed:", err);
    location.href = "login.html";
  }
});
