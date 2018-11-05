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


 // --------------- Helpers to build responses which match the structure of the necessary dialog actions -----------------------

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

function validateLoanModifications(loanServices, accounts) {
    const loanService = ['pay off Loan', 'Rehabilitation', 'defer Payments', 'Consolidation'];
    const account = ['111111111', '222222222', '333333333', '444444444'];
    if (loanService && loanServices.indexOf(loanService) === -1) {
        return buildValidationResult(false, 'LoanServices', `We do not have ${loanService}, would you like a different type of service?  Our most popular service is Loan Rehabilitation`);
    }
    if (account && accounts.indexOf(account) === -1) {
        return buildValidationResult(false, 'Accounts', `We do not recognize ${account} as an account number, this is a test, so you can use all 1's, 2's or 3's`);
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
function loanModifications(intentRequest, callback) {
    const loanService = intentRequest.currentIntent.slots.LoanServices;
    const account = intentRequest.currentIntent.slots.Accounts;
    const source = intentRequest.invocationSource;

    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots.  Use the elicitSlot dialog action to re-prompt for the first violation detected.
        const slots = intentRequest.currentIntent.slots;
        const validationResult = validateLoanModifications(loanService, account);
        if (!validationResult.isValid) {
            slots[`${validationResult.violatedSlot}`] = null;
            callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
              console.log(`dispatch userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}, slotName=${slots}`);
            return;
        }

        // Pass the price of the flowers back through session attributes to be used in various prompts defined on the bot model.
        const outputSessionAttributes = intentRequest.sessionAttributes;
        if (loanService) {
            outputSessionAttributes.Price = loanService.length * 5; // Elegant pricing model, this is a test to see where the attributes are stored
        }
        callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
        return;
    }

    // Order the flowers, and rely on the goodbye message of the bot to define the message to the end user.  In a real bot, this would likely involve a call to a backend service.
    callback(close(intentRequest.sessionAttributes, 'Fulfilled',
    { contentType: 'PlainText', content: `Thanks, your interest in ${loanService} has been entered for account ${account} and we will be sending you documents to start the process. Lamda message` }));
}

 // --------------- Intents -----------------------

/**
 * Called when the user specifies an intent for this skill.
 */
function dispatch(intentRequest, callback) {
    console.log(`dispatch userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}, LoanService=${intentRequest.currentIntent.slots.LoanServices.name}, Account=${intentRequest.currentIntent.slots.Accounts}`);

    const intentName = intentRequest.currentIntent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'LoanModifications') {
        return loanModifications(intentRequest, callback);
    }
    throw new Error(`Intent with name ${intentName} not supported. loanModifications.js calling`);
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
