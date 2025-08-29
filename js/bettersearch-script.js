document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('gs-dropdown-searchbox');
    const resultsContainer = document.getElementById('gs-dropdown-results');
    const nonce = aiSearch.nonce;
    const searchLimit = aiSearch.search_limit;
    const excludeBelowScore = aiSearch.exclude_below_score;
    const searchDelay = aiSearch.search_delay;
    const apiUrl = aiSearch.api_url;
    const apiKey = aiSearch.api_key;
    const search_type = aiSearch.search_type;
    const c_search_limit = aiSearch.c_search_limit;
    const fPageUrl = aiSearch.search_results_page_url;
    const accessibleJourneyUrl = aiSearch.accessible_journey_url;
    const searchContainer = document.querySelector('.search-container');
    
    const $ = jQuery;

    const isFullPage = window.location.href.includes(fPageUrl);
    
    if (isFullPage && decodedQuery.trim() !== '') {
        resultsContainer.style.display = 'none';
        $('#loading-spinner').hide();
        $('#ai-search-clear').hide();
        searchContainer.classList.remove('active');
    } else {
        $("#gs-dropdown-searchbox").keypress(function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                let query = encodeURIComponent($(this).val().trim());
                window.location.href = `${fPageUrl}?q=${query}`;
            }
        });

        // Click outside to close functionality
        function handleClickOutside(event) {
            if (!resultsContainer.contains(event.target) && 
                event.target !== searchInput && 
                !searchInput.contains(event.target)) {
                resultsContainer.style.display = 'none';
                searchContainer.classList.remove('active');
                document.removeEventListener('click', handleClickOutside);
            }
        }

        // Show results container when input is focused
        searchInput.addEventListener('focus', function() {
            if (searchInput.value.trim().length >= 3) {
                resultsContainer.style.display = 'block';
            }
            searchContainer.classList.add('active');
            document.addEventListener('click', handleClickOutside);
        });

        // Hide results when clicking the clear button
        $('#ai-search-clear').on('click', function() {
            resultsContainer.style.display = 'none';
            searchContainer.classList.remove('active');
            document.removeEventListener('click', handleClickOutside);
        });

        // Function to check scroll and apply box shadow
        function checkResultsContainerScroll() {
            const fullPageLinkDiv = document.querySelector('#gs-dropdown-open-fullpage');
            if (!resultsContainer || !fullPageLinkDiv) return;
            
            // Check if results container has scroll
            const hasScroll = resultsContainer.scrollHeight > resultsContainer.clientHeight;

            const isAtBottom = Math.abs(resultsContainer.scrollHeight - (resultsContainer.scrollTop + resultsContainer.clientHeight)) < 1;
                
            // Apply or remove box shadow based on scroll
            if (hasScroll && isAtBottom !== true) {
                fullPageLinkDiv.style.boxShadow = '0 -40px 40px #FFFFFF';
            } else {
                fullPageLinkDiv.style.boxShadow = 'none';
            }
            if (resultsContainer) {
                resultsContainer.addEventListener('scroll', checkResultsContainerScroll);
            }
        }
        
        function filterByRankingScore(results, excludeBelowScore) {
            const threshold = Number(excludeBelowScore) || 0;
            return results.filter(item => {

                if (item._rankingScore !== undefined && item._rankingScore !== null) {
                    return Number(item._rankingScore) >= threshold; 
                }
                return true; 
            });
        }

        // Modified fetchFilteredLessons to use dynamic course IDs
        const fetchFilteredLessons = async (query, courseAndLessonIds) => {
            try {
                const courseFilter = `(asset_type='Courses' AND specific_metadata.id IN [${courseAndLessonIds[0].join(',')}]) OR (asset_type='Courses' AND license_type = 'Public')`;
                   
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                    },
                    body: JSON.stringify({
                        Query: query,
                        SearchType: search_type,
                        Filter: courseFilter,
                        Offset: 0,
                        Limit: c_search_limit,
                        nonce: nonce,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const json = await response.json();
                // ✅ Apply filter before returning
                json.data = filterByRankingScore(json.data || [], excludeBelowScore);
                return json;
            } catch (error) {
                console.error('Error fetching filtered lessons:', error);
                return {
                    status: 'error',
                    message: error.message || 'Failed to fetch courses',
                    data: []
                };
            }
        };

        async function getNonAccessibleCoursesJourney(query) {
            const token = localStorage.getItem('currentToken');
            const journeyKey = "Journeys." + token;
        
            // Get actual data from localStorage using the generated key
            const journeyDataStr = localStorage.getItem(journeyKey);
            if (!journeyDataStr) {
                console.error("No data found for key:", journeyKey);
                return;
            }
        
            let journeyData;
            try {
                journeyData = JSON.parse(journeyDataStr);
            } catch (e) {
                console.error("Failed to parse JSON from localStorage", e);
                return;
            }
        
            const accessibleCoursesList = journeyData.journeys;
            const courseIds = accessibleCoursesList;
        
            const courseFilterJourney = `(asset_type='Courses' AND license_type = 'Private' AND specific_metadata.id IN [${courseIds.join(',')}])`;
        
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    Query: query,
                    SearchType: search_type,
                    Filter: courseFilterJourney,
                    Offset: 0,
                    Limit: 200,
                    nonce: nonce,
                }),
            });
        
            if (!response.ok) {
                throw new Error(`API response not OK: ${response.status}`);
            }
        
            const data = await response.json();
            data.data = filterByRankingScore(data.data || [], excludeBelowScore);
            const getNonAccessibleNonVideoLessonIds = [];
            
            data.data.forEach(item => {
                if (
                    item.specific_metadata &&
                    Array.isArray(item.specific_metadata.lesson_id)
                ) {
                    getNonAccessibleNonVideoLessonIds.push(...item.specific_metadata.lesson_id);
                }
            });
            return getNonAccessibleNonVideoLessonIds;
        }

        async function getAccessibleCoursesJourney(query) {
            try {
                const itemStr = localStorage.getItem('currentToken');
                const tokenAsKey = localStorage.getItem("Journeys."+itemStr);
                let accessibleCoursesList = [];
        
                if (!tokenAsKey) {
                    Object.keys(localStorage).forEach((key) => {
                        if (key.startsWith("Journeys.") || key.startsWith("Lessons.")) {
                            localStorage.removeItem(key);
                        }
                    });

                    try {
                        const res = await fetch(accessibleJourneyUrl, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${itemStr}`  
                            }
                        });
                        if (!res.ok) {
                            jQuery(document).ready(function($) {
                                $('#loading-spinner').hide();
                                $('#ai-search-clear').hide();
                            }); 
                            const errorBox = document.getElementById("gs-dropdown-results");
                            errorBox.innerHTML = `
                                <div class="error-msg">Failed to verify token.</div>
                            `;
                            errorBox.style.display = "block";
                            return;
                        }
                        const data = await res.json();
                        const journeyIds = data.result;
                        
                        localStorage.setItem("Journeys."+itemStr, JSON.stringify(journeyIds));
                        accessibleCoursesList = journeyIds.journeys;
                    } catch (err) {	
                        const errorBox = document.getElementById("gs-dropdown-results");
                        errorBox.innerHTML = `
                            <div class="error-msg">Unable to Load Courses</div>
                        `;
                        errorBox.style.display = "block";
                        jQuery(document).ready(function($) {
                            $('#loading-spinner').hide();
                            $('#ai-search-clear').hide();
                        });    
                        return;
                    }
                } else {
                    const item = JSON.parse(tokenAsKey);
                    accessibleCoursesList = item.journeys;
                }
                
                const lessonIdsStored = JSON.parse(localStorage.getItem("Lessons."+itemStr));
                const courseIds = accessibleCoursesList;
                
                if (!lessonIdsStored) {
                    const courseFilter = `(asset_type='Courses' AND license_type = 'Public') OR (asset_type='Courses' AND specific_metadata.id IN [${courseIds.join(',')}])`;
            
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': apiKey,
                        },
                        body: JSON.stringify({
                            Query: query,
                            SearchType: search_type,
                            Filter: courseFilter,
                            Offset: 0,
                            nonce: nonce,
                        }),
                    });
            
                    if (!response.ok) {
                        throw new Error(`API response not OK: ${response.status}`);
                    }
            
                    const data = await response.json();
                    // ✅ Apply filter before using
                    data.data = filterByRankingScore(data.data || [], excludeBelowScore);
                    
                    const allLessonIds = [];
            
                    data.data.forEach(item => {
                        if (
                            item.specific_metadata &&
                            Array.isArray(item.specific_metadata.lesson_id)
                        ) {
                            allLessonIds.push(...item.specific_metadata.lesson_id);
                        }
                    });

                    const uniqueLessonIds = _.uniq(allLessonIds);

                    const lessonData = {
                        lessonIds: uniqueLessonIds
                    };

                    localStorage.setItem("Lessons."+itemStr, JSON.stringify(lessonData));
                    const combinedArray = [courseIds, uniqueLessonIds];
                    return combinedArray;
                    
                } else {
                    const combinedArray = [courseIds, lessonIdsStored.lessonIds];
                    return combinedArray;
                }
        
            } catch (e) {
                console.error("Error getting course IDs or lessons:", e);
                document.getElementById("gs-dropdown-results").innerHTML = `
                    <div class="error-msg">Unable to load courses.</div>
                `;
                return [];
            }
        }

        // Debounced search input handler
        const handleSearch = _.debounce(async function () {
            const courseAndLessonIds = await getAccessibleCoursesJourney();
            const nonAccessibleLessonIds = await getNonAccessibleCoursesJourney();

            const query = searchInput.value.trim();
            $('#ai-search-clear').hide();
            $('#loading-spinner').show();

            if (query.length < 3) {
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
                $('#loading-spinner').hide();
                $('#ai-search-clear').hide();
                return;
            }
            
            const lessonFilter = `(asset_type NOT IN ['Courses', 'Video lesson', 'Non-Video lesson']) OR (asset_type IN ['Video lesson', 'Non-Video lesson'] AND specific_metadata.id IN [${courseAndLessonIds[1]}])`;

            try {
                // Fetch both suggestions and filtered lessons in parallel
                const [suggestionsData, filteredLessonsData] = await Promise.all([
                    // Main content fetch
                    fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': apiKey,
                        },
                        body: JSON.stringify({
                            Query: query,
                            SearchType: search_type,
                            Filter: lessonFilter,
                            Offset: 0,
                            Limit: searchLimit, 
                            nonce: nonce,
                        }),
                    }).then(response => response.json()),
                    
                    // Filtered courses fetch 
                    fetchFilteredLessons(query, courseAndLessonIds)
                ]);

                $('#loading-spinner').hide();
                $('#ai-search-clear').hide();

                if (suggestionsData.status !== 'success' || filteredLessonsData.status !== 'success') {
                    $('#gs-dropdown-results').html(`<div class="error">${suggestionsData.message || filteredLessonsData.message}</div>`).show();
                    return;
                }

                const filteredSuggestions = filterByRankingScore(suggestionsData.data || [], excludeBelowScore);
                // Process and display results
                resultsContainer.style.display = 'block';
                const categorizedResults = {
                    lessons: filteredLessonsData.data || [],
                    features: [],
                    helpcenter: [],
                    articles: [],
                };

                // Categorize remaining results based on asset type
                filteredSuggestions.forEach((item) => {
                    if (item.asset_type === 'Video lesson' || item.asset_type === 'Non-Video lesson') {
                        categorizedResults.lessons.push(item);
                    } else if (item.asset_type === 'Feature') {
                        categorizedResults.features.push(item);
                    } else if (item.asset_type === 'Help Center') {
                        categorizedResults.helpcenter.push(item);
                    } else {
                        categorizedResults.articles.push(item);
                    }
                });
                
                let html = '';
                let hasResults = false;
                
                // Handle Features Section
                if (!_.isEmpty(categorizedResults.features)) {
                    hasResults = true;
                    html += `<div>
                                <div>
                                    <div class="category-title">Features </div>
                                </div>
                            </div>`;
                    _.take(categorizedResults.features, searchLimit).forEach((feature) => {
                        const thumbnail = getThumbnail(feature.thumbnail_url);
                        html += `
                        <a href="${feature.url}" >
                        <div class="ai-search-suggestions">
                            <div>
                                    <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
                            </div>
                                <div class="search-title">
                            
                                   <h5> ${feature.title}</h5>  
                                   </div>
                                   </div>
                                   </a>
                                   `;
                    });
                    html += `<hr>`;
                }

                // Handle Course/Lessons Section
                if (!_.isEmpty(categorizedResults.lessons)) {
                    hasResults = true;
                    html += `<div>
                                <div>
                                    <div class="category-title">Course/Lessons</div>
                                </div>
                            </div>`;
                    const uniqueLessons = _.uniqBy(categorizedResults.lessons, (lesson) => {
                        if (lesson.asset_type === "Video lesson") {
                            const videoUrl = lesson.external_url || "";
                            const urlMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
                            return urlMatch ? urlMatch[1] : lesson.url;
                        }
                        return lesson.url; 
                    });
                    _.take(uniqueLessons, searchLimit).forEach((lesson) => {
                        const thumbnail = lesson.asset_type === "Courses"
                                            ? `<div class="ai-thumbnail-course" style="background-image: url('${lesson.thumbnail_url}');"></div>`
                                            : lesson.asset_type === "Video lesson"
                                            ? `<div class="bs-thumbnail-lesson"><i class="fa-light fa-play"></i></div>`
                                            : `<div class="bs-thumbnail-lesson"><i class="fa-light fa-book"></i></i></div>`;
        
                        const isNonAccessible = nonAccessibleLessonIds.includes(lesson.specific_metadata.id);
                        
                        if (isNonAccessible) {     
                            return; 
                        }
                        
                        const isVideoLesson = lesson.asset_type === "Video lesson";
                        const videoUrl = isVideoLesson ? lesson.external_url : ""; 
                        const urlMatch = isVideoLesson ? videoUrl.match(/vimeo\.com\/(\d+)/) : null;
                        const vimeoId = urlMatch ? urlMatch[1] : "";
                        const videoMarkup = isVideoLesson
                            ? `<div class="video-icon">
                                    <i class="fa-light fa-play"></i> Play Video
                                </div>`
                            : "";

                        const category = lesson.asset_type === "Courses" ? lesson.category : lesson.asset_type;
        
                        html += `
                        <a id="gs-dropdown-result-item" href="${lesson.asset_type === 'Video lesson' ? 'javascript:void(0);' : lesson.url}" 
                                    ${lesson.asset_type === 'YouTube video' ? 'target="_blank"' : ''}
                                    ${lesson.asset_type === 'Video lesson' ? `onClick="openLessonPreviewModal('${vimeoId}','${lesson.title}','${lesson.url}','${lesson.specific_metadata.id}')"` : ''}>
                            <div> 
                                <div class="ai-search-suggestions">
                                    <div>
                                     ${thumbnail}
                                    </div>
                                    <div class="search-title px-0">
                                            <p class="asset-type" data-type="${lesson.asset_type}">${category}</p>    
                                            <h5>${lesson.title}</h5> 
                                        ${videoMarkup}
                                    </div>
                                </div>
                            </div>
                            </a>`;
                    });
                    html += `<hr>`;
                }
                
                // Handle Content Section
                if (!_.isEmpty(categorizedResults.articles)) {
                    hasResults = true;
                    html += `<div >
                                <div >
                                        <div class="category-title">Content</div>
                                </div>
                            </div>`;
                    _.take(categorizedResults.articles, searchLimit).forEach((article) => {
                        const thumbnail = article.thumbnail_url === "" || null
                                            ? `${aiSearch.plugin_url}assets/images/Default-Misc.png`
                                            : article.thumbnail_url;
                        html += `
                        <a id="gs-dropdown-result-item" href="${article.url}" ${article.asset_type === 'Article' ? 'target="_blank"' : ''}>
                        <div > 
                                <div class="ai-search-suggestions">
                                    <div >
                                        
                                            <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
                                       
                                    </div>
                                        <div class="search-title px-0">
                                    
                                    <p class="asset-type" data-type="${article.asset_type}" >${article.asset_type}</p>	
                                        <h5> ${article.title}</h5>  
                                    
                                        </div>
                                </div>
                            </div>
                            </a>`;
                    });
                    html += `<hr>`;
                }
                // Handle Help Center Section
                if (!_.isEmpty(categorizedResults.helpcenter)) {
                    hasResults = true;
                    html += `<div >
                                    <div >
                                        <div class="category-title">Knowledge Base </div>
                                    </div>
                            </div>`;
                    _.take(categorizedResults.helpcenter, searchLimit).forEach((help_center) => {
                        html += `
                        <a id="gs-dropdown-result-item" href="${help_center.url}" target="_blank">
                            <div>
                                <div class="ai-search-suggestions">
                                <div>
                                    <div class="bs-thumbnail-help">
                                    <i class="fa-regular fa-question"></i>
                                    </div>
                                </div>
                                <div class="search-title px-0">
                                    <p class="asset-type">FAQ - Knowledge Base</p>
                                    <h5> ${help_center.title}</h5>
                                </div>
                                </div>
                            </div>
                        </a>
                                   `;
                    });
                    html += `<hr>`;
                }
               
                if (hasResults) {
                    const encodedQuery = encodeURIComponent(query);
                    const linkHTML = `  
                        <div class="full-page-link" id="gs-dropdown-open-fullpage">
                            <a href="${fPageUrl}?q=${encodedQuery}" class="full-search-page">
                            <i class="fa-light fa-arrow-up-right"></i> Open Search Page
                            </a>
                        </div>
                    `;
                    html += linkHTML;
                } else {
                    html = '<div class="ai-search-suggestions">No results found.</div>';
                }

                resultsContainer.innerHTML = html;
                checkResultsContainerScroll();

            } catch (error) {
                console.error('Search error:', error);
                $('#loading-spinner').hide();
                resultsContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
                resultsContainer.style.display = 'block';
                checkResultsContainerScroll();
            }
        }, searchDelay);

        // Add resize observer to handle container size changes
        const resizeObserver = new ResizeObserver(checkResultsContainerScroll);
        if (resultsContainer) {
            resizeObserver.observe(resultsContainer);
        }

        // Attach event listener to the input
        searchInput.addEventListener('input', handleSearch);
        
        document.addEventListener("keydown", function (event) {
            if (event.key === "/" && document.activeElement !== searchInput) {
                event.preventDefault();
                searchInput.focus();
            }
        });
        
        // Clear search box and suggestions
        $('#ai-search-clear').on('click', function () {
            $('#gs-dropdown-searchbox').val('');
            $('#gs-dropdown-results').empty().hide();
            checkResultsContainerScroll();
        });

        function getThumbnail(thumbnail_url) {
            return thumbnail_url === "" || !thumbnail_url
                ? `${aiSearch.plugin_url}assets/images/default-thumbnail.png`
                : thumbnail_url;
        }
    }
});

const searchBox = document.getElementById('bs-search-box');
const mobileSearchIcon = document.getElementById('mobile-search-icon');
const searchInput = document.getElementById('gs-dropdown-searchbox');
const clearIcon = document.getElementById('ai-search-clear');
const spinner = document.getElementById('loading-spinner');
const suggestionsBox = document.getElementById('gs-dropdown-results');

// Toggle search box and suggestions box on mobile
mobileSearchIcon.addEventListener('click', () => {
    searchBox.classList.add('active');
    mobileSearchIcon.classList.add('active');
    clearIcon.style.display = 'block';
    /* CHANGE: Show suggestions box if input has content */
    if (searchInput.value.length > 0) {
        suggestionsBox.style.display = 'flex';
    }
    searchInput.focus();
});

// Clear input and hide search box and suggestions on mobile
clearIcon.addEventListener('click', () => {
    searchInput.value = '';
    clearIcon.style.display = 'none';
    spinner.style.display = 'none';
    suggestionsBox.style.display = 'none';
    if (window.innerWidth <= 900) {
        searchBox.classList.remove('active');
        mobileSearchIcon.classList.remove('active');
    }
});

// Show/hide clear icon, spinner, and suggestions based on input
searchInput.addEventListener('input', () => {
    if (searchInput.value.length > 0) {
        const fPageUrl = aiSearch.search_results_page_url;
        const isFullPage = window.location.href.includes(fPageUrl);

        if (isFullPage && fPageUrl != ""){
            // Do nothing special for full page
        } else {
            spinner.style.display = 'block';
        }
    } else {
        clearIcon.style.display = 'none';
        spinner.style.display = 'none';
        /* CHANGE: Hide suggestions box when input is empty */
        suggestionsBox.style.display = 'none';
    }
});

// Handle window resize to ensure correct visibility
window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
        searchBox.classList.remove('active');
        mobileSearchIcon.classList.remove('active');
        /* CHANGE: Maintain clear icon and suggestions box visibility on resize to desktop */
        clearIcon.style.display = searchInput.value.length > 0 ? 'none' : 'none';
        spinner.style.display = 'none';
    }
});
