/************************************************************************
 * Init-Modules
 ************************************************************************/

//init firestore module
const ADMIN = require("firebase-admin");
const DB = ADMIN.firestore();

//init express module
var express = require("express");
var router = express.Router(null);

const ROUTE = "events";

//POST-------------------------------------------------------------------
router.post('/', function (req, res) {

    var event = req.body; //JSON in Body
    var eventName = event.name;
    var eventUsers = event.users;

    var eventID = getIdInCollection(ROUTE);
    event.eventList = {};

    //POST them in Firebase
    DB.collection(ROUTE).doc(eventID).set(event);


    eventUsers.forEach( userId => {
        var list = {};
        DB.collection(ROUTE).doc(eventID).collection("wishlists").doc(userId).set(list);
        DB.collection(ROUTE).doc(eventID).collection("shoppinglists").doc(userId).set(list);
    });


    //Send the URI of new event
    var uri = "http://localhost:3000/" + ROUTE + "/" + eventID;
    res.set('location',uri);
    res.json(event);
});

//GET-------------------------------------------------------------------
router.get('/', function (req, res) {
    getCollectionAsJSON(ROUTE).then(result => res.json(result));
});

router.get('/:eid' ,function (req, res) {
    var eventID = req.params.eid;
    getDokumentAsJSON(ROUTE, eventID).then(result => res.json(result));
});

//PUT-------------------------------------------------------------------
router.put('/:eid' ,function (req, res) {
    var eventID = req.params.eid;
    var newEvent = req.body;

    getDokumentAsJSON(ROUTE, eventID).then(result =>{

            DB.collection(ROUTE).doc(eventID).set(newEvent);
            res.send('Event: ' +eventID+'\n\nwas set from: ' + JSON.stringify(result) +'\nto: ' + JSON.stringify(newEvent));
        }
    );
});

//DELETE----------------------------------------------------------------
router.delete('/:eid' ,function (req, res) {
    var eventID = req.params.eid;
    DB.collection(ROUTE).doc(eventID).delete();
    res.send(eventID+' was deleted');
});

/************************************************************************
 * Wishlist
 ************************************************************************/

//GET-------------------------------------------------------------------

// gebe alle Wunschlisten eines Events aus
router.get('/:eid/wishlists', function (req, res) {
    getCollectionAsJSON(ROUTE + '/' + req.params.eid + '/wishlists').then(result => res.json(result));
});

// gebe die Wunschlisten für ein Event von einem User aus

router.get('/:eid/wishlists/:uid', function (req, res) {
    var eventID = req.params.eid;
    var wishlistsID = req.params.uid;
    getDokumentAsJSON(ROUTE + '/' + req.params.eid + '/wishlists', wishlistsID).then(result => res.json(result));
});

//PUT-------------------------------------------------------------------

// ändere die Wunschlisten für ein Event von einem User

router.put('/:eid/wishlists/:wid' ,function (req, res) {
    var eventID = req.params.eid;
    var wishlistID = req.params.wid;
    var newWishlist = req.body;

    getDokumentAsJSON(ROUTE, eventID).then(result =>{

            DB.collection(ROUTE).doc(eventID).collection(wishlists).doc(wishlistID).set(newWishlist);
            res.send('Wishlist: ' + eventID + wishlistID + '\n\nwas set from: ' + JSON.stringify(result) +'\nto: ' + JSON.stringify(newWishlist));
        }
    );
});


//Export as Module
module.exports = router;

/************************************************************************
 * Functions
 ************************************************************************/

function getCollectionAsJSON(collectionName) {
    return new Promise(function (resolve) {
        var json = {};

        var collection = DB.collection(collectionName);
        collection.get()
            .then(snapshot => {
                snapshot.forEach(doc => {

                    json[doc.id] = doc.data();
                });
            }).then(function () {
            resolve(json);
        });
    });
}

function getIdInCollection(collectionName) {
    var ref = DB.collection(collectionName).doc();
    var id = ref.id;

    return id;
}

function getDokumentAsJSON(collectionName,docName) {
    return new Promise(function (resolve) {
        var json = {};

        var document = DB.collection(collectionName).doc(docName);
        document.get()
            .then(doc => {
                json = doc.data();

            }).then(function () {
            resolve(json);
        });
    });
}