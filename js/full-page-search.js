const resultContainer = document.getElementById("better-search-results");
const paginationContainer = document.getElementById("pagination"); // Add a container for pagination in your HTML
const nonce = aiSearch.nonce;
const apiUrl = aiSearch.api_url;
const apiKey = aiSearch.api_key;
const search_type = aiSearch.search_type;

// Get search query from URL
const queryString = new URLSearchParams(window.location.search);
const query = queryString.get("s") || queryString.get("q"); // Handle different query params

let currentPage = 1; // Track the current page
const limit = 20; // Number of results per page
let totalPages = 1; // Track the total number of pages (initially 1)

console.log("Query URL se mili? --->>>", query);

// Function to fetch results for a specific page
function fetchResults(page) {
    const offset = (page - 1) * limit; // Calculate offset based on the page number

    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
        },
        body: JSON.stringify({
            Query: query,
            SearchType: search_type,
            Filter: "",
            Offset: offset,
            Limit: limit,
            nonce: nonce,
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status !== 'success') {
            $('#better-search-results').html(`<div class="error">${data.message}</div>`).show();
            return;
        }

        // Clear previous results
        resultContainer.innerHTML = '';

        // Display new results
        let html = '';
        if (!_.isEmpty(data.data)) {
            _.forEach(data.data, (searchResult) => {
                const thumbnail = getThumbnail(searchResult.thumbnail_url);
                html += `
                <a href="${searchResult.url}" target="_blank">
                <div class="ai-search-suggestions">
                    <div>
                            <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
                    </div>
                        <div class="search-title">
                        <p class="asset-type" data-type="${searchResult.asset_type}">${searchResult.asset_type}</p>
                           <h5> ${searchResult.title}</h5>  
                           </div>
                           </div>
                           </a>
                           `;
            });
        } else {
            html = '<div class="ai-search-suggestions">No results found.</div>';
        }

        resultContainer.innerHTML = html;

        // Update total pages based on the number of results
        if (data.data.length < limit) {
            totalPages = page; // No more results after this page
        } else {
            totalPages = page + 1; // Assume there might be more results
        }

        // Update pagination UI
        updatePaginationUI(page);
    })
    .catch((error) => {
        if (error.message.includes("404")) {
            error.message = 'Requested resource not found! Please try again!';
        } else if (error.message.includes("400")) {
            error.message = 'Bad request. Please check the request parameters.';
        } else if (error.message.includes("500")) {
            error.message = 'Internal server error. Please try again later.';
        } else if (error.message.includes("405")) {
            error.message = 'Method not allowed. Please check the API endpoint.';
        } else if (error.name === 'AbortError') {
            error.message = 'Request timed out. Please try again later.';
        } else if (error.message.includes('CORS')) {
            error.message = 'CORS error: The request has been blocked. No "Access-Control-Allow-Origin" header found.';
        } else if (error.message === 'Failed to fetch') {
            error.message = 'API Key/ API URL is not Correct';
        }
        resultContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
        resultContainer.style.display = 'block';  // Ensure the container is visible
    });
}

// Function to update the pagination UI (with input box)
function updatePaginationUI() {
    paginationContainer.innerHTML = `
        <button class="pagination-button" onclick="goToPage(currentPage - 1)" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
        <span class="pageInputText">Page</span><input type="number" id="pageInput" value="${currentPage}" min="1" onkeypress="handlePageInput(event)" />
        <button class="pagination-button" onclick="goToPage(currentPage + 1)">Next</button>
    `;
}

// Function to handle input box enter key press
function handlePageInput(event) {
    if (event.key === "Enter") {
        let page = parseInt(event.target.value);
        if (page >= 1) { // Ensure valid page number
            goToPage(page);
        }
    }
}

// Function to navigate to a specific page
function goToPage(page) {
    if (page < 1) return; // Prevent invalid pages
    currentPage = page;
    fetchResults(currentPage);
}


// Function to get thumbnail URL
function getThumbnail(thumbnail_url) {
    return thumbnail_url === "" || !thumbnail_url
        ? `${aiSearch.plugin_url}assets/images/default-thumbnail.png`
        : thumbnail_url;
}

// Initial fetch for the first page
fetchResults(currentPage);






















    // const resultContainer = document.getElementById("better-search-results");
    // const nonce = aiSearch.nonce;
    // // const searchLimit = aiSearch.search_limit;
    // // const searchDelay = aiSearch.search_delay;
    // const apiUrl = aiSearch.api_url;
    // const apiKey = aiSearch.api_key;
    // const search_type = aiSearch.search_type;

    // // Get search query from URL
    // const queryString = new URLSearchParams(window.location.search);
    // const query = queryString.get("s") || queryString.get("q"); // Handle different query params

    // console.log("Query URL se mili? --->>>", query);

    // // if (!query) {
    // //     resultContainer.innerHTML = `<p>No search query found.</p>`;
    // //     return;
    // // }

    // fetch(apiUrl, {
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/json",
    //         "x-api-key": apiKey,
    //     },
    //     body: JSON.stringify({
    //         Query: query,
    //         SearchType: search_type,
    //         Filter: "",
    //         Offset: 0,
    //         Limit: 20,
    //         nonce: nonce,
    //     }),
    // })
    // .then(response => response.json()) // ✅ Ye async hai, isko properly handle karna zaroori hai
    // .then(data => {
    //     // console.log("API Response:", data);
        
    //     if (data.status !== 'success') {
    //         $('#better-search-results').html(`<div class="error">${data.message}</div>`).show();
    //         return;
    //     }

    //     // resultContainer.style.display = 'block';
    //     const results = {
    //         searchResults: [],
    //     };
    //     // Categorize remaining results based on asset type
    //     data.data.forEach((item) => {
    //         // console.log ("Items Are there: ", item.asset_type);
    //         // console.log ("Items Are there: ", item.title);
    //         results.searchResults.push(item);
    //     });
        
    //     console.log("Data yeh ha", results);


    //     let html = '';
    //     if (!_.isEmpty(results.searchResults)) {
    //         // html += `<div >
    //         //                 <div >
    //         //                     <div class="category-title">Features </div>
    //         //                 </div>
    //         //         </div>`;
    //         _.forEach(results.searchResults, (searchResult) => {
    //             const thumbnail = getThumbnail(searchResult.thumbnail_url);
    //             html += `
    //             <a href="${searchResult.url}" target="_blank">
    //             <div class="ai-search-suggestions">
    //                 <div>
    //                         <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
    //                 </div>
    //                     <div class="search-title">
    //                     <p class="asset-type" data-type="${searchResult.asset_type}">${searchResult.asset_type}</p>
    //                        <h5> ${searchResult.title}</h5>  
    //                        </div>
    //                        </div>
    //                        </a>
    //                        `;
    //         });
    //     }

    //     if (_.isEmpty(html)) {
    //         html = '<div class="ai-search-suggestions">No results found.</div>';
    //     }

    //     resultContainer.innerHTML = html;


    //     // if (data.results && data.results.length > 0) {
    //     //     resultContainer.innerHTML = data.results.map(item => `
    //     //         <div class="search-result-item">
    //     //             <h3>${item.title}</h3>
    //     //             <p>${item.description}</p>
    //     //         </div>
    //     //     `).join(""); 
    //     // } else {
    //     //     resultContainer.innerHTML = `<p>No results found for "<strong>${query}</strong>"</p>`;
    //     // }
    // })
    // .catch((error) => {
    //     if (error.message.includes("404")) {
    //         error.message = 'Requested resource not found! Please try again!';
    //     } else if (error.message.includes("400")) {
    //         error.message = 'Bad request. Please check the request parameters.';
    //     } else if (error.message.includes("500")) {
    //         error.message = 'Internal server error. Please try again later.';
    //     } else if (error.message.includes("405")) {
    //         error.message = 'Method not allowed. Please check the API endpoint.';
    //     }else if (error.name === 'AbortError') {
    //         error.message = 'Request timed out. Please try again later.';
    //     } else if (error.message.includes('CORS')) {
    //         error.message = 'CORS error: The request has been blocked. No "Access-Control-Allow-Origin" header found.';
    //     }else if(error.message === 'Failed to fetch') {
    //         error.message = 'API Key/ API URL is not Correct';
    //     }
    //     resultContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
    //     resultContainer.style.display = 'block';  // Ensure the container is visible
    // })

    // function getThumbnail(thumbnail_url) {
    //     return thumbnail_url === "" || !thumbnail_url
    //         ? `${aiSearch.plugin_url}assets/images/default-thumbnail.png`
    //         : thumbnail_url;
    // }

