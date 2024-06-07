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

// ======================
// Classes (data models)
// ======================
/**
 * Class that represents an user document. This is used for both volunteers and elders, so all users will have these fields on the database, although some of them will be null depending on the role of the user
 */
class User{
    constructor(obj){
        this.id = obj.id;
        this.firstName = obj.firstName;
        this.middleName = obj.middleName;
        this.lastName = obj.lastName;
        this.institution = obj.institution; //the school they go to
        this.birthday = obj.birthday;
        this.bio = obj.bio;
        this.address = obj.address;
        this.phone = obj.phone;
        this.email = obj.email;
        this.role = obj.role;
        this.age = obj.age;
        this.eldersHelped = obj.eldersHelped;
        this.hours = obj.hours;
        this.favors = obj.favors;
        this.emergencyContactName = obj.emergencyContactName;
        this.emergencyContactNumber = obj.emergencyContactNumber;
    }
}
/**
 * Class that represents a task document
 */
class Task {
    constructor(obj){
        this.id = obj.id;
        this.name = obj.name;
        this.status = obj.status;
        this.requesterID = obj.requesterID;
        this.volunteerID = obj.volunteerID;
        this.notes = obj.notes;
        this.details = obj.details; //an object with no strict structure (depends on task type)
    }
}

// ======================
// Firestore data converters
// ======================
// Reference: https://firebase.google.com/docs/reference/js/v8/firebase.firestore.FirestoreDataConverter
//  They are used to make sure every document within a collection of the database have the same structure (fields)

const userConverter = {
    toFirestore: (user) => {
        return {
            id: user.id,
            firstName: user.firstName ? user.firstName : null,
            middleName: user.middleName ? user.middleName : null,
            lastName: user.lastName ? user.lastName : null,
            institution: user.institution ? user.institution : null,
            birthday: user.birthday ? user.birthday : null,
            bio: user.bio ? user.bio : null,
            phone:user.phone?user.phone:null,         
            email: user.email ? user.email : null,
            address: user.address ? user.address : null,
            role: user.role ? user.role : null,
            age:user.age ? user.age : null,
            eldersHelped: user.eldersHelped ? user.eldersHelped : 0,
            hours: user.hours ? user.hours : 0,
            favors:user.favors ? user.favors : 0,
            emergencyContactName:user.emergencyContactName ? user.emergencyContactName : null
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new User({
            id:data.id,
            firstName:data.firstName,
            middleName: data.middleName,
            lastName:data.lastName,
            institution: data.institution,
            birthday: data.birthday,
            bio: data.bio,
            phone:data.phone,
            email:data.email,
            address: data.address,
            role:data.role,
            age:data.age,
            eldersHelped: data.eldersHelped,
            hours: data.hours,
            favors: data.favors,
            emergencyContactName:data.emergencyContactName
        });
    },
};
const taskConverter = {
    toFirestore: (obj) => {
        return {
            id: obj.id,
            name: obj.name ? obj.name : null,
            status: obj.status ? obj.status : null,
            requesterID: obj.requesterID ? obj.requesterID : null,
            volunteerID: obj.volunteerID ? obj.volunteerID : null,
            details: obj.details ? obj.details : [],
            notes: obj.notes ? obj.notes : null
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new Task({
            id: data.id,
            name: data.name,
            status: data.status,
            requesterID: data.requester,
            volunteerID: data.volunteer,
            details: data.details,
            notes: data.notes
        });
    },
};

/**
 * Selects which converter to use depending on the collection in which they will be used
 * @param {string} collection - the relative path to a collection or subcollection
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
 * @param {Object} object object that will be created on the database
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
 * Updates a document from the provided collection based on the document ID.
 * Obs.: This should also be used to create a document with a specific ID. The
 * function above (createDocument) will only create documents with automatically 
 * generated IDs. Use this function instead to control which ID the document will
 * have
 * 
 * @param {string} collectionPath - the relative path to a collection or subcollection
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
 * @param {string} collectionPath  - the relative path to a collection or subcollection
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
