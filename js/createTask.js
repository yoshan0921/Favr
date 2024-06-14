import { getCurrentUserID } from "./firebase/authentication.js";
import { createDocument } from "./firebase/firestore.js";

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
}

function runFunction() {
  let currentStep = 1; // this counter keeps track of which step of the creation process the user is seeing at the moment. By default, it starts with 1
  let selectionHistory = []; // this array will contain the strings that summarizes the user's selections on each step

  let currentStepDiv = document.getElementById("step-1"); // this variable will reference to the div that has the current step the user is seeing. By default it will reference the first step

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

  let historyLists; // Declare historyLists variable in the same scope

  previousStepBtn.disabled = true; // by default it is disabled

  nextStepBtn.addEventListener("click", () => updateStep("add"));
  previousStepBtn.addEventListener("click", () => updateStep("subtract"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // User inputs
    const task = {
      name: document.querySelector('input[name="favorOption"]:checked').value,
      notes: document.getElementById("notes").value,
      requesterID: getCurrentUserID(),
      status: "Waiting to be accepted",
      details: {
        date: document.getElementById("favorDate").value,
        time: document.getElementById("favorTime").value,
        startAddress: document.getElementById("startAddress").value,
        endAddress: document.getElementById("endAddress").value || "None",
      },
    };
    createTask(task);
    console.log(task);
  });

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
      // Capture selection based on current step
      switch (currentStep) {
        case 1:
          const selectedOption = document.querySelector(
            'input[name="favorOption"]:checked'
          );
          if (selectedOption) {
            selectionHistory.push(
              `Favor Type Selected: ${selectedOption.value}`
            );
            canProceed = true;
          } else {
            alert("Select an option.");
          }
          break;

        case 2:
          const favorDate = document.getElementById("favorDate").value;
          const favorTime = document.getElementById("favorTime").value;
          if (favorDate && favorTime) {
            selectionHistory.push(`Date: ${favorDate}`);
            selectionHistory.push(`Time: ${favorTime}`);
            canProceed = true;
          } else {
            alert("Enter a date and time.");
          }
          break;

        case 3:
          const startAddress = document.getElementById("startAddress").value;
          const endAddress =
            document.getElementById("endAddress").value || "None";
          if (startAddress) {
            selectionHistory.push(`Start Address: ${startAddress}`);
            selectionHistory.push(`End Address: ${endAddress}`);
            canProceed = true;
          } else {
            alert("Enter an address.");
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

        // Remove 2 last <li> for steps 2 and 3 that has 2 inputs
        if (currentStep === 3 || currentStep === 4) {
          selectionHistory.pop(); // Remove input 1 from selectionHistory
          selectionHistory.pop(); // Remove input 2 from selectionHistory
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
  function createTask(task) {
    createDocument("tasks", task)
      .then(() => {
        displayTaskSummary(task);
        // window.location.href = "/dashboard.html";
      })
      .catch((error) => {
        console.log(error);
      });
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
        li.textContent = item;
        list.appendChild(li);
      }
    }
  }

  historyLists = document.getElementsByClassName("selection-list"); // this will return an array containing all the elements of the HTML that has "selection-list" as a class. They all should be <ul>

  // Display the user inputs in a summary page
  function displayTaskSummary(task) {
    // Hide form and navigation buttons
    const form = document.getElementById("createTaskForm");
    form.style.display = "none";
    const formNavigation = document.querySelector(".form-navigation");
    formNavigation.style.display = "none";

    // Show the task summary
    const summaryDiv = document.getElementById("summaryDiv");
    summaryDiv.classList.remove("hidden"); // Remove the "hidden" class to display the summary

    const statusList = document.getElementById("statusList");
    statusList.innerHTML = `
      <div>Status: ${task.status}</div>
      <div>You'll be notified once it's accepted.</div>
    `;

    const summaryList = document.getElementById("summaryList");
    summaryList.innerHTML = `
      <li>Favor Type Selected: ${task.name}</li>
      <li>Date: ${task.details.date}</li>
      <li>Time: ${task.details.time}</li>
      <li>Start Address: ${task.details.startAddress}</li>
      <li>End Address ${task.details.endAddress}</li>
      <li>Notes: ${task.notes}</li>
    `;
    // Replace step4 number with check after submit
    document.querySelector(`.step4 .stepNumber span`).textContent = "✔";
  }

  backToHome.addEventListener("click", (e) => {
    window.location.href = "/dashboard.html";
  });
}
