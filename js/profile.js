/**
 * NOTE: This file will be used for both profile.html and profile/edit.html, since the difference between those pages doesn't require two separate javascript files
 */

import { getCurrentUserID, getCurrentUserRole } from "./firebase/authentication.js";
import { getDocument, uploadFile, getFile, updateDocument, getAllWithFilter } from "./firebase/firestore.js";
import { disableConfirmRedirectDialog, enableConfirmRedirectDialog, finishLoading, redirect, signOut } from "./utils.js";
import { closeModal, loadPartial, openModal } from "./common.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runFunction);
} else {
  runFunction();
}

/**
 * This adds an event listener to the page that triggers once everything is done downloading.
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there.
 */
async function runFunction() {
  let currentUserRole = await getCurrentUserRole();
  let partialPrefix = window.location.pathname.endsWith("edit.html") ? "edit" : "";
  if (partialPrefix == "edit") {
    currentUserRole = currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1); //capitalize
  }

  // Gets the user's info from the database as an object that will be used for filling the page with the user's info
  // If userid is specified in the URL, load the specified user's profile (In this case, some information will be hidden)
  let referenceMode = false;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("userid")) {
    referenceMode = true;
  }
  const userID = referenceMode ? urlParams.get("userid") : getCurrentUserID();

  // Wait for loadPartial to complete
  if (document.getElementById("profile-content")) {
    // Determine the partial to load based on referenceMode
    const partialToLoad = referenceMode ? `profile/_volunteerProfile` : `profile/_${partialPrefix + currentUserRole}Profile`;
    await loadPartial(partialToLoad, "profile-content");
    finishLoading();

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", signOut);

    // If in reference mode, adjust the view accordingly
    if (referenceMode) {
      // Add the reference-mode class to the profile-details div if in reference mode
      document.querySelector(".profile-details").classList.add("reference-mode");

      // Delete the edit & logout button if in reference mode
      document.getElementById("editBtn").remove();
      document.getElementById("logoutBtn").remove();
      document.querySelectorAll(".privacy-item").forEach((item) => item.remove());
    }
  }

  const user = await getDocument("users", userID);
  loadUserInfo().then(() => {
    const main = document.getElementsByTagName("main")[0];
    main.classList.add("loaded");
  });

  //Edit page elements
  const profileEditForm = document.getElementById("profileEditForm");
  const saveChangesBtn = document.getElementById("saveBtn");
  const uploadPictureForm = document.getElementById("uploadPictureForm");

  //==========
  //  Modal
  //==========
  const uploadPictureModal = document.getElementById("uploadPictureModal");
  const openSaveModalBtn = document.getElementById("openSaveModalBtn");
  const savedMessageModal = document.getElementById("savedMessageModal");

  // Get the button that opens the modal
  const uploadBtn = document.getElementById("uploadBtn");

  // Get the <span> element that closes the modal
  const closeModalBtns = document.getElementsByClassName("close");

  // When the user clicks on the button, open the modal
  if (uploadBtn) uploadBtn.onclick = () => openModal(uploadPictureModal);

  // When the user clicks on <span> (x), close the modal
  if (closeModalBtns.length > 0) {
    for (const btn of closeModalBtns) {
      btn.onclick = function () {
        let parentModal = btn.closest(".modal");
        closeModal(parentModal);
      };
    }
  }

  //================
  // File Upload
  //================

  if (uploadPictureForm)
    uploadPictureForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const file = document.getElementById("uploadField").files[0];

      let extension = file.type.split("/")[1];
      let fileName = `${getCurrentUserID()}.${extension}`;

      uploadFile(`profile/${fileName}`, file, { contentType: file.type })
        .then(() => {
          user.profilePictureURL = fileName;
          updateDocument("users", user.id, user); //update the link to the file (NOTE: Probably this will not be necessary anymore, since whenever the user picture changes, the file name will remain the same (the user id))
        })
        .then(() => {
          loadUserInfo();
          modal.style.display = "none";
          uploadPictureForm.reset();
        })
        .catch((error) => {
          console.log(error);
        });
    });

  /**
   * Fills the fields with the appropriate information about the user based on the user object that this file loads (line 28).
   * Depending on which page the user is requesting (edit or view profile), it will call specific funtions for each case
   */
  async function loadUserInfo() {
    if (user) {
      let username = document.getElementById("username");
      let profileImg = document.getElementById("profilePic");

      if (username) username.innerText = user.firstName + " " + user.lastName;
      let url = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

      if (user.profilePictureURL) {
        url = await getFile(`profile/${user.profilePictureURL}`);
      }

      profileImg.setAttribute("src", url);

      if (window.location.pathname.endsWith("edit.html")) {
        loadEditPage();
      } else {
        loadViewPage();
      }
    } else {
      redirect("/500.html");
    }
  }

  /**
   * Fills the input fields of the edit page
   */
  function loadEditPage() {
    const firstName = document.getElementById("firstName");
    const middleName = document.getElementById("middleName");
    const lastName = document.getElementById("lastName");
    const birthday = document.getElementById("birthday");
    const bio = document.getElementById("bio");
    // const languages = document.getElementById("languages");
    // const institution = document.getElementById("institution");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");
    const address = document.getElementById("address");

    firstName.value = user.firstName ? user.firstName : "";
    middleName.value = user.middleName ? user.middleName : "";
    lastName.value = user.lastName ? user.lastName : "";
    birthday.value = user.birthday ? user.birthday : "";
    bio.value = user.bio ? user.bio : "";
    phone.value = user.phone ? user.phone : "";
    email.value = user.email ? user.email : "";
    address.value = user.address ? user.address : "";

    getCurrentUserRole().then((role) => {
      if (role == "elder") {
        let emergencyName = document.getElementById("emergencyContactName");
        let emergencyPhone = document.getElementById("emergencyContactPhone");
        emergencyName.value = user.emergencyContactName ? user.emergencyContactName : "";
        emergencyPhone.value = user.emergencyContactNumber ? user.emergencyContactNumber : "";
      } else if (role == "volunteer") {
        let institution = document.getElementById("institution");
        let languages = document.getElementById("languages");
        institution.value = user.institution ? user.institution : "";
        languages.value = user.languages ? user.languages : "";
      }
    });
    const formInputs = Array.from(document.querySelectorAll("form :is(input, textarea)"));
    formInputs.forEach((input) => input.addEventListener("input", enableConfirmRedirectDialog));
  }
  /**
   * Adds static information about the user on the profile view page
   */
  function loadViewPage() {
    const birthday = document.getElementById("birthday");
    const bio = document.getElementById("bio");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");
    const address = document.getElementById("address");

    if (birthday) birthday.innerText = user.birthday ? user.birthday : "";
    if (bio) bio.innerText = user.bio ? user.bio : "";
    if (phone) phone.innerText = user.phone ? user.phone : "";
    if (email) email.innerText = user.email ? user.email : "";
    if (address) address.innerText = user.address ? user.address : "";

    getCurrentUserRole().then((role) => {
      if (role == "elder" && !referenceMode) {
        let emergencyName = document.getElementById("emergencyContactName");
        let emergencyPhone = document.getElementById("emergencyContactPhone");
        emergencyName.innerText = user.emergencyContactName ? user.emergencyContactName : "";
        emergencyPhone.innerText = user.emergencyContactNumber ? user.emergencyContactNumber : "";
      } else {
        let institution = document.getElementById("institution");
        let languages = document.getElementById("languages");
        institution.innerText = user.institution ? user.institution : "";
        languages.innerText = user.languages ? user.languages : "";

        // Display past achievement
        displayVolunteerRecords(userID);
      }
    });
  }

  /**
   * Gets the from inputs, changes the current user's object fields and update the user on the database
   */
  async function saveChanges() {
    const firstName = document.getElementById("firstName");
    const middleName = document.getElementById("middleName");
    const lastName = document.getElementById("lastName");
    const birthday = document.getElementById("birthday");
    const bio = document.getElementById("bio");
    const institution = document.getElementById("institution");
    const languages = document.getElementById("languages");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");
    const address = document.getElementById("address");
    const emergencyName = document.getElementById("emergencyContactName");
    const emergencyPhone = document.getElementById("emergencyContactPhone");

    (user.firstName = firstName.value),
      (user.middleName = middleName.value),
      (user.lastName = lastName.value),
      (user.birthday = birthday.value),
      (user.bio = bio.value),
      (user.institution = institution ? institution.value : null),
      (user.languages = languages ? languages.value : null),
      (user.phone = phone.value),
      (user.email = email.value),
      (user.address = address.value),
      (user.emergencyContactName = emergencyName ? emergencyName.value : user.emergencyContactName),
      (user.emergencyContactNumber = emergencyPhone ? emergencyPhone.value : user.emergencyContactNumber);

    updateDocument("users", getCurrentUserID(), user)
      .then((response) => {
        console.log(response, "Update successful!");
        disableConfirmRedirectDialog();
        loadUserInfo();
      })
      .catch((error) => {
        console.log(error);
      });
  }
  if (openSaveModalBtn)
    openSaveModalBtn.addEventListener("click", () => {
      openModal(confirmChangesModal);
    });
  if (saveChangesBtn)
    saveChangesBtn.addEventListener("click", () => {
      closeModal(confirmChangesModal);
      document.getElementById("realSubmitBtn").click();
    });
  if (profileEditForm)
    profileEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      saveChanges().then((response) => {
        console.log(response);
        openModal(savedMessageModal);
      });
    });
}

/**
 * Count　achievement for volunteer
 *
 * TODO: Need to clarify how to mange the achievement for volunteer
 * Option1: Aggregate achievement values from task data each time the profile screen is accessed.
 * Option2: Have a property dedicated to the USER collection and update its value each time a task is completed.
 */
async function displayVolunteerRecords(userID) {
  try {
    let currentUserId = userID;
    let filterCondition = [];
    let allTasks = [];
    let seniorsHelped = [];

    // Count the completed favors
    filterCondition = [
      {
        key: "volunteerID",
        operator: "==",
        value: currentUserId,
      },
      {
        key: "status",
        operator: "==",
        value: STATUS_COMPLETED,
      },
    ];
    allTasks = await getAllWithFilter("tasks", filterCondition);

    // Count the seniors helped
    for (let task of allTasks) {
      if (!seniorsHelped.includes(task[1].requesterID)) {
        seniorsHelped.push(task[1].requesterID);
      }
    }

    // Cound the time spend on the tasks
    // -> This is not implemented yet
    let seniors = document.getElementById("accomplishmentElder");
    let favors = document.getElementById("accomplishmentHours");
    let hours = document.getElementById("accomplishmentFavors");

    hours.innerText = allTasks.length;
    seniors.innerText = seniorsHelped.length;
    favors.innerText = allTasks.length;
  } catch (error) {
    console.log(error);
  }
}
