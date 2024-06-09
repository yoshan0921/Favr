import{
  getCurrentUserID
} from "./firebase/authentication.js";
import { getDocument, uploadFile, getFile, updateDocument } from "./firebase/firestore.js";
import { redirect } from "./utils.js";

window.addEventListener("load", async (event) => {
  const user = await getDocument("users",getCurrentUserID());
  loadUserInfo();
  const uploadPictureForm = document.getElementById("uploadPictureForm");

  //==========
  //  Modal
  //==========
  // Get the modal
  var modal = document.getElementById("uploadPictureModal");
  
  // Get the button that opens the modal
  var uploadBtn = document.getElementById("uploadBtn");
  
  // Get the <span> element that closes the modal
  var closeModalBtn = document.getElementsByClassName("close")[0];
  
  // When the user clicks on the button, open the modal
  if(uploadBtn) uploadBtn.onclick = function() {modal.style.display = "block";}
  
  // When the user clicks on <span> (x), close the modal
  if(closeModalBtn) closeModalBtn.onclick = function() {modal.style.display = "none";}
  
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }
  
  //================
  // File Upload
  //================
  uploadPictureForm.addEventListener("submit",async (e)=>{

    e.preventDefault();

    const file = document.getElementById("uploadField").files[0];

    let extension = file.type.split("/")[1];
    let fileName = `${getCurrentUserID()}.${extension}`

    uploadFile(`profile/${fileName}`, file, {contentType: file.type})
    .then(()=>{
      user.profilePictureURL = fileName;
      updateDocument("users", user.id, user); //update the link to the file (NOTE: Probably this will not be necessary anymore, since whenever the user picture changes, the file name will remain the same (the user id))
    })
    .then(()=>{
      loadUserInfo();
      modal.style.display = "none";
      uploadPictureForm.reset();
    })
    .catch((error)=>{
      console.log(error);
    });
  })
  
  /**
   * Fills the fields with the appropriate information about the user
   */
  async function loadUserInfo(){
    if(user){
      let username = document.getElementById("username");
      let profileImg = document.getElementById("profilePic");  
      username.innerText = user.firstName +" " +user.lastName;
      let picture = await getFile(`profile/${user.profilePictureURL}`);
      if(!picture) picture = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"; //default user img
      profileImg.setAttribute("src",picture);

      //TODO: fill the rest of the page with the remaining info of the user

    }else{
      console.log("no user info!");
      redirect("/500.html");
    }
  }
})