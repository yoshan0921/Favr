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

  let currentStep = 1; //this counter keeps track of which step of the creation process the user is seeing at the moment. By default, it starts with 1
  let selectionHistory = []; // this array will contain the strings that summarizes the user's selections on each step

  let currentStepDiv = document.getElementById("step-1"); //this variable will reference to the div that has the current step the user is seeing. By default it will reference the first step

  const form = document.getElementById("createTaskForm");
  const previousStepBtn = document.getElementById("previousStepBtn");
  const nextStepBtn = document.getElementById("nextStepBtn");
  const datePickers = document.querySelectorAll("input[type=date]");
  datePickers.forEach((input)=> input.valueAsDate = new Date());
  let historyLists; // Declare historyLists variable in the same scope

  previousStepBtn.disabled = true; //by default it is disabled

  nextStepBtn.addEventListener("click", ()=>updateStep("add"));
  previousStepBtn.addEventListener("click", ()=>updateStep("subtract"))

  form.addEventListener("submit",(e)=>{
    e.preventDefault();

    /* User inputs */
    const task = {
      name: document.querySelector('input[name="favorOption"]:checked').value,
      notes: document.getElementById("notes").value,
      requesterID: getCurrentUserID(),
      status: "Waiting to be accepted",
      details: {
        date: document.getElementById("favorDate").value,
        address: document.getElementById("address").value,
      }
    };
    createTask(task);
    console.log(task);
  });

  /**
   * Updates the step that is showing on the screen depending of the type of
   * request. It should be passed to the event listener of the form navigation buttons.
   * If the button that was clicked was the "previous" one, than the
   * currentStep counter should be subtracted. Likewise, if the "next" button 
   * was clicked, it should be incremented. The funct
   * 
   * @param {string} operation - it should be either "add" or "subtract"
   */
  function updateStep(operation){
    if(operation == "add"){

      if(currentStep < 4){ //the add operation should only work if the current step is not the last one

        // Capture selection based on current step
        switch(currentStep){
          case 1:
            const selectedOption = document.querySelector('input[name="favorOption"]:checked');
            if (selectedOption) {
              selectionHistory.push(`Favor Option: ${selectedOption.value}`);
            }
            break;
          case 2:
            const favorDate = document.getElementById("favorDate").value;
            if (favorDate) {
              selectionHistory.push(`Favor Date: ${favorDate}`);
            }
            break;
          case 3:
            const address = document.getElementById("address").value;
            if (address) {
              selectionHistory.push(`Address: ${address}`);
            }
            break;
          case 4:
            const status = taskDetails.status;
            if (status) {
              selectionHistory.push(`Status: ${status}`);
            }
            break;
        
          }

        // Remove stepActive class from the current step number
        document.querySelector(`.step${currentStep} .stepNumber`).classList.remove("stepActive");
        document.querySelector(`.step${currentStep} .stepText`).classList.remove("textActive");
              
        currentStep += 1;
        currentStepDiv.classList.add("hidden"); //hides current step
        currentStepDiv = document.getElementById(`step-${currentStep}`); //gets next step
        currentStepDiv.classList.remove("hidden"); //shows next step
        previousStepBtn.disabled = false;

        // Add stepActive and textActive classes to the current step number
        document.querySelector(`.step${currentStep} .stepNumber`).classList.add("stepActive");
        document.querySelector(`.step${currentStep} .stepText`).classList.add("textActive");

  //TODO: if the user clicked on next, then we should get the data on the inputs they just filled, turn them into a readable string and add to selectionHistory array. After doing that, updateSelectionHistory should be called to display this array as a list
        updateSelectionHistory();
        if(currentStep==4) nextStepBtn.disabled = true;

      }else{
        nextStepBtn.disabled = true;
      }

    }else{

      if(currentStep > 1){ //the subtract operation should only work if the current step is not the first one

        const removedItem = selectionHistory.pop();

        // Remove the last added <li> element from each list
        for (let list of historyLists) {
          list.lastElementChild.remove();
        }

        // Remove stepActive class from the current step number
        document.querySelector(`.step${currentStep} .stepNumber`).classList.remove("stepActive");
        document.querySelector(`.step${currentStep} .stepText`).classList.remove("textActive");

        currentStep -= 1;
        currentStepDiv.classList.add("hidden"); //hides current step
        currentStepDiv = document.getElementById(`step-${currentStep}`); //gets previous step
        currentStepDiv.classList.remove("hidden"); //shows previous step
        nextStepBtn.disabled = false;

        if(currentStep==1){
          previousStepBtn.disabled = true;
        } 

        // Add stepActive class to the current step number
        document.querySelector(`.step${currentStep} .stepNumber`).classList.add("stepActive");
        document.querySelector(`.step${currentStep} .stepText`).classList.add("textActive");

      }else{
        previousStepBtn.disabled = true;
      }
    }
  }

/**
 * A function that receives an object that representes a task.
 * 
 * The object is expected to have these properties (refer to firestore.js)
 * It's ok if any of these properties are missing, but make sure that the 
 * names of the properties you will use are the same as below:
 * 
 *  - name = Name of the task (ex.: Grocery shopping, Tech Help, etc);
 *  - status = Status of the task (processing, cancelled, approval required, waiting to be accepted, etc);
 *  - requesterID = unique id of the elder user that requested the task
 *  - volunteerID = unique id of the volunteer that accepted the task (obs.: should be null by default when the task is created );
 *  - note = the optional note that the requester can write for each task
 *  - details = a JSON (object) that contains the details to each task. This object doesn't have a strict set of properties because
 *  they vary depending on the taskt type (ex.: if the task is grocery shopping, then this object should contain one property "startAddress" and one property "endAddress". If it is a Tech Help task, then it should contain one address only, namely, the startAddress)
 * 
 * @param {Object} task - object that represents the task that will be created on the database
 */
  function createTask(task){
    createDocument("tasks",task)
      .then(() => {
        displayTaskSummary(task);
        // window.location.href = "/dashboard.html";
      })
    .catch((error) => {
      console.log(error);
    });
  }
  // function createTask(task){
  //     try{
  //       createDocument("tasks",task);
  //     }catch(error){
  //       console.log(error);
  //     }
  // }
  /**
   * Processes the selectionHistory array and populate the history lists on each step with the selections the user has made so far
   */
  function updateSelectionHistory(){
    for(let list of historyLists){
      list.innerHTML = ''; // Clear existing items
      for(let item of selectionHistory){
        //TODO: create a <li> element, add the item of the selection history to it, then append the <li> to the list (which is a <ul>)
        let li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      }
    }
  }
  historyLists = document.getElementsByClassName("selection-list"); //this will return an array containing all the elements of the HTML that has "selection-list" as a class. They all should be <ul>

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
      <li>Favor Type: ${task.name}</li>
      <li>Date: ${task.details.date}</li>
      <li>Address: ${task.details.address}</li>
      <li>Notes: ${task.notes}</li>
    `;
  }

  backToHome.addEventListener("click", (e) => {
    window.location.href = "/dashboard.html";
  });
}