// Content script

// Initialize variables for new window/tab and extracted Tweets
var tweetsWindow;
var extractedTweets = [];

// Start the extraction when the background script notifies that the Start Button was pressed
chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.action == "extractContent") {
        // Start the extraction
        setInterval(extractTweetsFromPage, 100);
        // Start the interval for sending the extracted tweets for the sentiment analysis
        setInterval(sendExtractedTweets, 2000);
    }
});

function extractTweetsFromPage() {
    // Initialize an array for storing new tweets
    const newTweets = [];
    
    // Extracting tweets when the user is in a thread
    if (document.querySelector('[aria-label="Timeline: Conversation"]')) {

        // Select all the tweets in the thread
        const threadElements = document.querySelectorAll('[data-testid="tweet"]');

        // Get the thread author from the URL
        const threadAuthor = '@' + document.querySelector('link[href^="https://twitter.com/"]').getAttribute('href').split("/")[3];

        // Extract the thread text from each element and store in the array of new tweets
        for (let i = 0; i < threadElements.length; i++) {

            // Select the tweet text element
            const threadTextElement = threadElements[i].querySelector('[data-testid="tweetText"]');
            
            // Skip to the next iteration if there is no tweet text or if the tweet is not visible in the viewport to ensure correct readings
            const tweetRect = threadElements[i].getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            if(!threadTextElement || !(tweetRect.top < viewportHeight && tweetRect.bottom > 0)) {
                continue;
            }
            
            // Get the text content from the tweet
            const threadText = threadTextElement.textContent;
            
            // Use substring to make sure we find the same tweet even when it is partially loaded on a Twitter page
            const threadTextSubstring = threadTextElement.textContent.substring(0, 200);
            
            // Iterate through extracted tweets to look for the partial match of the substring
            var included = false;
            for (var j = 0; j < extractedTweets.length; j++) {
                if (extractedTweets[j].includes(threadTextSubstring)) {
                    // Partial match found
                    // If the text content from the tweet is longer than the stored extracted tweet, it means we found the fully loaded tweet
                    if (threadText.length > extractedTweets[j].length) {
                        // Replace the extracted tweet with the fully loaded tweet
                        extractedTweets[j] = threadText;
                    }
                    included = true;
                    break;
                }
            }

            // Extract only tweets from the thread author to avoid noise in replies
            if (!included && threadElements[i].querySelector('[data-testid="User-Name"]').textContent.includes(threadAuthor)) {
                newTweets.push(threadText);
                extractedTweets.push(threadText);
            }
            
        }   
    }
    
    // Extracting tweets when the user is not in a thread
    else {
    
        // Select all tweet elements
        const tweetElements = document.querySelectorAll('[data-testid="tweet"]');

        // Iterate through all the tweets
        for (let i = 0; i < tweetElements.length; i++) {
            
            // Select the tweet text element
            const tweetTextElement = tweetElements[i].querySelector('[data-testid="tweetText"]');
            
            // Skip to the next iteration if there is no tweet text or if the tweet is not visible in the viewport to ensure correct readings
            const tweetRect = tweetElements[i].getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            if(!tweetTextElement || !(tweetRect.top < viewportHeight && tweetRect.bottom > 0)) {
                continue;
            }

            // Get the text content from the tweet
            const tweetText = tweetTextElement.textContent;
            
            // Use substring to make sure we find the same tweet even when it is partially loaded on a Twitter page
            const tweetTextSubstring = tweetTextElement.textContent.substring(0, 200);
            
            // Iterate through extracted tweets to look for the partial match of the substring
            var included = false;
            for (var j = 0; j < extractedTweets.length; j++) {
                if (extractedTweets[j].includes(tweetTextSubstring)) {
                    // Partial match found
                    // If the text content from the tweet is longer than the stored extracted tweet, it means we found the fully loaded tweet
                    if (tweetText.length > extractedTweets[j].length) {
                        // Replace the extracted tweet with the fully loaded tweet
                        extractedTweets[j] = tweetText;
                    }
                    included = true;
                    break;
                }
            }

            // Process tweets which have not been extracted
            if (!included) {

                // Extract text from tweets which are not threads and not in threads
                if (!tweetElements[i].textContent.includes('Show this thread') && !document.querySelector('[aria-label="Timeline: Conversation"]')) {
                    newTweets.push(tweetText);
                    extractedTweets.push(tweetText);
                }

                // Enter any visible tweet threads whenever the user is not in a thread
                if (tweetElements[i].textContent.includes('Show this thread') && !document.querySelector('[aria-label="Timeline: Conversation"]')) {
                    tweetElements[i].click();
                }

            }

        }
    }

    // If there is no existing tab, open a new one
    if (!tweetsWindow || tweetsWindow.closed) {
        tweetsWindow = window.open();
        tweetsWindow.document.write("<html><head><title>Tweets</title><style>body {background-color: #333; color: #f2f2f2; width: 50%; margin: 0 auto;} pre {border-bottom: 1px solid gray; white-space:pre-wrap;}</style></head><body>");
        // Add tweets to the new tab
        for (let i = 0; i < newTweets.length; i++) {
            tweetsWindow.document.body.insertAdjacentHTML('afterbegin', `<pre>${newTweets[i]}</pre>`);
        }
        tweetsWindow.document.write("</body></html>");
    } else {
        // If the tab already exists, append the new tweets to the existing content at the end of the body element
        for (let i = 0; i < newTweets.length; i++) {   
            tweetsWindow.document.body.insertAdjacentHTML('beforeend', `<pre>${newTweets[i]}</pre>`);
        }
    }
}

// Function to send the extracted tweets for the sentiment analysis to the background script
function sendExtractedTweets() {
    // Check if there are extracted tweets to send
    if (extractedTweets.length > 0) {
        // Send the tweets to the background script
        chrome.runtime.sendMessage({ action: 'getSentiment', tweets: extractedTweets });
    }
}
