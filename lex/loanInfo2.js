'use strict';

 /**
  * This sample demonstrates an implementation of the Lex Code Hook Interface
  * in order to serve a sample bot which manages orders for flowers.
  * Bot, Intent, and Slot models which are compatible with this sample can be found in the Lex Console
  * as part of the 'OrderFlowers' template.
  *
  * For instructions on how to set up and test this bot, as well as additional samples,
  *  visit the Lex Getting Started documentation.
  */


 // --------------- Lex specific Helpers to build responses which match the structure of the necessary dialog actions -----------------------

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
        },
    };
}

function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
}

// ---------------- Helper Functions --------------------------------------------------

function buildValidationResult(isValid, violatedSlot, messageContent) {
    if (messageContent == null) {
        return {
            isValid,
            violatedSlot,
        };
    }
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent },
    };
}

function isValidDate(date) {
    return !(isNaN(Date.parse(date)));
}

function validateLoanInfo(account, dob, lastFour) {
    const accounts = ['111111111', '222222222', '333333333', '444444444'];
    const dobs = ['1967-06-10', '01-10-1980', '0101-1990', '01-01-1900'];
    const lastFours = ['7346', '1234', '1111', '2222', '3333', '4444'];
    const lastNames = ['Howell', 'Kordash', 'Nelson', 'Haughton', 'Smith', 'Johnson'];
    const firstNames = ['Michael', 'Grant', 'Jeff', 'Jeff', 'John', 'Jack'];

  if (dob) {
        if (!isValidDate(dob)) {
            return buildValidationResult(false, 'DOB', 'I did not understand your date of birth.  When where you born (mm/dd/yyyy)?');
        }
        if (new Date(dob) > new Date()) {
            return buildValidationResult(false, 'DOB', 'Your date of birth is in the future!  Can you try a different date?');
        }
    }

    if (dob && dobs.indexOf(dob) === -1) {
        console.log(`This is dob its index is equal to -1`);
        return buildValidationResult(false, 'DOB', `We do not show ${dob} as a date of birth, please enter a valid date of birth`);
    }
    if (account && accounts.indexOf(account) === -1) {
        console.log(`This is account and its index is equal to -1`);
        return buildValidationResult(false, 'Account', `We do not recognize, ${account} as an account number, this is a test, use 1's, 2's or3's`);
    }
    if (lastFour && lastFours.indexOf(lastFour) === -1) {
        console.log(`This is Last Four and its index is equal to -1`);
        return buildValidationResult(false, 'LastFour', `We do not recognize, ${lastFour} as someone's Last Four of their SSN, this is a test, use 1's, 2's or3's`);
    }

    return buildValidationResult(true, null, null);
}

 // --------------- Functions that control the bot's behavior -----------------------

/**
 * Performs dialog management and fulfillment for ordering flowers.
 *
 * Beyond fulfillment, the implementation of this intent demonstrates the use of the elicitSlot dialog action
 * in slot validation and re-prompting.
 *
 */
function loanInfo(intentRequest, callback) {
    const account = intentRequest.currentIntent.slots.Account;
    const dob = intentRequest.currentIntent.slots.DOB;
    const lastFour = intentRequest.currentIntent.slots.LastFour;
    const source = intentRequest.invocationSource;
    const sessionAttributes = intentRequest.sessionAttributes;
    const util = require('util');

    // Load  history and track the current request info.
    const userinfo = String(JSON.stringify({ RequestType: 'LoanBalance', account: account, dob: dob, lastFour: lastFour}));
    sessionAttributes.currentUserInfo = userinfo;

    console.log(`----This is LoanInfo start ----`);
    console.log(util.inspect(intentRequest, false, null));

    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots.  Use the elicitSlot dialog action to re-prompt for the first violation detected.
        const slots = intentRequest.currentIntent.slots;
        const validationResult = validateLoanInfo(account, dob, lastFour);
        console.log(`Start source is equal to DialogCodeHook`);

        if (!validationResult.isValid) {
            slots[`${validationResult.violatedSlot}`] = null;
            callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
            console.log(`This is validation of result and is Valid `);
            return;
        }

        // Pass the price of the flowers back through session attributes to be used in various prompts defined on the bot model.
        const outputSessionAttributes = intentRequest.sessionAttributes;
        if (account) {
            outputSessionAttributes.Price = account.length * 5; // Elegant pricing model, this is a test to see where the attributes are stored
        }
        console.log(`This is Price section `);
        callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));

        return;
    }

    console.log(`----Delete Attributes Print again----`);
    delete sessionAttributes.currentUserInfo;
    console.log(util.inspect(intentRequest, false, null));

   // lastConfirmedUserInfo = userinfo;


    // Order the flowers, and rely on the goodbye message of the bot to define the message to the end user.  In a real bot, this would likely involve a call to a backend service.
    callback(close(intentRequest.sessionAttributes, 'Fulfilled',
    { contentType: 'PlainText', content: `Thanks, your interest First Name Last Name, Your balance is currently $20,090, ask and I can tell you your next payment. Lambda Message` }));
}
//--------------------------------TEST--------------------- nextPayment
function bookCar(intentRequest, callback) {
    const slots = intentRequest.currentIntent.slots;
    const account = slots.Account;
    const dob = slots.DOB;
    const lastFour = slots.LastFour;
    const confirmationStatus = intentRequest.currentIntent.confirmationStatus;
    const sessionAttributes = intentRequest.sessionAttributes;
    const lastConfirmedReservation = sessionAttributes.lastConfirmedUserInfo ? JSON.parse(sessionAttributes.lastConfirmedUserInfo) : null;
    const confirmationContext = sessionAttributes.confirmationContext;

    // Load confirmation history and track the current reservation.
    const userinfo = String(JSON.stringify({ RequestType: 'LoanBalance', account: account, DOB: dob, lastFour: lastFour}));
    sessionAttributes.currentUserInfo = userinfo;

    if (intentRequest.invocationSource === 'DialogCodeHook') {
        // Validate any slots which have been specified.  If any are invalid, re-elicit for their value
        const validationResult = validateLoanInfo(intentRequest.currentIntent.slots);
        if (!validationResult.isValid) {
            slots[`${validationResult.violatedSlot}`] = null;
            callback(elicitSlot(sessionAttributes, intentRequest.currentIntent.name,
            slots, validationResult.violatedSlot, validationResult.message));
            return;
        }

        // Determine if the intent (and current slot settings) has been denied.  The messaging will be different if the user is denying a reservation he initiated or an auto-populated suggestion.
        if (confirmationStatus === 'Denied') {
            // Clear out auto-population flag for subsequent turns.
            delete sessionAttributes.confirmationContext;
            delete sessionAttributes.currentUserInfo
            if (confirmationContext === 'AutoPopulate') {
                callback(elicitSlot(sessionAttributes, intentRequest.currentIntent.name, { Account: null, DOB: null, LastFour: null}, 'Account',
                { contentType: 'PlainText', content: 'What is your account number?' }));
                return;
            }
            callback(delegate(sessionAttributes, intentRequest.currentIntent.slots));
            return;
        }

        if (confirmationStatus === 'None') {
            // If we are currently auto-populating but have not gotten confirmation, keep requesting for confirmation.
            if ((!account && !dob && !lastFour == null) || confirmationContext === 'AutoPopulate') {
                if (lastConfirmedUserInfo && lastConfirmedUserInfo.UserInfoType === 'LoanBalance') {
                    //If the user's previous reservation was a hotel - prompt for a rental with auto-populated values to match this reservation.
                    sessionAttributes.confirmationContext = 'AutoPopulate';
                    callback(confirmIntent(sessionAttributes, intentRequest.currentIntent.name,
                        {
                            Account: lastConfirmedUserInfo.Account,
                            DOB: lastConfirmedUserInfo.DOB,
                            LastFour: lastConfirmedUserInfo.LastFour
                        },
                        { contentType: 'PlainText', content: `Is this for the same Account ${lastConfirmedUserInfo.Account} ?` }));
                    return;
                }
            }
            // Otherwise, let native DM rules determine how to elicit for slots and/or drive confirmation.
            callback(delegate(sessionAttributes, intentRequest.currentIntent.slots));
            return;
        }

        // If confirmation has occurred, continue filling any unfilled slot values or pass to fulfillment.
        if (confirmationStatus === 'Confirmed') {
            // Remove confirmationContext from sessionAttributes so it does not confuse future requests
            delete sessionAttributes.confirmationContext;
            if (confirmationContext === 'AutoPopulate') {
                if (!account) {
                    callback(elicitSlot(sessionAttributes, intentRequest.currentIntent.name, intentRequest.currentIntent.slots, 'Account',
                    { contentType: 'PlainText', content: 'What is your account number?' }));
                    return;
                } else if (!dob) {
                    callback(elicitSlot(sessionAttributes, intentRequest.currentIntent.name, intentRequest.currentIntent.slots, 'DOB',
                    { contentType: 'PlainText', content: 'What is your date of birth? mm-dd-yyyy' }));
                    return;
                } else if (!lastFour) {
                      callback(elicitSlot(sessionAttributes, intentRequest.currentIntent.name, intentRequest.currentIntent.slots, 'LastFour',
                      { contentType: 'PlainText', content: 'What is the last four of your SSN?' }));
                      return;
                }
            }
            callback(delegate(sessionAttributes, intentRequest.currentIntent.slots));
            return;
        }
    }

    // Booking the car.  In a real application, this would likely involve a call to a backend service.
    console.log(`nextPayment at=${userinfo}`);
    delete sessionAttributes.currentUserInfo;
    sessionAttributes.lastConfirmedUserInfo = userinfo;
    callback(close(sessionAttributes, 'Fulfilled',
    { contentType: 'PlainText', content: 'Your next payment is due 5/15/2017.' }));
}



//------------------------------END TEST-------------------


 // --------------- Intents -----------------------

/**
 * Called when the user specifies an intent for this skill.
 */
function dispatch(intentRequest, callback) {
    console.log(`dispatch userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);

    const intentName = intentRequest.currentIntent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'LoanBalances') {
        return loanInfo(intentRequest, callback);
    }
    throw new Error(`Intent with name ${intentName} not supported. loanBalances.js calling`);
}







// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.bot.name=${event.bot.name}`);

        /**
         * Uncomment this if statement and populate with your Lex bot name and / or version as
         * a sanity check to prevent invoking this Lambda function from an undesired Lex bot or
         * bot version.
         */
        /*
        if (event.bot.name !== 'OrderFlowers') {
             callback('Invalid Bot Name');
        }
        */
        dispatch(event, (response) => callback(null, response));
    } catch (err) {
        callback(err);
    }
};
