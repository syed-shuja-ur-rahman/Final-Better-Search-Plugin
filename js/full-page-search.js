const resultContainer = document.getElementById("better-search-results");
const paginationContainer = document.getElementById("pagination");
const filterContainer = document.getElementById("filter-container");
const nonce = aiSearch.nonce;
const apiUrl = aiSearch.api_url;
const apiKey = aiSearch.api_key;
const search_type = aiSearch.search_type;

// Get search query from URL
const queryString = new URLSearchParams(window.location.search);
const query = queryString.get("s") || queryString.get("q"); // Get the raw query parameter
const decodedQuery = decodeURIComponent(query || ''); // Handle different query params

const pageheader = document.getElementById("full-page-search-header").innerHTML = `<div class="breadcrumb">
<?php 
if (function_exists('woocommerce_breadcrumb')) { 
    woocommerce_breadcrumb(); 
} 
?>
</div>
<h3>Search result for "${decodedQuery}"</h3>`;

let currentPage = 1; // Track the current page
const limit = 20; // Number of results per page
let totalPages = 1; // Track the total number of pages (initially 1)
let selectedFilters = {
    category: [], // Array to store selected categories
    date: [], // Array to store selected dates
    hrDomain: [] // Array to store selected HR domains
};

console.log("Query URL se mili? --->>>", decodedQuery);

// Function to construct the filter string for the API
function constructFilterString() {
    const filterConditions = [];

    // Add category filter
    if (selectedFilters.category.length > 0) {
        const categoryConditions = selectedFilters.category.map(cat => `category='${cat}'`).join(" OR ");
        filterConditions.push(`(${categoryConditions})`);
    }

    // Add date filter (assuming `created_at` is the field for date)
    if (selectedFilters.date.length > 0) {
        const date = selectedFilters.date[0]; // Only one date can be selected
        const currentDate = new Date(); // Current date and time
        let startDate, endDate;

        switch (date) {
            case "Last Week":
                startDate = new Date(currentDate.setDate(currentDate.getDate() - 7)).getTime() / 1000; // 7 days ago in seconds
                endDate = Math.floor(Date.now() / 1000); // Current time in seconds
                break;
            case "Last Month":
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 1)).getTime() / 1000; // 1 month ago in seconds
                endDate = Math.floor(Date.now() / 1000); // Current time in seconds
                break;
            case "This Year":
                startDate = new Date(currentDate.getFullYear(), 0, 1).getTime() / 1000; // Start of the year in seconds
                endDate = Math.floor(Date.now() / 1000); // Current time in seconds
                break;
            case "Last Year":
                startDate = new Date(currentDate.getFullYear() - 1, 0, 1).getTime() / 1000; // Start of last year in seconds
                endDate = new Date(currentDate.getFullYear() - 1, 11, 31).getTime() / 1000; // End of last year in seconds
                break;
            default:
                return "";
        }

        filterConditions.push(`(created_at>=${startDate} AND created_at<=${endDate})`);
    }

    // Add HR domain filter
    if (selectedFilters.hrDomain.length > 0) {
        const hrDomainConditions = selectedFilters.hrDomain.map(domain => `hr_domain='${domain}'`).join(" OR ");
        filterConditions.push(`(${hrDomainConditions})`);
    }

    // Combine all conditions with AND
    return filterConditions.join(" AND ");
}

// Function to fetch results for a specific page
function fetchResults(page) {
    const offset = (page - 1) * limit; // Calculate offset based on the page number

    // Construct the filter string
    const filterString = constructFilterString();

    console.log("Filters Value", filterString);


    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
        },
        body: JSON.stringify({
            Query: decodedQuery,
            SearchType: search_type,
            Filter: filterString, // Send the constructed filter string
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

        // Sort results to bring courses to the top
        const sortedResults = _.orderBy(data.data, item => item.asset_type === "Courses" ? 0 : 1);

        // Display new results
        let html = '';
        if (!_.isEmpty(sortedResults)) {
            _.forEach(sortedResults, (searchResult) => {
                const thumbnail = searchResult.asset_type === "Courses"
                                    ? `<div class="ai-thumbnail-course" style="background-image: url('${searchResult.thumbnail_url}');"></div>`
                                    : searchResult.asset_type === "Video lesson"
                                    ? `<div class="bs-thumbnail-lesson"><i class="fa-light fa-play"></i></div>`
                                    : searchResult.asset_type === "Non-Video lesson" ? `<div class="bs-thumbnail-lesson"><i class="fa-light fa-book"></i></i></div>` 
                                    : getThumbnail(searchResult.thumbnail_url);
                
                const isVideoLesson = searchResult.asset_type === "Video lesson";
                const videoUrl = isVideoLesson ? searchResult.external_url : ""; 
                const urlMatch = isVideoLesson ? videoUrl.match(/vimeo\.com\/(\d+)/) : null;
                const vimeoId = urlMatch ? urlMatch[1] : "";
                
                const videoMarkup = isVideoLesson
                    ? `<div class="video-icon">
                            <i class="fa-light fa-play"></i> Play Video
                        </div>`
                    : "";

                const category = searchResult.asset_type === "Courses" ? searchResult.category : searchResult.asset_type;

                html += `
                <a href="${searchResult.asset_type === 'Video lesson' ? 'javascript:void(0);' : searchResult.url}" 
                ${searchResult.asset_type !== 'Video lesson' ? 'target="_blank"' : ''}
                ${searchResult.asset_type === 'Video lesson' ? `onClick="openLessonPreviewModal('${vimeoId}','${searchResult.title}','${searchResult.url}')"` : ''}">
                <div class="ai-search-suggestions">
                    <div>
                            ${thumbnail}
                    </div>
                        <div class="search-title">
                        <p class="asset-type" data-type="${searchResult.asset_type}">${category}</p>
                           <h5> ${searchResult.title}</h5>  
                           ${videoMarkup}
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
function updatePaginationUI(page) {
    paginationContainer.innerHTML = `
        <button class="pagination-button" onclick="goToPage(currentPage - 1)" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
        <div class="pagination-container">
        <span class="pageInputText">Page</span><input type="number" id="pageInput" value="${page}" min="1" onkeypress="handlePageInput(event)" />
        </div>
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
        ? `<div class="ai-thumbnail" style="background-image: url('${aiSearch.plugin_url}assets/images/default-thumbnail.png');"></div>`
        : `<div class="ai-thumbnail" style="background-image: url('${thumbnail_url}');"></div>`;
}

// Function to handle filter changes
// function handleFilterChange(filterType, value, isChecked) {
//     if (isChecked) {
//         selectedFilters[filterType].push(value); // Add the selected filter value
//     } else {
//         selectedFilters[filterType] = selectedFilters[filterType].filter(item => item !== value); // Remove the deselected filter value
//     }
//     currentPage = 1; // Reset to the first page when filters change
//     fetchResults(currentPage);
// }

// // Function to render filters
// function renderFilters() {
//     const getFilterLabel = (filterType, defaultLabel) => {
//         if (selectedFilters[filterType].length === 0) return defaultLabel;
//         if (selectedFilters[filterType].length === 1) return `${defaultLabel}: ${selectedFilters[filterType][0]}`;
//         return `${defaultLabel}: ${selectedFilters[filterType].length} Selected`;
//     };

//     const filtersHTML = `
//         <div class="filter-dropdown">
//             <button class="filter-button" onclick="toggleDropdown(this)">${getFilterLabel('category', 'Category')}</button>
//             <div class="filter-content">
//                 ${['Resources', 'Live Events', 'Blog Articles', 'Youtube Videos', 'Non-video lesson', 'Help Center', 'Glossary'].map(item => `
//                     <label>
//                         <input type="checkbox" class="category-filter" value="${item}" ${selectedFilters.category.includes(item) ? 'checked' : ''} onchange="handleFilterChange('category', '${item}', this.checked)"> 
//                         ${item}
//                     </label>
//                 `).join('')}
//             </div>
//         </div>
//         <div class="filter-dropdown">
//             <button class="filter-button" onclick="toggleDropdown(this)">${getFilterLabel('date', 'Date')}</button>
//             <div class="filter-content">
//                 ${['All Time', 'Last Week', 'Last Month', 'This Year', 'Last Year'].map(item => `
//                     <div class="date-option" data-value="${item}" onclick="handleDateFilterChange('${item}')">
//                         <span class="tick-icon">${selectedFilters.date.includes(item) ? '✔' : ''}</span>
//                         <span>${item}</span>
//                     </div>
//                 `).join('')}
//             </div>
//         </div>
//         <div class="filter-dropdown">
//             <button class="filter-button" onclick="toggleDropdown(this)">${getFilterLabel('hrDomain', 'HR Domain')}</button>
//             <div class="filter-content">
//                 ${['Business Partnering', 'Comp. & Ben', 'DEIB & EX', 'Digital HR', 'Employee Relations', 'Health & Safety', 'HR Operations', 'L&D', 'Org. Development', 'People Analytics', 'Talent Acquisition', 'Talent Management'].map(item => `
//                     <label>
//                         <input type="checkbox" class="hr-domain-filter" value="${item}" ${selectedFilters.hrDomain.includes(item) ? 'checked' : ''} onchange="handleFilterChange('hrDomain', '${item}', this.checked)"> 
//                         ${item}
//                     </label>
//                 `).join('')}
//             </div>
//         </div>
//         <button onclick="clearFilters()" class="clear-filters-btn">Clear Filters</button>
//     `;
//     filterContainer.innerHTML = filtersHTML;
// }

// // Function to handle date filter changes
// function handleDateFilterChange(value) {
//     selectedFilters.date = [value]; // Set the selected date as an array
//     currentPage = 1; // Reset to the first page when filters change
//     updateDateFilterUI(); // Update only the date filter UI
//     fetchResults(currentPage);
// }

// // Function to update only the Date filter UI
// function updateDateFilterUI() {
//     document.querySelectorAll('.date-option').forEach(option => {
//         const optionText = option.querySelector('span:last-child').textContent;
//         option.querySelector('.tick-icon').textContent = selectedFilters.date.includes(optionText) ? '✔' : '';
//     });
// }

// // Function to toggle dropdown visibility
// function toggleDropdown(button) {
//     const dropdownContent = button.nextElementSibling;
//     const isVisible = dropdownContent.style.display === "block";

//     document.querySelectorAll(".filter-content").forEach(content => {
//         if (content !== dropdownContent) {
//             content.style.display = "none";
//         }
//     });

//     dropdownContent.style.display = isVisible ? "none" : "block";
// }

// // Close dropdowns when clicking outside
// document.addEventListener("click", (event) => {
//     if (!event.target.closest(".filter-dropdown")) {
//         document.querySelectorAll(".filter-content").forEach(content => {
//             content.style.display = "none";
//         });
//     }
// });

// // Function to handle date filter changes
// function handleDateFilterChange(value) {
//     selectedFilters.date = value ? [value] : []; // Set the selected date or clear if "All Time" is selected
//     console.log("Selected Date:", selectedFilters.date);
//     currentPage = 1; // Reset to the first page when filters change
//     updateDateFilterUI(); // Update only the date filter UI
//     fetchResults(currentPage);
// }

// function clearFilters () {
//     selectedFilters = { category: [], date: [], hrDomain: [] }; // Reset filters
//     renderFilters(); // Re-render UI with updated state
//     fetchResults(currentPage);
// }

// // Initial fetch for the first page
// fetchResults(currentPage);
// renderFilters();










// Function to render filters
function renderFilters() {
    const formatSelectedValues = (filterType, defaultLabel) => {
        const values = selectedFilters[filterType];
        if (values.length === 0) return defaultLabel;
        return `${defaultLabel}: ${values.join(", ")}`;
    };

    const filtersHTML = `
        <div class="filters-container">
            <button class="filter-button" onclick="toggleDropdown(this)">
                <span class="filter-text" title="${selectedFilters.category.join(", ")}">${formatSelectedValues('category', 'Category')}</span>
            </button>
            <div class="filter-content">
                ${['Resources', 'Live Events', 'Blog Articles', 'Youtube Videos', 'Non-video lesson', 'Help Center', 'Glossary'].map(item => `
                    <label>
                        <input type="checkbox" value="${item}" ${selectedFilters.category.includes(item) ? 'checked' : ''} onchange="handleFilterChange('category', '${item}', this.checked)"> 
                        ${item}
                    </label>
                `).join('')}
            </div>
        </div>
        <div class="filters-container">
            <button class="filter-button" onclick="toggleDropdown(this)">
                <span class="filter-text" title="${selectedFilters.date.join(", ")}">${formatSelectedValues('date', 'Date')}</span>
            </button>
            <div class="filter-content">
                ${['All Time', 'Last Week', 'Last Month', 'This Year', 'Last Year'].map(item => `
                    <div class="date-option" onclick="handleDateFilterChange('${item}')">
                        <span class="tick-icon">${selectedFilters.date.includes(item) ? '✔' : ''}</span>
                        <span>${item}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="filters-container">
            <button class="filter-button" onclick="toggleDropdown(this)">
                <span class="filter-text" title="${selectedFilters.hrDomain.join(", ")}">${formatSelectedValues('hrDomain', 'HR Domain')}</span>
            </button>
            <div class="filter-content">
                ${['Business Partnering', 'Comp. & Ben', 'DEIB & EX', 'Digital HR', 'Employee Relations', 'Health & Safety', 'HR Operations', 'L&D', 'Org. Development', 'People Analytics', 'Talent Acquisition', 'Talent Management'].map(item => `
                    <label>
                        <input type="checkbox" value="${item}" ${selectedFilters.hrDomain.includes(item) ? 'checked' : ''} onchange="handleFilterChange('hrDomain', '${item}', this.checked)"> 
                        ${item}
                    </label>
                `).join('')}
            </div>
        </div>
        <button onclick="clearFilters()" class="clear-filters-btn">Clear Filters</button>
    `;
    filterContainer.innerHTML = filtersHTML;
}

// Function to handle checkbox filter changes
function handleFilterChange(filterType, value, isChecked) {
    if (isChecked) {
        selectedFilters[filterType].push(value);
    } else {
        selectedFilters[filterType] = selectedFilters[filterType].filter(item => item !== value);
    }
    renderFilters();
    fetchResults(currentPage);
}

// Function to handle date filter changes
function handleDateFilterChange(value) {
    selectedFilters.date = [value];
    renderFilters();
    fetchResults(currentPage);
}

// Function to clear all filters
function clearFilters() {
    selectedFilters = { category: [], date: [], hrDomain: [] };
    renderFilters();
    fetchResults(currentPage);
}

// Function to toggle dropdown visibility
function toggleDropdown(button) {
    const dropdownContent = button.nextElementSibling;
    const isVisible = dropdownContent.style.display === "block";

    document.querySelectorAll(".filter-content").forEach(content => {
        if (content !== dropdownContent) {
            content.style.display = "none";
        }
    });

    dropdownContent.style.display = isVisible ? "none" : "block";
}

// Close dropdowns when clicking outside
document.addEventListener("click", (event) => {
    if (!event.target.closest(".filters-container")) {
        document.querySelectorAll(".filter-content").forEach(content => {
            content.style.display = "none";
        });
    }
});

// Initial render
fetchResults(currentPage);
renderFilters();



























































// const resultContainer = document.getElementById("better-search-results");
// const paginationContainer = document.getElementById("pagination");     
// const nonce = aiSearch.nonce;
// const apiUrl = aiSearch.api_url;
// const apiKey = aiSearch.api_key;
// const search_type = aiSearch.search_type;

// // Get search query from URL
// const queryString = new URLSearchParams(window.location.search);
// const query = queryString.get("s") || queryString.get("q"); // Get the raw query parameter
// const decodedQuery = decodeURIComponent(query || '');// Handle different query params

// const pageheader = document.getElementById("full-page-search-header").innerHTML = `<div class="breadcrumb">
// <?php 
// if (function_exists('woocommerce_breadcrumb')) { 
//     woocommerce_breadcrumb(); 
// } 
// ?>
// </div>
// <h3>Search result for "${decodedQuery}"</h3>`;

// let currentPage = 1; // Track the current page
// const limit = 20; // Number of results per page
// let totalPages = 1; // Track the total number of pages (initially 1)

// console.log("Query URL se mili? --->>>", decodedQuery);

// // Function to fetch results for a specific page
// function fetchResults(page) {
//     const offset = (page - 1) * limit; // Calculate offset based on the page number

//     fetch(apiUrl, {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             "x-api-key": apiKey,
//         },
//         body: JSON.stringify({
//             Query: decodedQuery,
//             SearchType: search_type,
//             Filter: "",
//             Offset: offset,
//             Limit: limit,
//             nonce: nonce,
//         }),
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.status !== 'success') {
//             $('#better-search-results').html(`<div class="error">${data.message}</div>`).show();
//             return;
//         }

//         // Clear previous results
//         resultContainer.innerHTML = '';

//         // Sort results to bring courses to the top
//         const sortedResults = _.orderBy(data.data, item => item.asset_type === "Courses" ? 0 : 1);
//         // const [courses, others] = _.partition(data.data, item => item.asset_type === "Courses");
//         // const sortedResults = [...courses, ...others];
//         // Display new results
//         let html = '';
//         if (!_.isEmpty(sortedResults)) {
//             _.forEach(sortedResults, (searchResult) => {
//                 // const thumbnail = getThumbnail(searchResult.thumbnail_url);
//                 const thumbnail = searchResult.asset_type === "Courses"
//                                     ? `<div class="ai-thumbnail-course" style="background-image: url('${searchResult.thumbnail_url}');"></div>` // Use lesson.thumbnail_url if asset_type is "courses"
//                                     : searchResult.asset_type === "Video lesson"
//                                     ? `<div class="bs-thumbnail-lesson"><i class="fa-light fa-play"></i></div>`
//                                     : searchResult.asset_type === "Non-Video lesson" ? `<div class="bs-thumbnail-lesson"><i class="fa-light fa-book"></i></i></div>` 
//                                     : getThumbnail(searchResult.thumbnail_url);
                
//                                     // Determine if the asset_type is "Video lesson"
//                                     const isVideoLesson = searchResult.asset_type === "Video lesson";
                                    
//                                     const videoUrl = isVideoLesson ? searchResult.external_url : ""; 
//                                     const urlMatch = isVideoLesson ? videoUrl.match(/vimeo\.com\/(\d+)/) : null;
//                                     const vimeoId = urlMatch ? urlMatch[1] : "";
                                    
                                    
//                                     const videoMarkup = isVideoLesson
//                                         ? `<div class="video-icon">
//                                                 <i class="fa-light fa-play"></i> Play Video
//                                         </div>`
//                                         : "";

//                         const category = searchResult.asset_type === "Courses" ? searchResult.category : searchResult.asset_type;

//                 html += `
//                 <a href="${searchResult.asset_type === 'Video lesson' ? 'javascript:void(0);' : searchResult.url}" 
//                 ${searchResult.asset_type !== 'Video lesson' ? 'target="_blank"' : ''}
//                 ${searchResult.asset_type === 'Video lesson' ? `onClick="openLessonPreviewModal('${vimeoId}','${searchResult.title}','${searchResult.url}')"` : ''}">
//                 <div class="ai-search-suggestions">
//                     <div>
//                             ${thumbnail}
//                     </div>
//                         <div class="search-title">
//                         <p class="asset-type" data-type="${searchResult.asset_type}">${category}</p>
//                            <h5> ${searchResult.title}</h5>  
//                            ${videoMarkup}
//                            </div>
//                            </div>
//                            </a>
//                            `;
//             });
//         } else {
//             html = '<div class="ai-search-suggestions">No results found.</div>';
//         }

//         resultContainer.innerHTML = html;

//         // Update total pages based on the number of results
//         if (data.data.length < limit) {
//             totalPages = page; // No more results after this page
//         } else {
//             totalPages = page + 1; // Assume there might be more results
//         }

//         // Update pagination UI
//         updatePaginationUI(page);
//     })
//     .catch((error) => {
//         if (error.message.includes("404")) {
//             error.message = 'Requested resource not found! Please try again!';
//         } else if (error.message.includes("400")) {
//             error.message = 'Bad request. Please check the request parameters.';
//         } else if (error.message.includes("500")) {
//             error.message = 'Internal server error. Please try again later.';
//         } else if (error.message.includes("405")) {
//             error.message = 'Method not allowed. Please check the API endpoint.';
//         } else if (error.name === 'AbortError') {
//             error.message = 'Request timed out. Please try again later.';
//         } else if (error.message.includes('CORS')) {
//             error.message = 'CORS error: The request has been blocked. No "Access-Control-Allow-Origin" header found.';
//         } else if (error.message === 'Failed to fetch') {
//             error.message = 'API Key/ API URL is not Correct';
//         }
//         resultContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
//         resultContainer.style.display = 'block';  // Ensure the container is visible
//     });
// }

// // Function to update the pagination UI (with input box)
// function updatePaginationUI() {
//     paginationContainer.innerHTML = `
//         <button class="pagination-button" onclick="goToPage(currentPage - 1)" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
//         <div class="pagination-container">
//         <span class="pageInputText">Page</span><input type="number" id="pageInput" value="${currentPage}" min="1" onkeypress="handlePageInput(event)" />
//         </div>
//         <button class="pagination-button" onclick="goToPage(currentPage + 1)">Next</button>
//     `;
// }

// // Function to handle input box enter key press
// function handlePageInput(event) {
//     if (event.key === "Enter") {
//         let page = parseInt(event.target.value);
//         if (page >= 1) { // Ensure valid page number
//             goToPage(page);
//         }
//     }
// }

// // Function to navigate to a specific page
// function goToPage(page) {
//     if (page < 1) return; // Prevent invalid pages
//     currentPage = page;
//     fetchResults(currentPage);
// }


// // Function to get thumbnail URL
// function getThumbnail(thumbnail_url) {
//     return thumbnail_url === "" || !thumbnail_url
//         ? `<div class="ai-thumbnail" style="background-image: url('${aiSearch.plugin_url}assets/images/default-thumbnail.png');"></div>`
//         : `<div class="ai-thumbnail" style="background-image: url('${thumbnail_url}');"></div>`;
// }

// // Initial fetch for the first page
// fetchResults(currentPage);






















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

