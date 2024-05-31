import { firestore } from "./firebase.js";
import {
    getDocs,
    doc,
    addDoc,
    setDoc,
    getDoc,
    deleteDoc,
    collection
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";

/**
 * Class that represents an user (still not used)
 */
class User{
    constructor(obj){
        this.id = obj.id;
        this.name = obj.name;
        this.email = obj.email;
        this.role = obj.role;
        this.age = obj.age;
        this.volunteerHours = obj.volunteerHours;
    }
}

/***=========== Firestore data converters ===========***/
// Reference: https://firebase.google.com/docs/reference/js/v8/firebase.firestore.FirestoreDataConverter
// Still not used, but might be useful in the future
const userConverter = {
    toFirestore: (user) => {
        return {
            id: user.id,
            name: user.name ? user.name : null,
            email: user.email ? user.email : null,
            role: user.role ? user.role : null,
            age:user.age ? user.age : null,
            volunteerHours: user.volunteerHours ? user.volunteerHours : 0
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new User({
            id:data.id,
            name:data.name,
            email:data.email,
            role:data.role,
            age:data.age,
            volunteerHours: data.volunteerHours
        });
    },
};
const taskConverter = {
    toFirestore: (obj) => {
        return {
            id: obj.id,
            name: obj.name ? obj.name : null,
            status: task.status ? task.status : null,
            requesterID: task.requesterID ? task.requesterID : null
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new Task({
            id: data.id,
            name: data.name,
            status: data.status,
            requesterID: data.requesterID
        });
    },
};

/**
 * Selects which converter to use depending on the collection in which they will be used
 * @param {string} collection 
 * @returns reference to a converter
 */
function selectDataConverter(collection){
    switch(collection){
        case "users":
            return userConverter;
        default:
            return taskConverter;
    }
}
/**
 * Creates a document on the provided collection
 * @param {String} collectionPath 
 * @param {Object} object 
 * 
 * @return Promise
 */
async function createDocument(collectionPath,object){
    try {
        // Add a new document with a generated id.
        return addDoc(collection(firestore, collectionPath), object);
    } catch (error) {
        throw(error);
    }
}

/**
 * Updates a document from the provided collection based on the document ID
 * @param {string} collectionPath 
 * @param {string} id 
 * @param {Object} object - object that represents the updated document 
 * 
 * * @return Promise
 */
async function updateDocument(collectionPath, id, object){
    try {
        const documentReference = doc(firestore, collectionPath, id);
        return setDoc(documentReference, object);
    } catch (error) {
        throw(error);
    }
}
/**
 * Deletes a document from the provided collection based on the document ID
 * @param {string} collectionPath 
 * @param {string} id 
 * 
 * @returns Promise
 */
async function deleteDocument(collectionPath, id){
    const documentReference = doc(firestore, `${collectionPath}/${id}`);
    try {
        return deleteDoc(documentReference);
    } catch (error) {
        throw(error);
    }
}
/**
 * Get an indiviual document from the provided collection based on the document ID
 * @param {string} collectionPath 
 * @param {string} id 
 * @returns Object containing the document data
 */
async function getDocument(collectionPath,id){
    const documentReference = doc(firestore, `${collectionPath}/${id}`);
    try {
        const docSnap = await getDoc(documentReference);
        if (docSnap.exists()) {
            console.log("Document data:", docSnap.data());
            return docSnap.data();
        } else {
            console.log("No such document!");
        }
    } catch (error) {
        console.log(error);
        return null
    }
}

/**
 * Get all the documents of a given collection
 * @param {string} collectionPath 
 * @returns An array containing objects that represent each document
 */
async function getAll(collectionPath){
    try{
        let reference = collection(firestore, collectionPath);

        let result = [];
        const querySnapshot = await getDocs(reference);
        querySnapshot.forEach((doc) => {
            result.push([doc.id,doc.data()]);
        });
        return result;
    }catch(error){
        console.log(error);
        throw error;
    }
}

export {
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    getAll
}
