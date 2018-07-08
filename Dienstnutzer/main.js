/* WBA2 Gruppe Sebastian Faust, Arthur Tissen, Julian Schoemaker */

/************************************************************************
 * Init modules
 ************************************************************************/

const rp = require('request-promise');
const chalk = require('chalk');
const readlineSync = require('readline-sync');

// switch of Dienstgeber path with option localhost or heroku
// const DIENST_GEBER = 'https://wba2-2018.herokuapp.com';
const DIENST_GEBER = 'http://localhost:3000';

/************************************************************************
 * Main
 ************************************************************************/

// --------------------------------------------- Start Display in Terminal where you can Login or Register
console.log(
    chalk.magenta('-------------------------\n') +
    '- Welcome to the Worlds -\n' +
    '- Greatest Partyplaner  -\n' +
    chalk.magenta('-------------------------'));

let selectOptions = ['Login','Register'];
let select = readlineSync.keyInSelect(selectOptions, 'What do you want to do? ');

// Switch-case for the option the user selected
switch (select){
    case 0:
        dialog_login().then( id => dialog_loggedIn(id));
        break;
    case 1:
        dialog_register().then( id => dialog_loggedIn(id));
        break;
}


/************************************************************************
 * Functions
 ************************************************************************/

// --------------------------------------------- Dialoges the user can walk through in the partyplaner

/**
 * show dialoge for the user that is logged in with possible interactions
 * this function is used to build a recursive dialoge for the logged in user
 * after using another function in the application
 * @param userID that is logged in
 */
function dialog_loggedIn(userID) {
    console.log(chalk.magenta("--------------------------------------"));
    console.log("You are now logged in as " + chalk.red(userID));
    console.log(chalk.magenta("--------------------------------------"));

    let selectOptions = ['Create event [you are not automatically added to new event]','Show your events','Enter an event','Add wish','Finalize the shoppinglist for an event','Get your shoppinglist for an event'];
    let select = readlineSync.keyInSelect(selectOptions, 'What do you want to do? ');

    switch (select){
        case 0:
            dialog_createNewEvent().then(function (location) {
                let responseMessage =
                    chalk.blue("----------------------------------------------------\n") +
                    "The event Was Created\n: "+
                    "You can find it here: "+ location + "\n"+
                    chalk.blue("----------------------------------------------------\n");
                console.log(responseMessage);

                //Recursion
                dialog_loggedIn(userID);
            });
            break;
        case 1:
            getEventsOfUser(userID).then( function(events){
                console.log(chalk.blue("Your " + chalk.blue("Events:")));
                console.log(chalk.blue("-------------------"));
                console.log(events);
                console.log(chalk.blue("-------------------"));

                //Recursion
                dialog_loggedIn(userID);
            });
            break;
        case 2:
            dialog_enterEvent(userID).then(res => dialog_loggedIn(userID));
            break;
        case 3:
            dialog_createNewWish(userID).then(function(){
                console.log("------------------------");
                dialog_loggedIn(userID);
            });
            break;
        case 4:
            //Post shoppinglist
            dialog_chooseOneEvent(userID).then(function (eventID) {

                postShoppinglist(eventID);

                let responseMessage =
                    chalk.blue("----------------------------------------------------\n") +
                    "The shoppinglists are created now\n " +
                    chalk.blue("----------------------------------------------------\n");
                console.log(responseMessage);

                //Recursion
                dialog_loggedIn(userID);
            });
            break;
        case 5:
            //Get My Shoppinglist for event
            dialog_chooseOneEvent(userID).then(function (eventID) {

                getUserShoppinglist(userID, eventID).then(function (myShoppingList) {
                    let listCounter = 0;

                    let responseMessage =
                        chalk.yellow("----------------------------------------------------\n") +
                        "Your shoppinglist: \n" +
                        chalk.yellow("----------------------------------------------------\n");
                    console.log(responseMessage);

                    myShoppingList.forEach(function (wish) {
                        getWish(uriToID(wish), eventID).then(function (wishJson) {
                            console.log(wishJson);
                            listCounter++;

                            if(listCounter >= myShoppingList.length){
                                //Recursion
                                dialog_loggedIn(userID);
                            }
                        });

                    });

                });

            });

            break;
    }
}

/**
 * login a already registered user
 * this function is used for the users.js in the Dienstgeber
 * @returns {Promise<any>} resolve: userID
 */
function dialog_login() {
    return new Promise(function (resolve) {
        //Dialog------------------------------------------
        console.log("These are all " + chalk.red("users") + "\n");

        getAllUsers().then(function (users) {
            console.log(chalk.red("--------------------------------------"));
            console.log(users);
            console.log(chalk.red("--------------------------------------"));
            let userID = readlineSync.question('As which one do you want to act?\nUserId: ');

            resolve(userID);
        });
    });

}

/**
 * register a new user into the partyplaner
 * this function is used for the users.js in the Dienstgeber
 * @returns {Promise<any>} resolve: user and name added
 */
function dialog_register() {
    return new Promise(function (resolve) {
        let names = [];
        let userName = readlineSync.question('What is your name?\nName: ');
        names.push(userName);
        postUsers(names).then(function (json) {
            console.log(json);
            resolve(uriToID(json[userName]));
        });
    });
}

/**
 * create an new event
 * Note: the user, you are logged in with, is not automatically added to the event your created
 * @returns {Promise<any>} resolve: event created
 */
function dialog_createNewEvent() {
    return new Promise(function (resolve) {
        let eventName = readlineSync.question('What is the name of your new event?\n');
        postEvent(eventName).then(function (location) {

            resolve(location);
        });
    });

}

/**
 * user can enter an event
 * Note: with creating an event, the user is not automatically added to the event. He has to use this function.
 * @param userID of the user logged in
 * @returns {Promise<any>} resolve: dialoge displayed
 */
function dialog_enterEvent(userID) {
    return new Promise(function (resolve) {
        getAllEvents().then(function (events) {
            console.log("These are all " + chalk.blue("events") + "\n");
            console.log(chalk.blue("--------------------------------------"));
            console.log(events);
            console.log(chalk.blue("--------------------------------------"));
            let eventID = readlineSync.question('Which one do you want to join?\nEventId: ');
            let users = [];
            users.push(userID);
            postUsersToEvent(users, eventID).then(function () {
                console.log("User " + chalk.red(userID) + " has been added to event " + chalk.blue(eventID));
                resolve();
            });
        });
    });

}

/**
 * create a new wish for a user in an event
 * used the helper function getEventsOfUser first to give the user the opinion to see all events the joined
 * @param userID of the user logged in
 * @returns {Promise<any>} resolve: dialoge displayed
 */
function dialog_createNewWish(userID) {
    return new Promise(function (resolve) {
        getEventsOfUser(userID).then(function (events) {
            console.log("These are all your " + chalk.blue("Events") + "\n");
            console.log(chalk.blue("--------------------------------------"));
            console.log(events);
            console.log(chalk.blue("--------------------------------------"));
            let eventID = readlineSync.question('Where do you want to add new wishes?\nEventId: ');

            console.log("Enter the wishes you want to add to this event (Press ENTER on empty input to abort)");

            let caseSwitch = "nameCase";
            let name;
            let location;


            while (true) {
                switch (caseSwitch){
                    case "nameCase":
                        name =  readlineSync.question('name: ');
                        if(name == ""){
                            resolve();
                            return;
                        }
                        caseSwitch = "locCase";
                        break;
                    case "locCase":
                        location =  readlineSync.question('location: ');
                        if(location == ""){
                            resolve();
                            return;
                        }

                        postWish(eventID,userID,name,location);

                        caseSwitch = "nameCase";
                        break;
                }

            }
        });
    });
}

/**
 * openes a dialog where the user can choose one his events
 * used the helper function getEventsOfUser first to give the user the opinion to see all events the joined
 * @param userID of the user logged in
 * @returns {Promise<any>} resolve: int eventID
 */
function dialog_chooseOneEvent(userID) {
    return new Promise(function (resolve) {
        getEventsOfUser(userID).then(function (events) {
            console.log("These are all your " + chalk.blue("events") + "\n");
            console.log(chalk.blue("--------------------------------------"));
            console.log(events);
            console.log(chalk.blue("--------------------------------------"));
            let eventID = readlineSync.question('Which event you want to select?\nEventId: ');

            resolve(eventID);
        });
    });
}

/**
 * Unused function in our use case
 * but smart function to create an event and also add users
 * within 'one action'
 */
function createNewEventAndAddUsers() {
    let usersNames = [];
    let eventName;

    //Dialog------------------------------------------
    eventName = readlineSync.question('What is the name of your new event?\n');
    console.log("Enter the names of the people you want to add to the event (Press ENTER again to confirm)");

    while (run = true) {
        let newName =  readlineSync.question('name: ');

        if(newName == ""){
            break;
        }else {
            usersNames.push(newName);
        }
    }

    //Logic-------------------------------------------
    postUsers(usersNames).then(function (users) {  //Create new Useres for each name
        postEvent(eventName).then(function (eventlocation) {  //Create Event with given name
            postUsersToEvent(users,uriToID(eventlocation)).then(function () { //Add Users to Event

                //Build Response Text
                let responseMessage =
                    "----------------------------------------------------\n" +
                    "The event: " + chalk.green(eventName) + " was created\n"+
                    "Event URI: " + chalk.blue(eventlocation) +"\n"+
                    "----------------------------------------------------\n" +
                    "The Users : " + chalk.magenta(JSON.stringify(users)) + "\n\nhave been created and were added to the event.";

                console.log(responseMessage);
            });
        });
    });


}

// --------------------------------------------- Helper Functions and Ressource operations from the Dienstnutzer

/**
 * Cuts a URI (URL) at its last "/" and returns the following part of the string
 * with this we can compare IDs in our processes
 * @param uri a URI as a String
 * @returns {*|string} hopefully an ID
 */
function uriToID(uri) {
    let uriArray = uri.split('/');
    return uriArray[uriArray.length -1];
}

/**
 * get the items of the shoppinglist that are matched to myself
 * we need this function, because the event just got one shoppinglist and the user 'extract' their list from it
 * @param userID of the user logged in
 * @param eventID of the event the user wants to get his items from
 * @returns {Promise<any>} resolve: Array
 */
function getUserShoppinglist(userID, eventID) {
    return new Promise(function (resolve) {
        let options = {
            method: 'GET',
            uri: DIENST_GEBER + '/events/' + eventID + '/shoppinglist',
            json: true, // Automatically stringifies the body to JSON
            resolveWithFullResponse: false
        };

        rp(options).then(function (allShoppingItems) {
            let myShoppingList = [];
            let arrayCounter = 0;

            for(let key in allShoppingItems){
                let potentialUserId = uriToID(allShoppingItems[key].user);
                arrayCounter++;

                // compare the userID of the user logged in to the user of the shoppinglist items
                if(potentialUserId == userID) {
                    myShoppingList.push(allShoppingItems[key].wish);
                }

                // only resolve if the whole shoppinglist went through
                if(arrayCounter >= Object.keys(allShoppingItems).length) {
                    resolve(myShoppingList);
                }

            }
        });
    });


}

/**
 * get entered events of the user
 * we need this function for the dialoges where we first need the event the user wants to select
 * @param userId of the user that is logged in
 * @returns {Promise<any>} resolve: JSON
 */
function getEventsOfUser(userId) {
    return new Promise(function (resolve) {
        let options = {
            uri: DIENST_GEBER + '/users/' + userId + '/events',
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };

        rp(options)
            .then(function (res) {
                resolve(res);
            });
    });
}

/**
 * get all events that are created
 * @returns {Promise<any>} resolve: JSON
 */
function getAllEvents() {
    return new Promise(function (resolve) {
        let options = {
            uri: DIENST_GEBER + '/events' ,
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };

        rp(options)
            .then(function (res) {
                resolve(res);
            });
    });
}

/**
 * get all users in the partyplaner
 * @returns {Promise<any>} resolve: JSON
 */
function getAllUsers() {
    return new Promise(function (resolve) {
        let options = {
            uri: DIENST_GEBER + '/users',
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };

        rp(options)
            .then(function (res) {
                resolve(res);
            });
    });

}

/**
 * get a wish of the logged in user in this event
 * @param wishID of the wish you are searching for
 * @param eventID of the wish
 * @returns {Promise<any>} resolve: JSON
 */
function getWish(wishID, eventID) {
    return new Promise(function (resolve) {
        let options = {
            uri: DIENST_GEBER + '/events/' + eventID + '/wishes/' + wishID,
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };

        rp(options)
            .then(function (res) {
                resolve(res);
            });
    });
}

/**
 * Post on the events /shoppinglist to create it with all wishes
 * @param eventID of the shoppinglist
 */
function postShoppinglist(eventID) {
    let options = {
        method: 'POST',
        uri :  DIENST_GEBER + '/events/' + eventID + '/shoppinglist',
        json: true, // Automatically stringifies the body to JSON
        resolveWithFullResponse: true
    };
    rp(options);
}

/**
 * Takes an array of names and posts each one as a new user
 * @param userNames Array of names
 * @returns {Promise<any>} a Promise that is to be resoled with a JSON that links each name to there location (URI)
 */
function postUsers(userNames) {
    let users = {};

    //Build base Options
    let options = {
        method: 'POST',
        uri : DIENST_GEBER + '/users',
        json: true, // Automatically stringifies the body to JSON
        resolveWithFullResponse: true
    };

    return new Promise((resolve, reject) => { //Build Promise
        let promiseCount = 0;

        userNames.forEach(function (userName) { //Iterate through all User names in req
            options.body = {'name': userName};

            rp(options).then(function (rpResponse) { //Post to "Dienstgeber" for each username
                //Save Location of each User
                users[userName] = rpResponse.headers.location;
            }).then(function () { //check if all users have been POSTed
                if(promiseCount < userNames.length -1){
                    promiseCount++;
                } else {
                    resolve(users);
                }
            });
        });
    });
}

/**
 * POST new gvent with given Name
 * @param eventName name of event to be Posted
 * @returns {Promise<any>} A Promise that is to be resolved with a String that contains the location (URI) of the new event
 */
function postEvent(eventName) {
    let eventLocation;

    //Build base Options
    let options = {
        method: 'POST',
        uri :  DIENST_GEBER + '/events',
        body : {'name' : eventName},
        json: true, // Automatically stringifies the body to JSON
        resolveWithFullResponse: true
    };

    return new Promise((resolve, reject) => {  //Build Promise
        rp(options).then(function (rpResponse) {
            //Save Event location
            eventLocation = rpResponse.headers.location;
            resolve(eventLocation);
        });
    });
}

/**
 * Adds multiple users to given event
 * @param userURIs JSON of User names that map to their URIs (Return of "postUsers")
 * @param eventlocation URI of Event
 * @returns {Promise<any>} resolve: JSON
 */
function postUsersToEvent(userURIs, eventID) {

    let options = {
        method: 'POST',
        uri :  DIENST_GEBER + '/events/' + eventID + '/users',
        json: true, // Automatically stringifies the body to JSON
        resolveWithFullResponse: true
    };
    return new Promise((resolve, reject) => {  //Build Promise

        for (let key in userURIs){ //Iterate through all User names in req

            let userName = key;
            let userURI = userURIs[key];

            options.body = {'user': uriToID(userURI)}; //Get Id of each User


            rp(options);
            console.log(options.body);

        }
        resolve();
    });
}

/**
 * Adds an wish from the user logged in to an event with name and location where to buy
 * @param eventID where the wish will be added
 * @param userID of the user that is logged in
 * @param name of the wish (e.g. water)
 * @param location of the shop where you can buy this wish (e.g. market)
 */
function postWish(eventID,userID,name,location) {
    //Build base Options
    let options = {
        method: 'POST',
        uri :  DIENST_GEBER + '/events/' + eventID + '/wishes',
        body :
            {'name' : name,
                'location': location,
                'user': userID},
        json: true, // Automatically stringifies the body to JSON
        resolveWithFullResponse: true
    };
    rp(options);
}
