document.addEventListener('DOMContentLoaded', function() {
    
    // Send a heartbeat message to the background script periodically as long as the popup is open
    function sendHeartbeat() {
        chrome.runtime.sendMessage({ type: 'heartbeatPopup' });
    }
    const heartbeatInterval = setInterval(sendHeartbeat, 2000);
    // Stop sending heartbeat just before the popup is closed
    window.addEventListener('beforeunload', function() {
        clearInterval(heartbeatInterval);
    });
    
    // Modify the UI based on the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
            var activeTabId = tabs[0].id;

            // Retrieve the analyzedTabs array from local storage
            chrome.storage.local.get('analyzedTabs', function(result) {
                var analyzedTabs = result.analyzedTabs;
                if (analyzedTabs) {

                    // Check if the active tab is in the analyzedTabs array
                    if (analyzedTabs.includes(activeTabId)) {
                        // The active tab is being analyzed, disable the extract button and indicate analysis in progress
                        document.getElementById('extractTweets').disabled = true;
                        document.getElementById('extractTweets').textContent = 'Analysis in Progress...';
                        document.getElementById("sentimentResult").textContent = "...";
                    }
                }
            });
        }
    });


    // Add event listener to select all content when the input field is clicked
    document.getElementById('date-filter').addEventListener('click', function() {
        this.select();
    });

    // Search form event listener variables
    var searchForm = document.getElementById('search-form');
    var followFilter = document.getElementById('follow-filter');
    var latestFilter = document.getElementById('latest-filter');
    var dateFilter = document.getElementById('date-filter');
    var authorFilter = document.getElementById('author-filter');
    
    // Listen to when the user submits the search query
    searchForm.addEventListener('submit', function(event) {
        // Prevent default search form submission
        event.preventDefault();
        // Get the search query from the search form
        var searchQuery = document.getElementById('search-query').value;
        
        // Get the author filter value
        var authorFilterValue = authorFilter.value;
        // Remove "@" symbol from account names
        var accountNames = authorFilterValue.split(' ').map(function(author) {
            return author.replace('@', '');
        });
        // Format the account names to match the required format in the Twitter search URL
        var formattedAuthorFilterValue = accountNames.map(function(author) {
            return 'from%3A' + encodeURIComponent(author);
        }).join('%20OR%20');

        // Calculate start and end dates for the search based on the date filter
        var startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateFilter.value));
        var endDate = new Date();
        
        // Concatenate Twitter search URL with dates, search query, and author filter
        var searchUrl = 'https://twitter.com/search?q=' + encodeURIComponent(searchQuery) +
            '%20since%3A' + formatDate(startDate) +
            '%20until%3A' + formatDate(endDate) +
            '%20(' + formattedAuthorFilterValue + ')' +
            '&src=typed_query';
        
        // Search only people the user follows if the filter is selected
        if (followFilter.checked) {
            searchUrl += '&pf=on';
        }
        
        // Sort by latest tweets first if the filter is selected
        if (latestFilter.checked) {
            searchUrl += '&f=live';
        }
        
        // Open Twitter search URL in a new tab
        chrome.tabs.create({ url: searchUrl });
        
    });

    
    // Helper function to format a date as yyyy-mm-dd
    function formatDate(date) {
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        var day = date.getDate();
        return year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day);
    }
    
    // Handling saving and loading of filter presets
    
    // Save filters button event listener
    document.getElementById('save-filters-button').addEventListener('click', saveFilters);
    
    // Delete filters button event listener
    document.getElementById('delete-filters-button').addEventListener('click', deleteFilters);

    // Populate filter presets dropdown menu
    populateFilterPresets();
    
    // Add an event listener to the filter presets dropdown for loading a preset by clicking it
    document.getElementById('filter-presets').addEventListener('click', function () {
        var selectedPresetName = document.getElementById('filter-presets').value;
        // If the selected preset is the same as the previously selected preset, load the filters
        if (selectedPresetName === selectedPresetName) {
            loadFilters();
        }
    });

    // Save the selected filters with a custom name
    function saveFilters() {
        var presetName = prompt('Enter a name for the saved filters:');
        if (presetName) {
            
            var savedPresets = JSON.parse(localStorage.getItem('filterPresets')) || {};

            // Check if the preset name already exists
            if (savedPresets.hasOwnProperty(presetName)) {
                var overwriteConfirmation = confirm('A filter preset with the name "' + presetName + '" already exists. Do you want to overwrite it?');
                if (!overwriteConfirmation) {
                    return; // Cancel saving the filters
                }
            }

            var filters = {
                searchQuery: document.getElementById('search-query').value,
                authorFilterValue: document.getElementById('author-filter').value,
                followFilterValue: followFilter.checked,
                latestFilterValue: latestFilter.checked,
                dateFilterValue: dateFilter.value
            };

            var savedPresets = JSON.parse(localStorage.getItem('filterPresets')) || {};
            savedPresets[presetName] = filters;
            localStorage.setItem('filterPresets', JSON.stringify(savedPresets));

            console.log('Filter preset saved successfully:', presetName);

            // Re-populate filter presets dropdown menu
            populateFilterPresets();
        }
    }

    // Load a saved filter preset
    function loadFilters() {
        // Get the selected preset name and saved presets from local storage
        var selectedPresetName = document.getElementById('filter-presets').value;
        var savedPresets = JSON.parse(localStorage.getItem('filterPresets'));

        // If the selected preset name or saved presets are invalid, log an error message and return
        if (!selectedPresetName || !savedPresets || !savedPresets[selectedPresetName]) {
            console.log('Invalid filter preset selected.');
            return;
        }

        // Get the filters from the selected preset and set the corresponding form values
        var filters = savedPresets[selectedPresetName];
        document.getElementById('search-query').value = filters.searchQuery;
        document.getElementById('author-filter').value = filters.authorFilterValue;
        followFilter.checked = filters.followFilterValue;
        latestFilter.checked = filters.latestFilterValue;
        dateFilter.value = filters.dateFilterValue;

        // Log a success message with the selected preset name
        console.log('Filter preset loaded successfully:', selectedPresetName);
    }
    
    // Delete the selected filter preset
    function deleteFilters() {
        var selectedPresetName = document.getElementById('filter-presets').value;
        var savedPresets = JSON.parse(localStorage.getItem('filterPresets'));

        if (!selectedPresetName || !savedPresets || !savedPresets[selectedPresetName]) {
            console.log('Invalid filter preset selected.');
            return;
        }

        var confirmation = confirm('Delete the "' + selectedPresetName + '" filter preset forever?');

        if (confirmation) {
            delete savedPresets[selectedPresetName];
            localStorage.setItem('filterPresets', JSON.stringify(savedPresets));

            console.log('Filter preset deleted successfully:', selectedPresetName);

            // Re-populate filter presets dropdown menu
            populateFilterPresets();
        }
    }

    // Populate filter presets dropdown menu
    function populateFilterPresets() {
        var filterPresetsDropdown = document.getElementById('filter-presets');
        filterPresetsDropdown.innerHTML = '';

        var savedPresets = JSON.parse(localStorage.getItem('filterPresets'));
        
        // Add a placeholder text
        var placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.text = 'Load';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        filterPresetsDropdown.appendChild(placeholderOption);

        if (savedPresets) {
            // Add the saved presets to the dropdown menu
            for (var presetName in savedPresets) {
                var option = document.createElement('option');
                option.value = presetName;
                option.text = presetName;
                filterPresetsDropdown.appendChild(option);
            }
        }
    }

    // Other buttons and sentiment analysis results
    
    // Send message to the background script when the user presses the Start button
    document.getElementById("extractTweets").addEventListener("click", function() {
        // Check if the active tab is a Twitter tab
        chrome.tabs.query({ active: true, currentWindow: true, url: "*://twitter.com/*" }, function(tabs) {
            if (tabs.length > 0) {
                // The active tab is a Twitter tab, send the extract message
                chrome.runtime.sendMessage({ action: "extract" });

                // Change the UI to indicate that the analysis is in progress
                document.getElementById('extractTweets').disabled = true;
                document.getElementById('extractTweets').textContent = 'Analysis in Progress...';
                document.getElementById("sentimentResult").textContent = "...";
            }
            else {
                document.getElementById("sentimentResult").style.fontSize = "16px";
                document.getElementById("sentimentResult").textContent = "Please go to a Twitter tab to start the analysis.";
            }
        });
    });

    
    // Receive sentiment result from the background script
    chrome.runtime.onMessage.addListener(function(request) {
        if (request.action === "sentimentResult") {
            const sentimentResult = request.sentiment;
            
            // Update the UI with the sentiment result for the currently active tab
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs.length > 0) {
                    var activeTabId = tabs[0].id;
                    // Display the sentiment only in the tabs where the sentiment has been calculated
                    if (activeTabId in sentimentResult) {
                        // Display the sentiment in the HTML element
                        const sentimentResultElement = document.getElementById("sentimentResult");
                        if (sentimentResult[activeTabId] > 40) {
                            sentimentResultElement.textContent = "😁"; // Strongly Positive
                            sentimentResultElement.title = "Strongly Positive";
                        } else if (sentimentResult[activeTabId] > 10) {
                            sentimentResultElement.textContent = "🙂"; // Moderately Positive
                            sentimentResultElement.title = "Moderately Positive";
                        } else if (sentimentResult[activeTabId] < -40) {
                            sentimentResultElement.textContent = "😭"; // Strongly Negative
                            sentimentResultElement.title = "Strongly Negative";
                        } else if (sentimentResult[activeTabId] < -10) {
                            sentimentResultElement.textContent = "😔"; // Moderately Negative
                            sentimentResultElement.title = "Moderately Negative";
                        } else {
                            sentimentResultElement.textContent = "😐"; // Neutral
                            sentimentResultElement.title = "Neutral";
                        }
                    }
                }
            });
        }
    });
});
