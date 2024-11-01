# Tweetalytics Chrome Extension
#### Video Demo: [Watch the Demo](https://youtu.be/O18GFhuAfHw)
#### Description:
Hello! Welcome to the README for my Tweetalytics Chrome Extension project. In this document, I will provide an overview of the project, explain the purpose of each file, discuss any design choices I made, and offer some insights into my development process.

## Project Overview
The Tweetalytics Chrome Extension allows you to extract tweets related to a specific topic, perform simple sentiment analysis on those tweets, and gain insights into the sentiment surrounding the topic of interest.

I developed the extension in response to the recent exponential increase in prices for accessing the Twitter API, which has made it financially challenging for many small developers to obtain real-time data from Twitter. Additionally, Twitter's increasing restrictions on accessing the website's data have rendered various scraping tools unusable.

By creating this extension, I aim to provide a practical and compliant approach for users to analyze sentiment on Twitter, despite the recent restrictions on web scraping tools. It empowers users to gain valuable insights from Twitter data without violating Twitter's terms of service.

## File Structure
My project follows a specific file structure to organize its components effectively. Here's a breakdown of the main files and folders:

- **project:** This is the main folder of the project.
  - **js:** This folder contains the JavaScript files responsible for different functionalities.
    - **extractTweets.js:** Content script. This file handles the extraction of tweets from Twitter.
    - **background.js:** Background script. This file runs in the background and communicates with other components of the extension.
    - **popup.js:** This file controls the behavior of the extension's popup window. It handles sending a heartbeat message to the background script, modifies the UI based on the active tab, handles search form submissions, saves and loads filter presets, and displays sentiment analysis results.
  - **static:** This folder contains static files required for the extension.
    - **popup.css:** This file defines the styling for the popup window. It customizes the visual elements of the popup, including background color, text color, and formatting for various components.
    - **dictionary.json:** This JSON file contains a sentiment analysis dictionary.
    - **bootstrap.bundle.min.js:** This file provides additional JavaScript functionality using the Bootstrap framework.
    - **bootstrap.min.css:** This file contains the CSS styling for the extension.
  - **images:** This folder stores the icon image used for the extension.
  - **manifest.json:** This file contains the configuration details and metadata for the extension.
  - **popup.html:** This HTML file defines the structure and layout of the extension's popup window. It includes various elements such as search inputs, filter options, buttons, and sentiment analysis results display.

## Background Script
The `background.js` script is responsible for managing the extension's background operations and communication between different components.

The `background.js` script primarily performs the following tasks:

- **Managing the analyzedTabs array:** It handles the `analyzedTabs` array in the local storage, which keeps track of the tabs currently being analyzed by the extension.

- **Facilitating communication between the popup script and content script:** It acts as a mediator between the popup script and the content script.

- **Performing and managing sentiment analysis:** The background script is responsible for performing sentiment analysis on the extracted content. It uses a sentiment analysis dictionary and algorithms to calculate the sentiment result.

- **Loading the dictionary data and managing IndexedDB:** The background script loads the sentiment analysis dictionary data, which provides sentiment attributes for various words. It utilizes IndexedDB to efficiently store and retrieve the dictionary data for sentiment analysis.

The `background.js` script plays a crucial role in coordinating the different components of the extension and ensuring the seamless execution of background operations and communication.

## Content Script: extractTweets.js
The `extractTweets.js` script is a content script responsible for extracting tweets from the current active Twitter page. It detects whether the user is in a thread or not and extracts relevant tweets accordingly. The extracted tweets are then sent to the background script for further processing.

The script performs the following tasks:

- Listens for a message from the background script indicating that the tweet extraction should start.
- Initiates the extraction process by calling the `extractTweetsFromPage` function at regular intervals.
- Extracts tweets from the page, considering different scenarios such as threads and non-thread tweets.
- Handles partial loading of tweets and ensures correct readings by checking tweet visibility within the viewport.
- Opens a new window/tab to display the extracted tweets, or appends the new tweets to an existing tab.
- Periodically sends the extracted tweets to the background script for sentiment analysis.

## Derivation of `dictionary.json`
The `dictionary.json` file used in the project is derived from the Loughran-McDonald Master Dictionary, which can be found at [https://sraf.nd.edu/loughranmcdonald-master-dictionary/](https://sraf.nd.edu/loughranmcdonald-master-dictionary/). This dictionary provides sentiment analysis attributes for various words.

To simplify the sentiment analysis process and stay within the scope of the project, I adopted a dictionary-based approach. By utilizing the Loughran-McDonald Master Dictionary, the sentiment attributes, such as positive and negative scores, were assigned to each word in the `dictionary.json` file.

This choice allowed me to perform sentiment analysis without the need for complex machine learning models or natural language processing algorithms. While it may not capture the full complexity of sentiment analysis, it provides a practical and straightforward solution for this project.

To convert the provided CSV file of the dictionary into a JSON file, I utilized the following code:

```javascript
const fs = require('fs');
const csv = require('csv-parser');

const dictionary = {};

fs.createReadStream('dictionary.csv')
  .pipe(csv())
  .on('data', (row) => {
    const word = row.Word;
    dictionary[word] = {
      Negative: parseInt(row.Negative),
      Positive: parseInt(row.Positive)
    };
  })
  .on('end', () => {
    const jsonData = JSON.stringify(dictionary, null, 2);
    fs.writeFileSync('dictionary.json', jsonData);
    console.log('Dictionary saved as dictionary.json');
  });
```

This code reads the Loughran-McDonald `dictionary.csv` file using the `csv-parser` library, and for each row, it extracts the "Negative" and "Positive" attributes and creates an entry in the `dictionary` object. Finally, it converts the `dictionary` object into a JSON string and saves it as `dictionary.json`.

By performing this conversion, I transformed the original Loughran-McDonald Master Dictionary CSV file into a JSON file that contains the necessary sentiment analysis attributes for my Chrome extension. JSON is natively supported by JavaScript, the language used for the Chrome extension. By converting the dictionary to JSON, it is easy to parse and manipulate the data within the code without the need for additional parsing libraries.

## Design Choices
When developing my Chrome extension, I focused on making it easy to use and providing valuable insights for users. Here are some important design decisions I made:

1. **Sentiment Analysis**: I added a feature that analyzes the sentiment of tweets related to a specific topic on Twitter. This helps users understand the overall public opinion and sentiment surrounding that topic. By evaluating the sentiment of extracted tweets, users can quickly get a sense of how people feel about the subject. The sentiment analysis results are categorized into five possible results, represented by corresponding emojis:

   - 😁 - Strongly Positive
   - 🙂 - Moderately Positive
   - 😐 - Neutral
   - 😔 - Moderately Negative
   - 😭 - Strongly Negative

   These emojis serve as visual indicators of the sentiment expressed in the tweets, allowing users to quickly grasp the overall sentiment surrounding a specific topic.

2. **Filter Presets**: To make the extension more user-friendly, I included filter presets that allow users to apply predefined filters to their Twitter searches. This simplifies the process of customizing search parameters and saves users time by providing convenient options to refine their search results.

3. **Processing Tweets**: The extension's popup window includes a dedicated section called "Process Tweets." It contains a button labeled "Start" that initiates the extraction of tweets from the currently active Twitter tab. When clicked, the button triggers the semi-automatic extraction of tweets and automatic sentiment analysis. The sentiment analysis result is then displayed in a designated area of the popup window.

These design choices were made to create an extension that is intuitive, powerful, and visually appealing. By incorporating these features, I aimed to enhance the overall user experience, making it easier for users to gain insights from Twitter and understand public sentiment on various topics.

## Development Process
Throughout the development process, I took an iterative approach, constantly testing and improving the code to make sure it worked reliably and performed well. I used JavaScript, HTML, and CSS to build the extension and made the most of Chrome's extension APIs to seamlessly integrate it with the browser.

Testing played a crucial role in ensuring the extension's functionality. I conducted thorough tests by checking the individual components through unit testing. I also performed integration testing to ensure that different parts of the extension worked well together. To make sure the extension provided a smooth user experience, I ran real-world usage scenarios and analyzed the results.

By following this development process, I aimed to create a high-quality extension that users can rely on, delivering a seamless and enjoyable experience while using it.

## Conclusion
I hope this README provides you with a comprehensive understanding of my Tweetalytics Chrome Extension project.

Thank you,

Ivan Dolcic
