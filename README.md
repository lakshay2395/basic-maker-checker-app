# basic-maker-checker-app

basic implementation of distributed maker checker (4-eyes authorization principle)

# Network Overview

## Participants
 -  User (can be either maker or checker)

## Assets
 - Document (Document which revolves in between of maker and checker for update and approval)
 - FinalDocument (Final Document which appears for public view after the Documents' state has been approved by checker)

## Transactions
 - CreateUser 
 - UpdateUser
 - DeleteUser
 - CreateDocumentRequest
 - UpdateDocumentRequest
 - DeleteDocumentRequest
 - AcceptDocumentState
 - RejectDocumentState

## Events
 - DocumentCreatedRequest
 - DocumentUpdatedRequest
 - DocumentDeletedRequest
 - DocumentAccepted
 - FinalDocumentCreatedOrUpdated
 - DocumentRejected

# References
 - https://en.wikipedia.org/wiki/Maker-checker