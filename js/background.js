// Clear analyzedTabs array on extension startup or update
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.remove('analyzedTabs', function() {
        console.log('analyzedTabs array cleared');
    });
});

// Clear analyzedTabs array on browser startup
chrome.runtime.onStartup.addListener(function() {
    chrome.storage.local.remove('analyzedTabs', function() {
        console.log('analyzedTabs array cleared on browser startup');
    });
});

// Send the message to the content script of the active tab when the popup script notifies that Start Button was clicked
chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.action == "extract") {
        var activeTabId;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            activeTabId = tabs[0].id;
            chrome.tabs.sendMessage(activeTabId, {action: "extractContent"});
        });
        
        // Retrieve the analyzedTabs array from local storage or initialize it if it doesn't exist
        chrome.storage.local.get('analyzedTabs', function(result) {
            var analyzedTabs = result.analyzedTabs || [];

            // Add the active tab ID to the analyzedTabs array
            analyzedTabs.push(activeTabId);

            // Save the modified array back to local storage
            chrome.storage.local.set({ analyzedTabs: analyzedTabs }, function() {
                console.log('Added to analyzedTabs array in local storage');
            });
        });
    }
});

// Listen for tab closure to remove closed analyzed tabs from the local storage 
chrome.tabs.onRemoved.addListener(function(tabId) {
    chrome.storage.local.get('analyzedTabs', function(result) {
        var analyzedTabs = result.analyzedTabs;
        if (analyzedTabs) {
            // Remove the tab ID from the analyzedTabs array if it exists in the array
            const index = analyzedTabs.indexOf(tabId);
            if (index > -1) {
                analyzedTabs.splice(index, 1);
                console.log('Removed from analyzedTabs array in local storage');
                // Save the modified analyzedTabs array to local storage
                chrome.storage.local.set({ analyzedTabs: analyzedTabs }, function() {
                    console.log('Saved analyzedTabs array in local storage');
                });
            }
        }
    });
});
    
    
    

// Initialize an object to store sentiment results for each tab
var tabSentiments = {};
// Object to track if sentiment analysis is in progress for each tab
var sentimentAnalysisInProgress = {};

// Perform sentiment analysis when the extractedTweets list is received from the content script
chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.action == "getSentiment") {
        
        // Do not start a new sentiment analysis if the previous one has not finished
        if (sentimentAnalysisInProgress[sender.tab.id]) {
            console.log("Sentiment analysis is already in progress for tab", sender.tab.id + ". Ignoring the request.");
            return;
        }

        // Set the flag to indicate that sentiment analysis is in progress for this tab
        sentimentAnalysisInProgress[sender.tab.id] = true;

        // Receive the extracted tweets from the content script
        var extractedTweets = request.tweets;
        //console.log("Extracted tweets: ", sender.tab.id, ": ", extractedTweets);
        
        // Perform sentiment analysis on the extracted tweets and store the result
        sentimentAnalysis(extractedTweets)
            .then(function(sentimentResult) {
                console.log("Sentiment ", sender.tab.id, ": ", sentimentResult);

                // Store the sentiment result for the corresponding tab
                tabSentiments[sender.tab.id] = sentimentResult;

                // Reset the flag to indicate that sentiment analysis is complete for this tab
                sentimentAnalysisInProgress[sender.tab.id] = false;
                
            })
            .catch(function(error) {
                console.error("Error in sentiment analysis:", error);

                // Reset the flag to indicate that sentiment analysis is complete for this tab
                sentimentAnalysisInProgress[sender.tab.id] = false;
            });
    }
});

// Listen for heartbeat messages from the popup script
chrome.runtime.onMessage.addListener(function(message, sender) {
    // If the popup has a heartbeat (is open), we can send the results to the popup
    if (message.type === 'heartbeatPopup') {
        // Check if any sentiment results exist
        if (Object.keys(tabSentiments).length > 0) {
            // Send the sentiment result to the popup script
            chrome.runtime.sendMessage({ action: 'sentimentResult', sentiment: tabSentiments });
        }
        console.log('Heartbeat received');
    }
});

// Load the dictionary to the DB on startup
chrome.runtime.onInstalled.addListener(async () => {
    await loadData();
});

const dbName = 'wordsDB';
const storeName = 'words';

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore(storeName, { keyPath: 'word' });
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function deleteDB() {
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);

        deleteRequest.onerror = function(event) {
            console.error('Error deleting IndexedDB:', event);
            reject(event);
        };

        deleteRequest.onsuccess = function(event) {
            console.log('Old database deleted successfully.');
            resolve();
        };
    });
}

async function fetchJsonData() {
    const jsonUrl = chrome.runtime.getURL('static/dictionary.json');
    const response = await fetch(jsonUrl);
    const jsonData = await response.json();
    return jsonData;
}

async function loadData() {
    await deleteDB();
    const json = await fetchJsonData();
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    for (const word in json) {
        store.put({ ...json[word], word });
    }

    transaction.oncomplete = () => {
        console.log('Data loaded successfully');
    };

    transaction.onerror = () => {
        console.error('Error loading data');
    };
}


// Search for a word in the DB
async function searchWord(word) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.get(word.toUpperCase());

        request.onsuccess = (event) => {
            if (event.target.result) {
                resolve({
                    Positive: event.target.result.Positive,
                    Negative: event.target.result.Negative,
                });
            } else {
                resolve(null);
            }
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

async function sentimentAnalysis(extractedTweets) {

    // Combine all the extracted tweets into a single string
    const combinedText = extractedTweets.join(' ');

    // Split the combined text into words
    const words = combinedText.match(/\b\w+\b/g);
    //console.log(words);

    let positiveCount = 0;
    let negativeCount = 0;

    if (words) { // Check if words is not null or undefined
        for (const word of words) {
            const result = await searchWord(word);
            if (result) {
                positiveCount += result.Positive;
                negativeCount += result.Negative;
            }
        }
    }

    // Calculate the sentiment score based on the number of positive and negative words found
    // If words is null, then sentiment is zero
    const sentimentScore = words ? (positiveCount - negativeCount) / words.length : 0;

    return sentimentScore;
}
