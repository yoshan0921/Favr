import{
    authenticateUser,
    createUserWithEmail
} from "./firebase/authentication.js";
import{
    createDocument,
    getDocument
} from "./firebase/firestore.js"
import {
    redirect
} from "./utils.js";

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

        let email = document.getElementById("loginEmail").value;
        let password = document.getElementById("loginPassword").value;

        try{
            let userCredential = await authenticateUser(email,password);
        
            getDocument("users",userCredential.user.uid)
            .then((userDataFromDatabase)=> {
                if(userDataFromDatabase){
                    redirect(`/${userDataFromDatabase.role}/home.html`)
                }else{
                    throw new Error("User has no registered role");
                }
            });   
        }catch(error){
            console.log(error.message);
        }
    }
    
    /**
     * Function that perfoms basic account creation with email and password
     * @param {*} e - the event that triggered this function. In this case, it's
     *                the form submission
     */
    async function signUp(e){
        e.preventDefault();

        let email = document.getElementById("signUpEmail").value;
        let password = document.getElementById("signUpPassword").value;
        let rolesOptions = document.getElementsByName("userrole");
        let userRole = rolesOptions[0].checked ? rolesOptions[0].value : rolesOptions[1].value; //checking which role the user checked

        try{
            let userCredential = await createUserWithEmail(email,password);

            const newUser = {
                id: userCredential.user.uid,
                email: email,
                role: userRole
            }
            createDocument("users", newUser).then(()=>redirect(`/${userRole}/home.html`) )
            /*
            getDocument("users",userDocumentID)
            .then((userDataFromDatabase)=> {
                if(userDataFromDatabase){
                    redirect(`/${userDataFromDatabase.role}/home.html`) //redirecting depending on the role of the user
                }else{
                    throw new Error("Unable to find user");
                }
            }); 
            */       
        }catch(error){
            console.log(error);
        }
    }
});