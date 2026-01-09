import { auth, db, storage } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

let currentUser = null;

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "login.html";
    return;
  }
  currentUser = user;
});

window.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".report-form");

  const itemNameInput = document.getElementById("itemName");
  const descriptionInput = document.getElementById("description");
  const locationInput = document.getElementById("location");
  const tagsSelect = document.getElementById("tags");
  const reporterNameInput = document.getElementById("reporterName");
  const reporterContactInput = document.getElementById("reporterContact");
  const imageInput = document.getElementById("reportImage");
  const submitBtn = document.getElementById("submitReport");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert("You must be logged in");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const itemName = itemNameInput.value.trim();
    const description = descriptionInput.value.trim();
    const location = locationInput.value.trim();
    const tags = Array.from(tagsSelect.selectedOptions).map(o => o.value);
    const reporterName = reporterNameInput.value.trim();
    const reporterContact = reporterContactInput.value.trim();

    if (!itemName || !description || !location) {
      alert("Please fill out all required fields");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
      return;
    }

    let imageUrl = "";

    try {
      if (imageInput.files.length > 0) {
        const file = imageInput.files[0];
        const storageRef = ref(
          storage,
          `reports/${currentUser.uid}_${Date.now()}_${file.name}`
        );

        const snapshot = await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "reports"), {
        itemName,
        description,
        location,
        tags,
        reporterName,
        reporterContact,
        reporterId: currentUser.uid,
        dateReported: Timestamp.now(),
        status: "open",
        imageUrl
      });

      form.reset();
      tagsSelect.selectedIndex = -1;

      alert("Report submitted successfully!");

    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });
});
