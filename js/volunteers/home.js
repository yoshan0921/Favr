import {
    checkUserAuthorization
} from "../firebase/authentication.js";
import {
    signOut
} from "../utils.js";
import{
    getAll,
    deleteDocument,
    updateDocument,
    createDocument
} from "../firebase/firestore.js";

checkUserAuthorization();

/**
 * This adds an event listener to the page that triggers once everything is done downloading. 
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there
 * 
 */
document.addEventListener("DOMContentLoaded",()=>{
    const logoutBtn = document.getElementById("logoutBtn");
    const table = document.getElementsByTagName("tbody")[0];
    const taskForm = document.getElementById("taskForm");
    const formOperation = document.getElementById("operationType")
    const formHeader = document.querySelector("#taskForm h2");
    const formButton = document.querySelector("#taskForm button[type=submit]");
    const cancelEditingButton = document.getElementById("cancelBtn");

    //default styling
    cancelEditingButton.style.display = "none";

    cancelEditingButton.addEventListener("click", resetForm);
    logoutBtn.addEventListener("click",signOut);

    //Stores the id of the task selected to be edited
    let selectedTaskID = null;

    populateTable();

    /**
     * Resets the Task form to the default state (Add Task)
     */
    function resetForm(){
        cancelEditingButton.style.display = "none";
        formOperation.value = "add";
        formHeader.innerText = "Add Task";
        formButton.innerText = "Add";
        taskForm.reset();
    }
    /**
     * Fetches data from the "Tasks" collection of Firestoer Database
     * and displays on a table
     */
    async function populateTable(){
        try{
            let allTasks = await getAll("tasks");

            table.innerHTML = "";

            for(let task of allTasks){
                let id = task[0];
                let taskDetails = task[1];

                let row = table.insertRow();
                let cell = row.insertCell();

                cell.innerText = id;
                cell.id = `task_id_${id}`; //adding unique identifiers for each cell with the id of the task

                cell = row.insertCell();
                cell.id = `task_name_${id}`;
                cell.innerText = taskDetails.name;

                cell = row.insertCell();
                cell.id = `task_status_${id}`;
                cell.innerText = taskDetails.status;

                cell = row.insertCell();
                cell.id = `task_requesterid_${id}`;
                cell.innerText = taskDetails.requester;

                cell = row.insertCell();
                cell.innerHTML = `
                <button id="deleteTask_${id}" class="btn btn-outline-danger deleteButton" type"button">Delete</button>
                <button id="editTask_${id}" class="btn btn-outline-secondary editButton" type"button">Edit</button>
                `;
            }

            let deleteButtons = Array.from(document.getElementsByClassName("deleteButton"));

            deleteButtons.forEach((button)=>{
                button.addEventListener("click", async (e)=>{
                    let taskID = button.id.split("_")[1];
                    
                    try{
                        //TODO: call delete function with the task ID and then populate table again
                        await deleteDocument("tasks",taskID);
                        populateTable();
                    }catch(error){
                        console.log(error);
                    }
                })
            })
            let editButtons = Array.from(document.getElementsByClassName("editButton"));

            editButtons.forEach((button)=>{
                button.addEventListener("click", ()=>{
                    //when the edit button is clicked, the form will switch to be a edition form instead of a creation form

                    formOperation.value = "edit"; //this formOperation will determine which action will be performed when the form is submitted
                    cancelEditingButton.style.display = "block"; //show cancel button
                    
                    let taskID = button.id.split("_")[1];
                    selectedTaskID = taskID;
                    
                    let taskNameToBeUpdated = document.getElementById(`task_name_${taskID}`).innerText;
                    let taskNameFormField = document.getElementById("taskName");
                    taskNameFormField.value = taskNameToBeUpdated; 

                    let taskRequesterToBeUpdated = document.getElementById(`task_requesterid_${taskID}`).innerText;
                    let taskRequesterFormField = document.getElementById("requester");
                    taskRequesterFormField.value = taskRequesterToBeUpdated;

                    formHeader.innerText = "Edit Task";
                    formButton.innerText = "Update";
                })
            })
        }catch(error){
            console.log(error);
            alert(error);
        }
    }
    taskForm.addEventListener("submit",async (e)=>{
        e.preventDefault();
        if(formOperation.value == "add"){
            let newTask = {
                name: document.getElementById("taskName").value, //from the form
                status: "In progress", //by default
                requester: document.getElementById("requester").value //from the form
                //note: no need to pass an ID for the task, because firebase will generate an ID for it automatically if we don't provide one
            }
            try{
                createTask();
                populateTable()
            }catch(error){
                console.log(error);
            }

        }else{
            let updatedTask = {
                name: document.getElementById("taskName").value, //from the form
                status: document.getElementById(`task_status_${selectedTaskID}`).innerText, //from the table
                requester: document.getElementById("requester").value //from the form
            }
            
            try{
                updateTask(selectedTaskID,updateTask);
                populateTable();
            }catch(error){
                console.log(error);
            }
        }

    })
        /**
     * Deletes a task based on the id of the task
     * @param {Object} the object that represents the task 
     */
    async function createTask(obj){
        try{
            //use a function from firebase.js to update a document
        }catch(error){
            console.log(error);
        }
    }
    /**
     * Deletes a task based on the id of the task
     * @param {string} id 
     */
    async function deleteTask(id){
        try{
            //use a function from firebase.js to delete a document
            
        }catch(error){
            console.log(error);
        }
    }
    /**
     * Updates a task based on the id of the task
     * @param {string} id - Task ID
     * @param {Object} obj - object that represents the updated task
     */
    async function updateTask(id,obj){
        try{
            //use a function from firebase.js to update a document
        }catch(error){
            console.log(error);
        }
    }
})