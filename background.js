// Disable the icon action for pages by default
chrome.browserAction.disable();

// Currently selected currency and conversion rate
let currencySelected = "dollars";
let dollarsToPounds = 1;

// Get the stored currency selection
chrome.storage.local.get(["currency"], function(result) {
    currencySelected = result.currency ? result.currency : "dollars";

    let icon = currencySelected == "pounds" ? "icon_pound.png" : "icon_dollar.png";
    chrome.browserAction.setIcon({"path": icon});

    chrome.storage.local.get(["dollars_to_pounds"], function(result) {
        if (result.dollars_to_pounds) dollarsToPounds = result.dollars_to_pounds;
    });

    // Get the last time the conversion API was called
    chrome.storage.local.get(["conversion_saved_time"], function(result) {
        // If it's never been called, or was more than 10 mins ago, fetch it
        if (!result.conversion_saved_time || (new Date).getTime() - result.conversion_saved_time > 600000) {
            fetch("https://api.exchangeratesapi.io/latest").then(r => r.json()).then(result => {
                // Store the USD to GBP conversion
                dollarsToPounds = result.rates.GBP / result.rates.USD;
                chrome.storage.local.set({"dollars_to_pounds": dollarsToPounds, "conversion_saved_time": (new Date).getTime()});
            });
        }
    });
});

// Function to update the icon and tooltip
function updateIconAndTooltip(tabId) {
    // Determine new title and icon
    let title = "Click to swap to " + (currencySelected == "pounds" ? "USD" : "GBP");

    chrome.browserAction.enable(tabId);
    chrome.browserAction.setTitle({"tabId": tabId, "title": title});
}

// Listen for the setup message to change the icon and tooltip for the current tab
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.text == "setup") {
        updateIconAndTooltip(sender.tab.id);
        // Respond with the currency selected
        if (sendResponse) {
            sendResponse({"currency": currencySelected, "conversion_rate": dollarsToPounds});
        }
    }
});

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function() {
    currencySelected = currencySelected == "pounds" ? "dollars" : "pounds";
    chrome.storage.local.set({"currency": currencySelected}, function() {
    
        let icon = currencySelected == "pounds" ? "icon_pound.png" : "icon_dollar.png";
        chrome.browserAction.setIcon({"path": icon});

        // Send a message to all tabs and update tooltip and icon
        chrome.tabs.query({}, function(tabs) {
            for (let index = 0; index < tabs.length; index++) {
                chrome.tabs.sendMessage(tabs[index].id, {"text": "refresh_conversion"});
            }
        });
    });
});