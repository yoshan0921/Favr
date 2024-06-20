import {
    firestore,
    storage
} from "./firebase.js";
 import{
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"
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
 * Class that represents an user document. This is used for both volunteers and elders, so all users will have these fields on the database, although some of them will be null depending on their role
 */
class User{
    constructor(obj){
        this.id = obj.id;
        this.firstName = obj.firstName;
        this.middleName = obj.middleName;
        this.lastName = obj.lastName;
        this.institution = obj.institution; //the school they go to
        this.profilePictureURL = obj.profilePictureURL,
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
        this.tasksList = obj.tasksList;
        this.notificationsSubscription = obj.notificationsSubscription;
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
        this.createdDate = obj.createdDate;
        this.closedDate = obj.closedDate;
        this.completionTime = obj.completionTime;
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
            profilePictureURL: user.profilePictureURL ? user.profilePictureURL : null,
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
            emergencyContactName:user.emergencyContactName ? user.emergencyContactName : null,
            emergencyContactNumber:user.emergencyContactNumber ? user.emergencyContactNumber : null,
            tasksList : user.tasksList ? user.tasksList : null,
            notificationsSubscription : user.notificationsSubscription ? user.notificationsSubscription : []
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
            profilePictureURL: data.profilePictureURL,
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
            emergencyContactName:data.emergencyContactName,
            emergencyContactNumber:data.emergencyContactNumber,
            tasksList : data.tasksList,
            notificationsSubscription : (data.notificationsSubscription) ? data.notificationsSubscription : []
        });
    },
};
const taskConverter = {
    toFirestore: (obj) => {
        return {
            name: obj.name ? obj.name : null,
            status: obj.status ? obj.status : null,
            requesterID: obj.requesterID ? obj.requesterID : null,
            volunteerID: obj.volunteerID ? obj.volunteerID : null,
            details: obj.details ? obj.details : [],
            createdDate: obj.createdDate? obj.createdDate : null,
            closedDate: obj.closedDate? obj.closedDate : null,
            completionTime: obj.completionTime? obj.completionTime : null,
            notes: obj.notes ? obj.notes : null
        };
    },
    fromFirestore: (snapshot, options) => {
        const data = snapshot.data(options);
        return new Task({
            id: data.id,
            name: data.name,
            status: data.status,
            requesterID: data.requesterID,
            volunteerID: data.volunteerID,
            details: data.details,
            createdDate: data.createdDate,
            closedDate: data.closedDate,
            completionTime: data.completionTime,
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
            //console.log("Document data:", docSnap.data());
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
/**
 * Uploads a file to Firebase Storage. If a file already exists on the given path, it is overwritten (updated)
 * 
 * @param {string} path - the relative path to the file on Firebase Storage. It should have the name of the bucket (ex.: profile) and the name of the file with it's extension (ex.: .jpg, .png, etc)
 * @param {File} file - a File object that should be retrieved through a form (refer to profile.js to see how to do it)
 * @param {JSON} metadata - (OPTIONAL) An object that contains metadata about the file. It is not required for this function to work
 * @returns a promise
 */
async function uploadFile(path, file, metadata = {}){
    const storageRef = ref(storage, path);

    return new Promise((resolve, reject)=>{
        uploadBytes(storageRef, file, metadata)
        .then(() => {
            console.log('Uploaded file successfully!');
            resolve(storageRef);
        })
        .catch((error)=>{
            reject(error);
        });
    })


}
/**
 * Gets the downloadURL of a file from the Storage
 * @param {string} path - the absolute path to the file (name of the collection followed by / and the file name with the extension)
 * @returns a promise
 */
async function getFile(path){
    return new Promise((resolve, reject)=>{
        getDownloadURL(ref(storage, path))
        .then((downloadURL) => {
            //console.log('File available at', downloadURL);
            resolve(downloadURL);
        })
        .catch((error)=>{
            reject(error);
        });
    })
}
export {
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    getAll,
    uploadFile,
    getFile
}
