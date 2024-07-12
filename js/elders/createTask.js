import { getCurrentUserID } from "../firebase/authentication.js";
import { createDocument, updateProperty, deleteDocument, getDocument } from "../firebase/firestore.js";
import { disableConfirmRedirectDialog, enableBackButton, enableConfirmRedirectDialog } from "../utils.js";
import { openModal, closeModal } from "../common.js";

const { Map } = await google.maps.importLibrary("maps");
const { Autocomplete } = await google.maps.importLibrary("places");
const { Marker } = await google.maps.importLibrary("marker");

// Declare global variables
let currentTaskID;
let currentFavorName;
let isEditFavor = false;
let currentStep = 1;
let currentStepDiv;

/**
 * This adds an event listener to the page that triggers once everything is done downloading.
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there
 *
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runFunction);
} else {
  runFunction();
  initMap();
}

function runFunction() {
  const favorSelectionOptions = document.getElementsByName("favorOption");
  favorSelectionOptions.forEach(option => option.addEventListener("change",enableConfirmRedirectDialog));
  currentStep = 1; // this counter keeps track of which step of the creation process the user is seeing at the moment. By default, it starts with 1
  let selectionHistory = []; // this array will contain the strings that summarizes the user's selections on each step

  currentStepDiv = document.getElementById("step-1"); // this variable will reference to the div that has the current step the user is seeing. By default it will reference the first step

  const form = document.getElementById("createTaskForm");
  const previousStepBtn = document.getElementById("previousStepBtn");
  const nextStepBtn = document.getElementById("nextStepBtn");

  // Date set to current date
  const datePickers = document.querySelectorAll("input[type=date]");
  datePickers.forEach((input) => (input.valueAsDate = new Date()));

  // Time set to current time
  const timePickers = document.querySelectorAll("input[type=time]");
  timePickers.forEach((input) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0"); // Ensure 2 digits
    const minutes = String(now.getMinutes()).padStart(2, "0"); // Ensure 2 digits
    input.value = `${hours}:${minutes}`;
  });

  // Get all radio buttons
  const radioButtons = document.querySelectorAll('input[name="favorOption"]');

  // Add event listener to radio buttons to clear error message
  radioButtons.forEach((radioButton) => {
    radioButton.addEventListener("click", () => {
      let showErrorMsg = document.getElementById("errorMsg");
      showErrorMsg.innerHTML = ""; // Clear error message on radio button click
    });
  });

  let historyLists; // Declare historyLists variable in the same scope

  previousStepBtn.disabled = true; // by default it is disabled

  nextStepBtn.addEventListener("click", () => updateStep("add"));
  previousStepBtn.addEventListener("click", () => updateStep("subtract"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // User inputs
    const task = {
      name: document.querySelector('input[name="favorOption"]:checked').value,
      notes: document.getElementById("notes").value,
      requesterID: getCurrentUserID(),
      status: "Waiting to be accepted",
      details: {
        // date: document.getElementById("favorDate").value,
        date: formatDate(document.getElementById("favorDate").value),
        time: document.getElementById("favorTime").value,
        // favorLength: document.getElementById("favorLength").value,
        startAddress: document.getElementById("startAddress").value || null,
        startAddressLat: document.getElementById("startAddressLat").value || null,
        startAddressLng: document.getElementById("startAddressLng").value || null,
        endAddress: document.getElementById("endAddress").value || "Not provided",
        startAddressLat: document.getElementById("startAddressLat").value || null,
        startAddressLng: document.getElementById("startAddressLng").value || null,
      },
    };

    // Store the value of favor name
    currentFavorName = task.name;

    // Create the task
    createTask(task);

    // This code block deletes a previous task before creating a new task
    // TODO: This needs to be refactored to be a real edit
    // Now it only creates a new document and deletes the old one
    // if (isEditFavor && currentTaskID) {
    //   try {
    //     await deleteDocument("tasks", currentTaskID);
    //     console.log("Task deleted successfully!");
    //   } catch (error) {
    //     console.error("Error deleting task:", error);
    //   }

    //   // Reset global variable
    //   isEditFavor = false;
    //   console.log(isEditFavor);
    // }
  });

  // Function to format date as MonthName Day, Year
  function formatDate(dateString) {
    const [year, month, day] = dateString.split("-");
    let monthName;
    switch (month) {
      case "01":
        monthName = "Jan";
        break;
      case "02":
        monthName = "Feb";
        break;
      case "03":
        monthName = "Mar";
        break;
      case "04":
        monthName = "Apr";
        break;
      case "05":
        monthName = "May";
        break;
      case "06":
        monthName = "Jun";
        break;
      case "07":
        monthName = "Jul";
        break;
      case "08":
        monthName = "Aug";
        break;
      case "09":
        monthName = "Sep";
        break;
      case "10":
        monthName = "Oct";
        break;
      case "11":
        monthName = "Nov";
        break;
      case "12":
        monthName = "Dec";
        break;
      default:
        monthName = ""; // Handle unexpected cases gracefully
        break;
    }
    return `${monthName} ${day}, ${year}`;
  }

  /**
   * Updates the step that is showing on the screen depending of the type of
   * request. It should be passed to the event listener of the form navigation buttons.
   * If the button that was clicked was the "previous" one, than the
   * currentStep counter should be subtracted. Likewise, if the "next" button
   * was clicked, it should be incremented.
   *
   * @param {string} operation - it should be either "add" or "subtract"
   */
  function updateStep(operation) {
    if (operation === "add") {
      let canProceed = false;
      let showErrorMsg = document.getElementById("errorMsg");
      let showErrorMsg2 = document.getElementById("errorMsg2");
      // Capture selection based on current step
      switch (currentStep) {
        case 1:
          const selectedOption = document.querySelector(
            'input[name="favorOption"]:checked'
          );
          if (selectedOption) {
            selectionHistory.push(
              `Favor Type: <span>${selectedOption.value}</span>`
            );
            canProceed = true;
          } else {
            showErrorMsg.innerHTML = "Please select an option";
          }
          break;

        case 2:
          const favorDate = document.getElementById("favorDate").value;
          const favorTime = document.getElementById("favorTime").value;
          // const favorLength = document.getElementById("favorLength").value;
          if (favorDate && favorTime) {
            // selectionHistory.push(`Date: ${favorDate}`);
            // Push formatted date to firebase
            selectionHistory.push(`Date: <span>${formatDate(favorDate)}</span>`);
            selectionHistory.push(`Time: <span>${favorTime}</span>`);
            // selectionHistory.push(`Favor Length: ${favorLength}`);
            canProceed = true;
          } else {
            // alert("Enter a date and time.");
            console.log("Enter a date and time");
          }
          break;

        case 3:
          const startAddress = document.getElementById("startAddress").value;
          const endAddress =
            document.getElementById("endAddress").value || "Not provided";

          if (startAddress) {
            selectionHistory.push(`Start Address: <span>${startAddress}</span>`);
            selectionHistory.push(`End Address: <span>${endAddress}</span>`);
            canProceed = true;
          } else {
            showErrorMsg2.innerHTML = "Please enter a start address";
          }
          break;

        case 4:
          canProceed = true; // For the final step, we allow proceeding without validation
          break;

        default:
          break; // No action needed, but good practice to include a default case
      }

      if (canProceed && currentStep < 4) {
        currentStep += 1;
        currentStepDiv.classList.add("hidden"); // hides current step
        currentStepDiv = document.getElementById(`step-${currentStep}`); // gets next step
        currentStepDiv.classList.remove("hidden"); // shows next step
        previousStepBtn.disabled = false;

        // Add active classes to the current step number
        document
          .querySelector(`.step${currentStep} .stepNumber`)
          .classList.add("stepActive");
        document
          .querySelector(`.step${currentStep} .stepText`)
          .classList.add("textActive");
        document
          .querySelector(`.stepLine${currentStep}`)
          .classList.add("stepLineActive");
        document
          .querySelector(`.step${currentStep}`)
          .classList.add("stepAnimate");

        // Replace the previous step number with a check mark
        document.querySelector(
          `.step${currentStep - 1} .stepNumber span`
        ).textContent = "✔";

        // Update selection history
        updateSelectionHistory();

        // Replace the Next Step button with Submit button in the last step
        if (currentStep == 4) {
          nextStepBtn.classList.add("hidden");
          submitBtn.classList.remove("hidden");
        }

        // if (currentStep == 4) nextStepBtn.disabled = true; // Commented out
      } else {
        // nextStepBtn.disabled = true; // Commented out
      }
    } else if (operation === "subtract") {
      if (currentStep > 1) {
        // the subtract operation should only work if the current step is not the first one

        // selectionHistory.pop(); // Remove the last entry from selectionHistory

        // // Remove the last added <li> element from each list
        // for (let list of historyLists) {
        //   list.lastElementChild.remove();
        // }

        // Remove the last added <li> element from each list

        // Remove <li> dependin on number of inputs
        if (currentStep === 3) {
          selectionHistory.pop(); // Remove date from selectionHistory
          selectionHistory.pop(); // Remove time from selectionHistory
          // selectionHistory.pop(); // Remove length from selectionHistory
          for (let list of historyLists) {
            list.removeChild(list.lastElementChild);
            list.removeChild(list.lastElementChild);
            // list.removeChild(list.lastElementChild);
          }
        } else if (currentStep === 4) {
          selectionHistory.pop(); // Remove startAddress from selectionHistory
          selectionHistory.pop(); // Remove endAddress selectionHistory
          for (let list of historyLists) {
            list.removeChild(list.lastElementChild);
            list.removeChild(list.lastElementChild);
          }
        } else {
          selectionHistory.pop(); // Remove the last input from selectionHistory
          for (let list of historyLists) {
            list.removeChild(list.lastElementChild);
          }
        }

        // Remove active classes from the current step number
        document
          .querySelector(`.step${currentStep} .stepNumber`)
          .classList.remove("stepActive");
        document
          .querySelector(`.step${currentStep} .stepText`)
          .classList.remove("textActive");
        document
          .querySelector(`.stepLine${currentStep}`)
          .classList.remove("stepLineActive");
        document
          .querySelector(`.step${currentStep}`)
          .classList.remove("stepAnimate");

        // Restore the original step number
        document.querySelector(
          `.step${currentStep - 1} .stepNumber span`
        ).textContent = `${currentStep - 1}`;

        currentStep -= 1;
        currentStepDiv.classList.add("hidden"); // hides current step
        currentStepDiv = document.getElementById(`step-${currentStep}`); // gets previous step
        currentStepDiv.classList.remove("hidden"); // shows previous step

        // nextStepBtn.disabled = false; // Commented out

        if (currentStep === 1) {
          previousStepBtn.disabled = true;
        }

        // Add active class to the current step number
        document
          .querySelector(`.step${currentStep} .stepNumber`)
          .classList.add("stepActive");
        document
          .querySelector(`.step${currentStep} .stepText`)
          .classList.add("textActive");

        // Replace the Submit button with Next Step button when going back to previous steps
        if (currentStep < 4) {
          nextStepBtn.classList.remove("hidden");
          submitBtn.classList.add("hidden");
        }
      }
    }
  }

  /**
   * A function that receives an object that represents a task.
   *
   * The object is expected to have these properties (refer to firestore.js)
   * It's ok if any of these properties are missing, but make sure that the
   * names of the properties you will use are the same as below:
   *
   *  - name = Name of the task (ex.: Grocery shopping, Tech Help, etc);
   *  - status = Status of the task (processing, cancelled, approval required, waiting to be accepted, etc);
   *  - requesterID = unique id of the elder user that requested the task
   *  - volunteerID = unique id of the volunteer that accepted the task (obs.: should be null by default when the task is created);
   *  - note = the optional note that the requester can write for each task
   *  - details = a JSON (object) that contains the details to each task. This object doesn't have a strict set of properties because
   *  they vary depending on the task type (ex.: if the task is grocery shopping, then this object should contain one property "startAddress" and one property "endAddress". If it is a Tech Help task, then it should contain one address only, namely, the startAddress)
   *
   * @param {Object} task - object that represents the task that will be created on the database
   */
  // function createTask(task) {
  //   createDocument("tasks", task)
  //     .then((docRef) => {

  //       // Save document reference ID to global variable
  //       currentTaskID = docRef.id;

  //       displayTaskSummary(task);
  //     })
  //     .catch((error) => {
  //       console.log(error);
  //     });
  // }

  function createTask(task) {
    // If the task is existing, use updateProperty to overwrite details of the current task
    if (isEditFavor && currentTaskID) {
      updateProperty("tasks", currentTaskID, task)
        .then(() => {
          console.log("Task updated successfully!");
          displayTaskSummary(task);
          isEditFavor = false; // Reset the edit flag
        })
        .catch((error) => {
          console.log("Error updating task:", error);
        });

      // If task does not exist and being created for the first time, use createDocument
    } else {
      createDocument("tasks", task)
        .then((docRef) => {
          // Save document reference ID to global variable
          currentTaskID = docRef.id;
          displayTaskSummary(task);
        disableConfirmRedirectDialog();
        })
        .catch((error) => {
          console.log(error);
        });
    }
  }

  /**
   * Processes the selectionHistory array and populate the history lists on each step with the selections the user has made so far
   */
  function updateSelectionHistory() {
    for (let list of historyLists) {
      list.innerHTML = ""; // Clear existing items
      for (let item of selectionHistory) {
        // create a <li> element, add the item of the selection history to it, then append the <li> to the list (which is a <ul>)
        let li = document.createElement("li");
  
        // Use innerHTML if the item contains HTML tags
        if (item.includes('<span>')) {
          li.innerHTML = item;
        } else {
          li.textContent = item;
        }
        list.appendChild(li);
      }
    }
  }

  historyLists = document.getElementsByClassName("selection-list"); // this will return an array containing all the elements of the HTML that has "selection-list" as a class. They all should be <ul>

  // Display the user inputs in a summary page
  function displayTaskSummary(task) {
    // Hide form and navigation buttons
    const form = document.getElementById("createTaskForm");
    form.classList.add("hidden");
    const formNavigation = document.querySelector(".form-navigation");
    formNavigation.classList.add("hidden");

    // Hide step wizard
    const hideStepsCounter = document.querySelector(".steps-counter");
    hideStepsCounter.classList.add("hidden");

    // Show the task summary
    const summaryDiv = document.getElementById("summaryDiv");
    summaryDiv.classList.remove("hidden"); // Remove the "hidden" class to display the summary

    const statusList = document.getElementById("statusList");
    statusList.innerHTML = `
      <div class="status"><span class="statusColor"></span>${task.status}</div>
      <div>You'll be notified once it's accepted.</div>
    `;

    const summaryList = document.getElementById("summaryList");
    summaryList.innerHTML = `
      <li><div><i class="favor-icon"></i>Favor Type:</div><div><span>${task.name}</span></div></li>
      <li><div><i class="date-icon"></i>Date:</div><div><span>${task.details.date}</span></div></li>
      <li><div><i class="time-icon"></i>Time:</div><div><span>${task.details.time}</span></div></li>
      <li><div><i class="address-icon"></i>Start Address:</div><div><span>${task.details.startAddress}</span></div></li>
      <li><div><i class="address-icon"></i>End Address:</div><div><span>${task.details.endAddress}</span></div></li>
      <li><div><i class="note-icon"></i>Note:</div><div><span>${task.notes}</span></div></li>
    `;
    // Replace step4 number with check after submit
    document.querySelector(`.step4 .stepNumber span`).textContent = "✔";
  }

  // Event listener for editFavor (opens popup)
  // TODO: This needs to be refactored to be a real edit
  // Now it only creates a new document and deletes the old one
  const editFavor = document.getElementById("editFavor");
  editFavor.addEventListener("click", () => {
    const editModal = document.getElementById("editModal");
    openModal(editModal); // Call openModal with modal element
    const modalEditFavorName = document.getElementById("modalEditFavorName");
    const modalEditFavorSpan = modalEditFavorName.querySelector("span");
    modalEditFavorSpan.innerText = currentFavorName;
  });

  // Event listener for modal back button
  const modalEditBack = document.getElementById("modalEditBack");
  modalEditBack.addEventListener("click", () => {
    const editModal = document.getElementById("editModal");
    closeModal(editModal);
  });

  // Event listener for editModal
  // TODO: This needs to be refactored to be a real edit
  // Now it only creates a new document and deletes the old one
  const modalEditFavor = document.getElementById("modalEditFavor");
  modalEditFavor.addEventListener("click", () => {
    // Close modal
    const editModal = document.getElementById("editModal");
    closeModal(editModal);

    // Set global variable to true
    isEditFavor = true;

    // Simulate clicking previousStepBtn 3x to start from step 1
    for (let i = 0; i < 3; i++) {
      updateStep("subtract");
    }

    // Hide the task summary
    const summaryDiv = document.getElementById("summaryDiv");
    summaryDiv.classList.add("hidden");

    // Show form and navigation buttons
    const form = document.getElementById("createTaskForm");
    form.classList.remove("hidden");
    const formNavigation = document.querySelector(".form-navigation");
    formNavigation.classList.remove("hidden");

    // Show step wizard
    const hideStepsCounter = document.querySelector(".steps-counter");
    hideStepsCounter.classList.remove("hidden");
  });
}

/**
 * Initializes the Google Maps and Places Autocomplete libraries.
 * Sets up two maps and autocomplete inputs for start and end addresses.
 */
async function initMap() {
  /**
   * Sets up the autocomplete functionality for a given input field and map.
   * @param {string} inputId - The ID of the input element for address autocomplete.
   * @param {string} mapId - The ID of the map element where the address will be displayed.
   */
  function setupAutocomplete(inputId, mapId) {
    let map = new Map(document.getElementById(mapId), {
      zoom: 6,
      center: { lat: 53.7267, lng: -127.6476 }, // Center on British Columbia
      mapId: "DEMO_MAP_ID",
    });

    let addressInput = new Autocomplete(document.getElementById(inputId), {
      componentRestrictions: { country: "ca" },
    });

    let marker = new Marker({
      map: map,
    });

    addressInput.addListener("place_changed", () => {
      try {
        // Get the formatted address from google maps API
        const place = addressInput.getPlace();
        if (!place.geometry) {
          document.getElementById(inputId).placeholder = "Enter a place";
          return;
        }

        // Set the formatted address to the input field of address
        document.getElementById(inputId).value = place.formatted_address;
        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
        }

        // Set the marker on the map
        marker.setPosition(place.geometry.location);

        // Set the coordinates data to hidden input fields
        document.getElementById(`${inputId}Lat`).value = place.geometry.location.lat();
        document.getElementById(`${inputId}Lng`).value = place.geometry.location.lng();

        // Show the map div when a place is selected in the dropdown
        document.getElementById(mapId).classList.remove("mapHidden");

        // Clear error message
        document.getElementById("errorMsg2").innerHTML = "";
      } catch (error) {
        console.log(error);
      }
    });
  }
  setupAutocomplete("startAddress", "startMap");
  setupAutocomplete("endAddress", "endMap");
}

/**
 * Speech to Text for address fields
 */
const startAddress = document.getElementById("startAddress");
const endAddress = document.getElementById("endAddress");
const micForStartAddress = document.getElementById("micForStartAddress");
const micForEndAddress = document.getElementById("micForEndAddress");

if (micForStartAddress) {
  micForStartAddress.addEventListener("click", () => {
    console.log("click");
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    startAddress.value = "";

    recognition.onresult = ({ results }) => {
      startAddress.value = results[0][0].transcript;
      startAddress.focus();
    };
    recognition.start();
  });
}

if (micForEndAddress) {
  micForEndAddress.addEventListener("click", () => {
    console.log("click");
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    endAddress.value = "";

    recognition.onresult = ({ results }) => {
      endAddress.value = results[0][0].transcript;
      endAddress.focus();
    };
    recognition.start();
  });
}

// Event listener for cancelFavor button
const cancelFavorBtn = document.getElementById("cancelFavor");
cancelFavorBtn.addEventListener("click", () => {
  const modal = document.getElementById("confirmModal");
  openModal(modal); // Call openModal with modal element
  const modalFavor = document.getElementById("modalFavor");
  const modalFavorSpan = modalFavor.querySelector("span");
  modalFavorSpan.innerText = currentFavorName;
});

// Event listener for modal back button
const modalBackBtn = document.getElementById("modalBackBtn");
if(modalBackBtn){
  modalBackBtn.addEventListener("click", () => {
    const modal = document.getElementById("confirmModal");
    closeModal(modal);
  });
}


// Event listener to go back to home
const backToHome = document.getElementById("backToHome");
backToHome.addEventListener("click", () => {
  window.location.href = "../dashboard.html";
});

// Event listener to go back to home from modal
const backToHomeModal = document.getElementById("backToHomeModal");
backToHomeModal.addEventListener("click", () => {
  window.location.href = "../dashboard.html";
});

// Update task status to cancelled
const modalCancelFavorBtn = document.getElementById("modalCancelFavor");
modalCancelFavorBtn.addEventListener("click", async () => {
  try {
    // Get the current date and time, formatted with international format
    const now = new Date();
    const cancelledDate = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(now);
    const cancelledTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Update task status to "Cancelled" in Firestore
    await updateProperty("tasks", currentTaskID, {
      status: "Cancelled",
      "details.cancelledDate": cancelledDate,
      "details.cancelledTime": cancelledTime,
    });

    // Display the success modal
    // const successModal = document.getElementById("successModal");
    // openModal(successModal);

    // Display favor cancel page
    window.location.href = "../tasks/cancel.html?taskid=" + currentTaskID;

    // Close the modal after updating task status
    const modal = document.getElementById("confirmModal");
    closeModal(modal);
  } catch (error) {
    console.log(error);
  }
});
