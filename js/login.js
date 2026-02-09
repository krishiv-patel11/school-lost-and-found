import { auth } from "./firebase.js";
import { 
  signInWithEmailAndPassword,
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {

  const urlParams = new URLSearchParams(window.location.search);
  const isDemo = urlParams.get("demo") === "true";

  if (isDemo) {
    signInAnonymously(auth)
      .then(() => {
        window.location.href = "index.html";
      })
      .catch((error) => {
        console.error("Demo login failed:", error);
      });

    return;
  }

  const form = document.querySelector("form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(
        auth, 
        emailInput.value, 
        passwordInput.value
      );
      window.location.href = "index.html";
    } catch (error) {
      alert("Login failed: " + error.message);
    }
  };
});
