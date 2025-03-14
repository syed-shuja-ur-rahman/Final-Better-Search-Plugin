
const resultContainer = document.getElementById("better-search-results");
const paginationContainer = document.getElementById("pagination");
const filterContainer = document.getElementById("filter-container");
const nonce = aiSearch.nonce;
const apiUrl = aiSearch.api_url;
const apiKey = aiSearch.api_key;
const search_type = aiSearch.search_type;
const fPageUrl = aiSearch.search_results_page_url;
const isFullPage = window.location.href.includes(fPageUrl);

// Get search query from URL
const queryString = new URLSearchParams(window.location.search);
const query = queryString.get("s") || queryString.get("q"); // Get the raw query parameter
let decodedQuery = decodeURIComponent(query || ''); // Handle different query params





document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("bettersearch-input");
    
    
    // Check if the query string is empty; if yes, hide all shortcode output
    if (isFullPage && decodedQuery.trim() === "") {
        resultContainer.style.display = 'none';
        paginationContainer.style.display = 'none';
        filterContainer.style.display = 'none';
        document.getElementById("full-page-search-header").style.display = 'none';
    } 
    
    // Create tooltip element
    const tooltip = document.createElement("div");
    tooltip.innerText = "Press Enter to Search";
    tooltip.style.position = "absolute";
    tooltip.style.background = "#333";
    tooltip.style.color = "#fff";
    tooltip.style.padding = "5px 10px";
    tooltip.style.borderRadius = "5px";
    tooltip.style.fontSize = "12px";
    tooltip.style.visibility = "hidden"; 
    tooltip.style.transition = "opacity 0.3s";
    tooltip.style.opacity = "0";
    tooltip.style.zIndex = "99999";

    document.body.appendChild(tooltip);

    // Function to show tooltip
    function showTooltip() {
        const rect = searchInput.getBoundingClientRect();
        tooltip.style.top = `${rect.top + window.scrollY + 40}px`; // Above input field
        tooltip.style.left = `${rect.left + window.scrollX + rect.width / 150 - tooltip.clientWidth / 150}px`;
        tooltip.style.visibility = "visible";
        tooltip.style.opacity = "1";
    }

    // Function to hide tooltip on blur
    function hideTooltip() {
        tooltip.style.opacity = "0";
        setTimeout(() => {
            tooltip.style.visibility = "hidden";
        }, 600);
    }

    // Show tooltip on input
    searchInput.addEventListener("input", function () {
        if (decodedQuery.trim() !== ''){
        showTooltip();}
        setTimeout(hideTooltip, 2000);
    });

    


    // Enter key press event
    searchInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            currentPage = 1;
             event.preventDefault(); 

            decodedQuery = searchInput.value.trim();
            if (decodedQuery) {
                fetchResults(1); // API call
                updatePageHeader(decodedQuery);
            }
        }
    });
});








    // Set header with breadcrumb and search query
    
    let currentPage = 1; // Track the current page
    const limit = 20; // Number of results per page
    let totalPages = 1; // Track the total number of pages (initially 1)
    let selectedFilters = {
        assetType: [], // Array to store selected asset types
        date: [], // Array to store selected dates
        hrDomain: [] // Array to store selected HR domains
    };
    

    updatePageHeader(decodedQuery);
    // Function to construct the filter string for the API
    function constructFilterString() {
        const filterConditions = [];
        
        if (selectedFilters.assetType.length > 0) {
            const assetTypeConditions = selectedFilters.assetType.map(type => `asset_type='${type}'`).join(" OR ");
            filterConditions.push(`(${assetTypeConditions})`);
        }

        // Date Filter
    if (selectedFilters.date.length > 0) {
        const date = selectedFilters.date[0]; // Only one date can be selected
        let startDate, endDate;

        switch (date) {
            case "Last Week":
                startDate = moment().subtract(7, 'days').startOf('day').unix(); // 7 days ago at start of day
                endDate = moment().endOf('day').unix(); // Current date at end of day
                break;
            case "Last Month":
                startDate = moment().subtract(1, 'month').startOf('month').unix(); // Start of last month
                endDate = moment().subtract(1, 'month').endOf('month').unix(); // End of last month
                break;
            case "This Year":
                startDate = moment().startOf('year').unix(); // Start of the current year
                endDate = moment().endOf('year').unix(); // End of the current year
                break;
            case "Last Year":
                startDate = moment().subtract(1, 'year').startOf('year').unix(); // Start of last year
                endDate = moment().subtract(1, 'year').endOf('year').unix(); // End of last year
                break;
            default:
                return ""; // No date filter applied
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
                                        : searchResult.asset_type === "Non-Video lesson" 
                                        ? `<div class="bs-thumbnail-lesson"><i class="fa-light fa-book"></i></div>` 
                                        : searchResult.asset_type === "Help Center" 
                                        ? `<div class="bs-thumbnail-help"><i class="fa-regular fa-question"></i></div>` 
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
                    ${searchResult.asset_type === 'Video lesson' ? `onClick="openLessonPreviewModal('${vimeoId}','${searchResult.title}','${searchResult.url}')"` : ''}>
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
            <button class="pagination-button" onclick="goToPage(currentPage - 1)" ${currentPage === 1 ? 'disabled' : ''}> <i class="fa-solid fa-arrow-left"></i>Previous</button>
            <div class="pagination-container">
            <span class="pageInputText">Page</span><input type="number" id="pageInput" value="${page}" min="1" onkeypress="handlePageInput(event)" />
            </div>
            <button class="pagination-button" onclick="goToPage(currentPage + 1)">Next<i class="fa-solid fa-arrow-right"></i></button>
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

    function renderFilters() {
        currentPage = 1;
        const formatSelectedValues = (filterType, defaultLabel) => {
            const values = selectedFilters[filterType];
            if (values.length === 0) return defaultLabel;
            return `${defaultLabel}: ${values.join(", ")}`;
        };
    
        const filtersHTML = `
        <span class="filter-by-text">Filter by:</span>
            <div class="filters-container">
                <button class="fs-filter-button" onclick="toggleDropdown(this)">
                    <span class="fs-filter-text" title="${selectedFilters.assetType.join(", ")}">${formatSelectedValues('assetType', 'Asset Type')}</span>
                    <i class="fas fa-chevron-down fs-dropdown-arrow"></i>
                </button>
                <div class="filter-content">
                    ${['Courses', 'Video lesson', 'Non-Video lesson', 'Blog Articles', 'Youtube Videos', 'Help Center'].map(item => `
                        <label>
                            <input type="checkbox" value="${item}" ${selectedFilters.assetType.includes(item) ? 'checked' : ''} onchange="handleFilterChange('assetType', '${item}', this.checked)"> 
                            ${item}
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="filters-container">
                <button class="fs-filter-button" onclick="toggleDropdown(this)">
                    <span class="fs-filter-text" title="${selectedFilters.date.join(", ")}">${formatSelectedValues('date', 'Date')}</span>
                    <i class="fas fa-chevron-down fs-dropdown-arrow"></i>
                </button>
                <div class="filter-content-date">
                    ${['Last Week', 'Last Month', 'This Year', 'Last Year','All Time'].map(item => `
                        <div class="date-option" onclick="handleDateFilterChange('${item}')">
                        <span class="tick-icon" style="display: ${selectedFilters.date.includes(item) ? 'inline' : 'none'};">✔</span>
                            <span class="date-ftext">${item}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="filters-container">
                <button class="fs-filter-button" onclick="toggleDropdown(this)">
                    <span class="fs-filter-text" title="${selectedFilters.hrDomain.join(", ")}">${formatSelectedValues('hrDomain', 'HR Domain')}</span>
                    <i class="fas fa-chevron-down fs-dropdown-arrow"></i>
                </button>
                <div class="filter-content-domain">
                    ${['Business Partnering', 'Comp. & Ben', 'DEIB & EX', 'Digital HR', 'Employee Relations', 'Health & Safety', 'HR Operations', 'L&D', 'Org. Development', 'People Analytics', 'Talent Acquisition', 'Talent Management'].map(item => `
                        <label>
                            <input type="checkbox" value="${item}" ${selectedFilters.hrDomain.includes(item) ? 'checked' : ''} onchange="handleFilterChange('hrDomain', '${item}', this.checked)"> 
                            ${item}
                        </label>
                    `).join('')}
                </div>
            </div>
            <button onclick="clearFilters()" class="fs-clear-filters-btn">Clear Filters</button>
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
        if (selectedFilters.date.includes(value)) {
            selectedFilters.date = []; // Deselect if already selected
        } else {
            selectedFilters.date = [value]; // Select the new date
        }
        renderFilters();
        fetchResults(currentPage);
    }

    // Function to clear all filters
    function clearFilters() {
        selectedFilters = { assetType: [], date: [], hrDomain: [] };
        renderFilters();
        fetchResults(currentPage);
    }

    // Function to toggle dropdown visibility
    function toggleDropdown(button) {
        const dropdownContent = button.nextElementSibling;
        const isVisible = dropdownContent.style.display === "flex";
        const arrowIcon = button.querySelector(".fs-dropdown-arrow");

        
        document.querySelectorAll(".filter-content, .filter-content-date, .filter-content-domain").forEach(content => {
            content.style.display = "none";
        });
        document.querySelectorAll(".fs-dropdown-arrow").forEach(arrow => {
            arrow.classList.remove("fa-chevron-up");
            arrow.classList.add("fa-chevron-down");
        });
    
        // Toggle the clicked dropdown
        if (!isVisible) {
            dropdownContent.style.display = "flex";
            arrowIcon.classList.remove("fa-chevron-down");
            arrowIcon.classList.add("fa-chevron-up");
        } else {
            dropdownContent.style.display = "none";
            arrowIcon.classList.remove("fa-chevron-up");
            arrowIcon.classList.add("fa-chevron-down");
        }
        
    }

    // Close dropdowns when clicking outside
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".filters-container")) {
            document.querySelectorAll(".filter-content").forEach(content => {
                content.style.display = "none";
            });
        }
    });


    function updatePageHeader(decodedQuery ) {
        const pageHeader = document.getElementById("full-page-search-header");
        if (pageHeader) {
            pageHeader.innerHTML = `<h3>Search results for "${decodedQuery}"</h3>`;
            pageHeader.style.display = "block"; // Make sure it is visible
        }
    }



    // Initial render
    fetchResults(currentPage);
    renderFilters();

