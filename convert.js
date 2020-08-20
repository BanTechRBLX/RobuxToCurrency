// Current DevEx rate:
const ROBUX_PER_DOLLAR = 1.0 / 0.0035;

// First rate:   1 / 0.0025 = 400 ROBUX per 1 USD
// Current rate: 1 / 0.0035 = 285.714... ROBUX per 1 USD

let currencySelected = "dollars";
let dollarsToPounds = 1;

let observeDOM = (() => {

    let MutationObserver = window.MutationObserver || window.WebkitMutationObserver;
    let eventListenerSupported = window.addEventListener;

    return (obj, callback) => {
        if (MutationObserver) {
            let obs = new MutationObserver(function(mutations, observer) {
                if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {
                    callback(mutations, observer);
                }
            });
            obs.observe(obj, {childList: true});
        } else if (eventListenerSupported) {
            obj.addEventListener("DOMNodeInserted", callback, false);
            obj.addEventListener("DOMNodeRemoved", callback, false);
        }
    };

})();

let observeClass = (() => {

    let MutationObserver = window.MutationObserver || window.WebkitMutationObserver;
    let eventListenerSupported = window.addEventListener;

    return (obj, callback) => {
        if (MutationObserver) {
            let obs = new MutationObserver(function(mutations, observer) {
                if (mutations[0].attributeName == "class") {
                    callback(mutations, observer);
                }
            });
            obs.observe(obj, {attributes: true});
        } else if (eventListenerSupported) {
            obj.addEventListener("DOMAttrModified", callback, false);
        }
    };

})();


function pad(strNum) {
    let decimalPoint = strNum.lastIndexOf(".");
    if (decimalPoint == -1) {
        strNum += ".00";
    } else {
        let decimal = strNum.substring(decimalPoint + 1);
        if (decimal.length == 1) {
            strNum += "0";
        } else if (decimal.length > 2) {
            strNum = strNum.substring(0, decimalPoint + 3);
        }
    }
    return strNum;
}


function robuxToCurrency(robux) {
    let currency = robux / ROBUX_PER_DOLLAR;
    let symbol = "$";
    if (currencySelected == "pounds") {
        currency = currency * dollarsToPounds;
        symbol = "&pound;";
    }
    return (symbol + pad(currency.toLocaleString()));
}

// Quick-and-dirty:
function getIntegerFromString(str) {
    let multiplier = 1;
    let intVal;
    str = str.trim();
    if (str.length > 2) {
        let tag = str.substring(str.length - 2);
        if (tag == "M+") { // Million
            multiplier = 1000000;
        } else if (tag == "B+") { // Billion
            multiplier = 1000000000;
        }
    }
    intVal = parseInt(str.replace(/[\D]/g, ""));
    if (intVal) {
        intVal *= multiplier;
    }
    return intVal;
}


// Specifically for text classes:
function appendCurrency(item, robux) {
    if (!isNaN(robux)) {
        let dollars = robuxToCurrency(robux);
        item.innerHTML += " (" + dollars + ")";
    }
}

// Add currency to the provided class
function processElementClass(className) {
    let rsTextItems = document.getElementsByClassName(className);
    for (let i = 0; i < rsTextItems.length; i++) {
        let item = rsTextItems[i];
        let symbolIndex = item.innerHTML.indexOf("(");
        // Strip any existing currency text (important for switching currency)
        if (symbolIndex > 0) item.innerHTML = item.innerHTML.substr(0, symbolIndex - 1);
        let robux = getIntegerFromString(item.innerHTML);
        appendCurrency(item, robux);
    }
}

// Add currency to the navigation Robux popup
function processNavBalance(rsItem) {
    let symbolIndex = rsItem.innerHTML.indexOf("<br>");
    // Strip any existing currency text (important for switching currency)
    if (symbolIndex > 0) rsItem.innerHTML = rsItem.innerHTML.substr(0, symbolIndex);
    let robux = getIntegerFromString(rsItem.innerHTML);
    let currency = robuxToCurrency(robux);
    rsItem.innerHTML += ("<br>" + currency + " " + (currencySelected == "pounds" ? "GBP" : "USD"));
}

// Set up conversion for known Robux elements throughout the current page
function setup(response) {
    if (response.currency) currencySelected = response.currency;
    if (response.conversion_rate) dollarsToPounds = response.conversion_rate;
    
    let rsItem = document.getElementById("nav-robux-balance");
    if (rsItem) processNavBalance(rsItem);
    // Find ROBUX Text elements on the page and append conversions to them:
    processElementClass("robux");
    processElementClass("text-robux");
    processElementClass("robux-text");
    processElementClass("amount-value");
    processElementClass("money");
    processElementClass("Credit");
}

// Check for when transactions are loaded either by selecting the tab for the first time or "Load More..."
let myMoneyPage = document.getElementById("MyTransactions_tab");
if (myMoneyPage) {
    observeClass(myMoneyPage, (mutations, observer) => {
        let transactions = document.getElementsByClassName("TransactionsContainer");
        if (transactions.length > 0) {
            observeDOM(transactions[0].firstElementChild.firstElementChild, (mutations, observer) => {
                setup();
            });
        }
    });
}

// Check for when Summary is changed, when selecting a new period (e.g. Last Year, Last Day, ...)
let tabsContainer = document.getElementById("Summary_tab");
if (tabsContainer) {
    observeDOM(tabsContainer, (mutations, observer) => {
        setup();
    });
}

// Check for when the Robux purchase popup is created (when clicking your Robux)
let navItem = document.getElementById("rbx-body");
if (navItem) {
    observeDOM(navItem, (mutations, observer) => {
        let rsItem = document.getElementById("nav-robux-balance");
        if (rsItem) processNavBalance(rsItem);
    });
}

// Listen for browser action refresh (see background.js)
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        if (message.text === "refresh_conversion") {
            // Refresh the conversions
            chrome.runtime.sendMessage({text: "setup"}, setup);
        }
    }
);

// Set up for first time
chrome.runtime.sendMessage({text: "setup"}, setup);