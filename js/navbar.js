import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

window.go = page => location.href = page + ".html";

window.logout = () => {
  import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js")
    .then(({ signOut }) => signOut(auth))
    .then(() => location.href = "login.html");
};

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  const role = snap.exists() ? snap.data().role : "user";

  const res = await fetch(role === "admin" ? "admin-navbar.html" : "navbar.html");
  const html = await res.text();
  const navbar = document.getElementById("navbar");
  navbar.innerHTML = html;

  const hamburger = navbar.querySelector(".hamburger");
  const overlay = navbar.querySelector(".nav-overlay");
  const closeBtn = overlay.querySelector(".close-overlay");

  hamburger.addEventListener("click", () => overlay.classList.add("active"));
  closeBtn.addEventListener("click", () => overlay.classList.remove("active"));

  overlay.querySelectorAll("button[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = btn.dataset.page + ".html";
      overlay.classList.remove("active");
    });
  });

  navbar.querySelectorAll("button[data-page]").forEach(btn => {
    btn.addEventListener("click", () => window.location.href = btn.dataset.page + ".html");
  });
});
