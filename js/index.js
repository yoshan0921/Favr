import{
    authenticateUser,
    createUserWithEmail,
    getCurrentUserID,
    getCurrentUserRole
} from "./firebase/authentication.js";
import{
    createDocument,
    getDocument,
    updateDocument
} from "./firebase/firestore.js"
import {
    redirect,
    resetLocalStorage,
    handleError,
    installServiceWorkers
} from "./utils.js";

resetLocalStorage();
installServiceWorkers();

/**
 * This adds an event listener to the page that triggers once everything is done downloading. 
 * This is to prevent the code from trying to access an element from the page before it was
 * rendered there
 * 
 */
document.addEventListener('DOMContentLoaded', function() {
    /*Getting all the important HTML elements */
    const signInForm = document.getElementById("login");
    const signUpForm = document.getElementById("signup");
    const switchSignInBtn = document.getElementById("switchSignIn");
    const switchSignUpBtn = document.getElementById("switchSignUp");
    const errorsContainer = document.getElementById("errorsContainer");

    /**
     * Adding the functionality of switching forms
     */
    switchSignInBtn.addEventListener("click",(e)=>{
        signInForm.classList.remove("hidden");
        signUpForm.classList.add("hidden");
    });
    switchSignUpBtn.addEventListener("click",(e)=>{
        signInForm.classList.add("hidden");
        signUpForm.classList.remove("hidden");
    })

    signInForm.addEventListener("submit",(e)=>signIn(e));
    signUpForm.addEventListener("submit",(e)=>signUp(e));

    /**
     * Function that perfoms basic signing in with the provided email and password
     * @param {*} e - the event that triggered this function. In this case, it's
     *                the form submission
     */
    async function signIn(e){
        e.preventDefault();
        if(!errorsContainer.classList.contains("hidden")) errorsContainer.classList.add("hidden");

        let email = document.getElementById("loginEmail").value;
        let password = document.getElementById("loginPassword").value;

        authenticateUser(email,password)
        .then(()=>{
            getCurrentUserID();
            return getCurrentUserRole();
        })
        .then((currentUserRole)=>{
            redirect("/dashboard.html");
        })
        .catch((error)=>{
            console.log(error);
            errorsContainer.classList.remove("hidden");
            errorsContainer.querySelector("#message").innerText = "Invalid email or password";
        })
    }
    
    /**
     * Function that perfoms basic account creation with email and password
     * @param {*} e - the event that triggered this function. In this case, it's
     *                the form submission
     */
    async function signUp(e){
        e.preventDefault();
        if(!errorsContainer.classList.contains("hidden")) errorsContainer.classList.add("hidden");

        let firstName = document.getElementById("signUpFirstName").value;
        let lastName = document.getElementById("signUpLastName").value;
        let age = Number(document.getElementById("signUpAge").value);
        let email = document.getElementById("signUpEmail").value;
        let password = document.getElementById("signUpPassword").value;
        let rolesOptions = document.getElementsByName("userrole");
        let userRole = rolesOptions[0].checked ? rolesOptions[0].value : rolesOptions[1].value; //checking which role the user checked

        try{
            let userCredential = await createUserWithEmail(email,password);

            const newUser = {
                id: userCredential.user.uid,
                email: email,
                role: userRole,
                firstName: firstName,
                lastName: lastName,
                age: age
            }
            updateDocument("users", newUser.id,newUser)
            .then(()=>{
                getCurrentUserID();
                getCurrentUserRole();
            })
            .then(()=>{
                redirect(`/dashboard.html`);
            })
        }catch(error){
            errorsContainer.classList.remove("hidden");
            errorsContainer.innerText = error.message;
        }
    }
});