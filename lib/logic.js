/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';


const NS = "org.makerchecker";


function randomString(length) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

/**
 * Create User
 * @param {org.makerchecker.CreateUser} createUser
 * @transaction
 */
async function createUser(userData) {
    let factory = getFactory();
    let userRegistry = await getParticipantRegistry(NS+".User");
    let userId = randomString(12);
    let user = factory.newResource(NS,"User",userId);
    user.userId = userId;
    user.userName = factory.newConcept(NS,"Name");
    user.userName.firstName = userData.firstName;
    user.userName.lastName = userData.lastName;
    user.gender = userData.gender;
    user.age = userData.age;
    user.isDeleted = false;
    await userRegistry.add(user);
}


/**
 * Update User
 * @param {org.makerchecker.UpdateUser} updateUser
 * @transaction
 */
async function updateUser(userData) {
    let factory = getFactory();
    let userRegistry = await getParticipantRegistry(NS+".User");
    let user = null;
    try{
        user = await userRegistry.get(userData.userId)
    }catch(err){
        throw new Error(err)
    }
    user.userName = factory.newConcept(NS,"Name");
    user.userName.firstName = userData.firstName;
    user.userName.lastName = userData.lastName;
    user.gender = userData.gender;
    user.age = userData.age;
    user.isDeleted = false;
    await userRegistry.update(user);
}


/**
 * Delete User
 * @param {org.makerchecker.DeleteUser} deleteUser
 * @transaction
 */
async function deleteUser(userData) {
    let factory = getFactory();
    let userRegistry = await getParticipantRegistry(NS+".User");
    let user = null;
    try{
        user = await userRegistry.get(userData.userId)
    }catch(err){
        throw new Error(err)
    }
    user.isDeleted = true;
    await userRegistry.update(user);
}


/**
 * Create Document
 * @param {org.makerchecker.CreateDocumentRequest} createDocumentRequest
 * @transaction
 */
async function createDocumentRequest(documentData) {
    let factory = getFactory();
    let event = factory.newEvent(NS,"DocumentCreatedRequest");
    event.previousState = "";
    let documentRegistry = await getAssetRegistry(NS+".Document");
    let userRegistry = await getParticipantRegistry(NS+".User");
    let documentId = randomString(12);
    let document = factory.newResource(NS,"Document",documentId);
    document.documentId = documentId;
    document.content = documentData.content;
    document.lastMakerRemark = documentData.remark;
    document.lastCheckerRemark = "";
    document.creationAt = new Date();
    document.lastModifiedAt = new Date();
    document.lastMakerStatus = "CREATE";
    document.lastCheckerStatus = "PENDING";
    let currentParticipant = getCurrentParticipant();
    try {
        let checker = await userRegistry.get(documentData.checkerId)
    }catch(err){
        throw new Error("No such user exists with checker id")
    }
    if(currentParticipant.userId == documentData.checkerId){
        throw new Error("checker cannot be same as current participant")
    }
    document.checker = factory.newRelationship(NS,"User",documentData.checkerId)
    document.maker = factory.newRelationship(NS,"User",currentParticipant.userId);
    await documentRegistry.add(document);
    event.nextState = JSON.stringify(document)
    event.documentId = documentId;
    emit(event);
}

/**
 * Update Document
 * @param {org.makerchecker.UpdateDocumentRequest} updateDocumentRequest
 * @transaction
 */
async function updateDocumentRequest(documentData) {
    let factory = getFactory();
    let event = factory.newEvent(NS,"DocumentUpdatedRequest");
    let documentRegistry = await getAssetRegistry(NS+".Document");
    let document = null;
    try{
        document = await documentRegistry.get(documentData.documentId)
        event.previousState = JSON.stringify(document)
    }catch(err){
        throw new Error("No document with given id exists");
    }
    if(document.lastCheckerStatus == "ACCEPTED" && document.lastMakerStatus == "DELETE")
        throw new Error("Document is already deleted")
    if(document.lastCheckerStatus == "PENDING")
        throw new Error("Document is already under verficiation by checker. Cannot make any new changes further.")
    document.content = documentData.content;
    document.lastModifiedAt = new Date();
    document.lastMakerStatus = "UPDATE";
    document.lastCheckerStatus = "PENDING";
    let currentParticipant = getCurrentParticipant();
    document.lastMakerRemark = documentData.remark;
    await documentRegistry.update(document);
    event.documentId = document.documentId;
    event.nextState = JSON.stringify(document);
    emit(event);
}

/**
 * Delete Document
 * @param {org.makerchecker.DeleteDocumentRequest} deleteDocumentRequest
 * @transaction
 */
async function deleteDocumentRequest(documentData) {
    let factory = getFactory();
    let event = factory.newEvent(NS,"DocumentDeletedRequest");
    let documentRegistry = await getAssetRegistry(NS+".Document");
    let document = null;
    try{
        document = await documentRegistry.get(documentData.documentId)
        event.previousState = JSON.stringify(document)
    }catch(err){
        throw new Error("No document with given id exists");
    }
    if(document.lastCheckerStatus == "ACCEPTED" && document.lastMakerStatus == "DELETE")
        throw new Error("Document is already deleted")
    document.lastModifiedAt = new Date();
    document.lastMakerStatus = "DELETE";
    document.lastCheckerStatus = "PENDING";
    let currentParticipant = getCurrentParticipant();
    if(currentParticipant.userId != document.maker.userId)
        throw new Error("Current user is not the maker of the document")
    document.lastMakerRemark = documentData.remark;
    await documentRegistry.update(document);
    event.documentId = documentData.documentId;
    event.nextState = JSON.parse(document)
    emit(event);
}

/**
 * Accept Document
 * @param {org.makerchecker.AcceptDocumentState} acceptDocumentState
 * @transaction
 */
async function acceptDocumentState(documentData) {
    let factory = getFactory();
    let documentRegistry = await getAssetRegistry(NS+".Document");
    let finalDocumentRegistry = await getAssetRegistry(NS+".FinalDocument");
    let event = factory.newEvent(NS,"DocumentAccepted");
    let document = null;
    try{
        document = await documentRegistry.get(documentData.documentId)
        event.previousState = JSON.stringify(document)
    }catch(err){
        throw new Error("No document with given id exists");
    }
    if(document.lastCheckerStatus == "ACCEPTED" && document.lastMakerStatus == "DELETE")
        throw new Error("Document is already deleted")
    document.lastModifiedAt = new Date();
    document.lastCheckerStatus = "ACCEPTED";
    document.lastCheckerRemark = documentData.remark;
    await documentRegistry.update(document);
    event.documentId = document.documentId;
    event.nextState = JSON.stringify(document);
    emit(event);
    let finalDocument = null;
    try{
        finalDocument = await finalDocumentRegistry.get(document.documentId)
        finalDocument.content = document.content;
        finalDocument.creationAt = document.creationAt;
        finalDocument.lastModifiedAt = document.lastModifiedAt;
        finalDocument.lastMakerStatus = document.lastMakerStatus;
        finalDocument.lastCheckerStatus = document.lastCheckerStatus;
        await finalDocumentRegistry.update(finalDocument);
    }catch(err){
        finalDocument = factory.newResource(NS,"FinalDocument",document.documentId);
        finalDocument.content = document.content;
        finalDocument.creationAt = document.creationAt;
        finalDocument.lastModifiedAt = document.lastModifiedAt;
        finalDocument.lastMakerStatus = document.lastMakerStatus;
        finalDocument.lastCheckerStatus = document.lastCheckerStatus;
        finalDocument.maker = document.maker;
        finalDocument.checker = document.checker;
        await finalDocumentRegistry.add(finalDocument);
    }
    let finalDocumentEvent = factory.newEvent(NS,"FinalDocumentCreatedOrUpdated");
    finalDocumentEvent.documentId = document.documentId;
    emit(event);
}

/**
 * Reject Document
 * @param {org.makerchecker.RejectDocumentState} rejectDocumentState
 * @transaction
 */
async function rejectDocumentState(documentData) {
    let factory = getFactory();
    let event = factory.newEvent(NS,"DocumentRejected");
    let documentRegistry = await getAssetRegistry(NS+".Document");
    let document = null;
    try{
        document = await documentRegistry.get(documentData.documentId)
        event.previousState = JSON.stringify(document);
    }catch(err){
        throw new Error("No document with given id exists");
    }
    if(document.lastCheckerStatus == "ACCEPTED" && document.lastMakerStatus == "DELETE")
        throw new Error("Document is already deleted")
    document.lastModifiedAt = new Date();
    document.lastCheckerStatus = "REJECTED";
    document.lastCheckerRemark = documentData.remark;
    await documentRegistry.update(document);
    event.documentId = documentData.documentId;
    event.nextState = JSON.stringify(document);
    emit(event);
}

