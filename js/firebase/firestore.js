import { firestore } from "./firebase.js";
import {
    getDocs,
    doc,
    addDoc,
    setDoc,
    getDoc,
    deleteDoc,
    collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Class that represents an user document (still not used)
 */
class User{
    constructor(obj){
        this.id = obj.id;
        this.firstName = obj.firstName;
        this.lastName = obj.lastName;
        this.email = obj.email;
        this.role = obj.role;
        this.age = obj.age;
    }
}
/**
 * Class that represents a task document (still not used)
 */
class Task {
    constructor(obj){
        this.id = obj.id;
        this.name = obj.name;
        this.status = obj.status;
        this.requester = obj.requester;
        this.volunteer = obj.volunteer;
    }
}

/***=========== Firestore data converters ===========***/
// Reference: https://firebase.google.com/docs/reference/js/v8/firebase.firestore.FirestoreDataConverter
//  They are used to make sure every document within a collection of the database have the same structure (fields)
const userConverter = {
    toFirestore: (user) => {
        return {
            id: user.id,
            firstName: user.firstName ? user.firstName : null,
            lastName: user.lastName ? user.lastName : null,
            email: user.email ? user.email : null,
            role: user.role ? user.role : null,
            age:user.age ? user.age : null
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new User({
            id:data.id,
            firstName:data.firstName,
            lastName:data.lastName,
            email:data.email,
            role:data.role,
            age:data.age
        });
    },
};
const taskConverter = {
    toFirestore: (obj) => {
        console.log(
            new Task({
                id: obj.id,
                name: obj.name ? obj.name : null,
                status: obj.status ? obj.status : null,
                requester: obj.requester ? obj.requester : null,
                volunteer: obj.volunteer ? obj.volunteer : null
            })
        )
        return {
            id: obj.id,
            name: obj.name ? obj.name : null,
            status: obj.status ? obj.status : null,
            requester: obj.requester ? obj.requester : null,
            volunteer: obj.volunteer ? obj.volunteer : null
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new Task({
            id: data.id,
            name: data.name,
            status: data.status,
            requester: data.requester,
            volunteer: data.volunteer
        });
    },
};

/**
 * Selects which converter to use depending on the collection in which they will be used
 * @param {string} collection 
 * @returns reference to a converter
 */
function selectDataConverter(collectionPath){
    let collectionName = "";
    for(let part of collectionPath.split("/")){
        collectionName = part;
    }
    switch(collectionName){
        case "users":
            return userConverter;
        case "tasks":
            return taskConverter;
        default:
            return (obj) => obj; //a function that does nothing to the given object
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
    let converter = selectDataConverter(collectionPath);
    let convertedObject = converter.toFirestore(object);
    try {
        return addDoc(collection(firestore, collectionPath), convertedObject);
    } catch (error) {
        console.log(error);
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
        const documentReference = doc(firestore, collectionPath, id).withConverter(selectDataConverter(collectionPath));
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
    const documentReference = doc(firestore, `${collectionPath}/${id}`).withConverter(selectDataConverter(collectionPath));
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
    const documentReference = doc(firestore, `${collectionPath}/${id}`).withConverter(selectDataConverter(collectionPath));
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
