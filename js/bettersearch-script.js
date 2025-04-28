document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('bettersearch-input');
    const resultsContainer = document.getElementById('ai-search-suggestions-bs');
    const nonce = aiSearch.nonce;
    const searchLimit = aiSearch.search_limit;
    const searchDelay = aiSearch.search_delay;
    const apiUrl = aiSearch.api_url;
    const apiKey = aiSearch.api_key;
    const search_type = aiSearch.search_type;
    const c_search_limit = aiSearch.c_search_limit;
    const fPageUrl = aiSearch.search_results_page_url;
    // const courseAndLessonIds = [];
 
    const $ = jQuery;

    const isFullPage = window.location.href.includes(fPageUrl);
    
    if (isFullPage && decodedQuery.trim() !== '') {
        resultsContainer.style.display = 'none';
        $('#loading-spinner').hide();
        $('#ai-search-clear').hide();
    } else {
        $("#bettersearch-input").keypress(function(event) {
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
            }
        }

        // Show results container when input is focused
        searchInput.addEventListener('focus', function() {
            if (searchInput.value.trim().length >= 3) {
                resultsContainer.style.display = 'block';
            }
            document.addEventListener('click', handleClickOutside);
        });

        // Hide results when clicking the clear button
        $('#ai-search-clear').on('click', function() {
            resultsContainer.style.display = 'none';
            document.removeEventListener('click', handleClickOutside);
        });

        // Modified fetchFilteredLessons to use dynamic course IDs
        const fetchFilteredLessons = async (query, courseAndLessonIds) => {

            console.log("fetchFilteredLessons Function Called ====> 3");

            try {
                // Get accessible course IDs
                //const courseIds = await getAccessibleCoursesJourney();
                //console.log("Combined Array for 0 index===>>> ", courseAndLessonIds);
                // console.log ("Course ids Length", courseIds);
                const courseFilter = `(asset_type='Courses' AND specific_metadata.id IN [${courseAndLessonIds[0].join(',')}])`;
                   
                
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
                return response.json();
            } catch (error) {
                console.error('Error fetching filtered lessons:', error);
                return {
                    status: 'error',
                    message: error.message || 'Failed to fetch courses',
                    data: []
                };
            }
        };

        // Simplified function to get course IDs
        async function getAccessibleCoursesJourney(query) {
            console.log("getAccessibleCoursesJourney Function Called ====> 2");


            try {
                const course_id = { courseIds: [203,222,59,353,300,427,459,123,33,461,215,68,376,160,186,263,291,311,451,464] }; // Temporary courseIds
        
                const itemStr = localStorage.getItem('currentToken');
                //console.log("Token Value ya Token name:", itemStr);
        
                const tokenAsKey = localStorage.getItem(itemStr);
        
                let accessibleCoursesList = [];
        
                if (!tokenAsKey) {
                     // Api call will be placed here against token to get the list of accessible courses list
                    localStorage.setItem(itemStr, JSON.stringify(course_id));
                    //console.log("Array Store hogai:", course_id);
                    accessibleCoursesList = course_id.courseIds;
                } else {
                    const item = JSON.parse(tokenAsKey);
                    //console.log("Course Ids:", item.courseIds.length);
                    accessibleCoursesList = item.courseIds;
                }
        
                const courseIds = accessibleCoursesList;
                const courseFilter = `(asset_type='Courses' AND specific_metadata.id IN [${courseIds.join(',')}])`;
        
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
                        //Limit: c_search_limit,
                        nonce: nonce,
                    }),
                });
        
                if (!response.ok) {
                    throw new Error(`API response not OK: ${response.status}`);
                }
        
                const data = await response.json();
                //console.log("API ka Response:", data);
        
                // ✅ Extract all lesson_ids from each result
                const allLessonIds = [];
        
                data.data.forEach(item => {
                    if (
                        item.specific_metadata &&
                        Array.isArray(item.specific_metadata.lesson_id)
                    ) {
                        allLessonIds.push(...item.specific_metadata.lesson_id);
                    }
                });
                
                //console.log("Extracted Course IDs:", courseIds);

                const uniqueLessonIds = _.uniq(allLessonIds);
                localStorage.setItem("uniqueLessonIds", JSON.stringify(uniqueLessonIds));
                //console.log("Extracted Lesson IDs:", uniqueLessonIds);

                const combinedArray = [courseIds, uniqueLessonIds];
                //console.log("Extracted Lesson IDs:", combinedArray);


        
                return combinedArray;
        
            } catch (e) {
                console.error("Error getting course IDs or lessons:", e);
                return [];
            }
        }

        // Debounced search input handler
        const handleSearch = _.debounce(async function () {
            console.log("HandleSearch Function Called ====> 1");
            const courseAndLessonIds = await getAccessibleCoursesJourney();

            const query = searchInput.value.trim();
            $('#loading-spinner').show();
            $('#ai-search-clear').hide();

            if (query.length < 3) {
                resultsContainer.innerHTML = '';
                resultsContainer.style.display = 'none';
                $('#loading-spinner').hide();
                $('#ai-search-clear').show();
                return;
            }
            


            //console.log("Extracted Lesson IDs in 2nd API:", courseAndLessonIds);

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
                    
                    // Filtered courses fetch (now with dynamic course IDs)
                    fetchFilteredLessons(query, courseAndLessonIds)
                ]);

                $('#loading-spinner').hide();
                $('#ai-search-clear').show();

                if (suggestionsData.status !== 'success' || filteredLessonsData.status !== 'success') {
                    $('#ai-search-suggestions-bs').html(`<div class="error">${suggestionsData.message || filteredLessonsData.message}</div>`).show();
                    return;
                }

                // Process and display results (your existing code remains unchanged)
                resultsContainer.style.display = 'block';
                const categorizedResults = {
                    lessons: filteredLessonsData.data || [],
                    features: [],
                    helpcenter: [],
                    articles: [],
                };

                // Categorize remaining results based on asset type
                suggestionsData.data.forEach((item) => {
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
                // Handle Features Section
                if (!_.isEmpty(categorizedResults.features)) {
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
                        <a href="${lesson.asset_type === 'Video lesson' ? 'javascript:void(0);' : lesson.url}" 
                                    ${lesson.asset_type === 'YouTube video' ? 'target="_blank"' : ''}
                                    ${lesson.asset_type === 'Video lesson' ? `onClick="openLessonPreviewModal('${vimeoId}','${lesson.title}','${lesson.url}','${lesson.specific_metadata.id}')"` : ''}>
                            <div> 
                                <div class="ai-search-suggestions">
                                    <div>
                                     ${thumbnail}
                                    </div>
                                    <div class="search-title px-0">
                                            <p class="asset-type" data-type="${lesson.asset_type}">${category}</p>    
                                            <h5>${lesson.title}(${lesson.specific_metadata.id})</h5> 
                                        ${videoMarkup}
                                    </div>
                                </div>
                            </div>
                            </a>`;
                    });
                    html += `<hr>`;
                }
                
                // Handle Misc Section
                if (!_.isEmpty(categorizedResults.articles)) {
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
                        <a href="${article.url}" ${article.asset_type === 'Article' ? 'target="_blank"' : ''}>
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
                    html += `<div >
                                    <div >
                                        <div class="category-title">Knowledge Base </div>
                                    </div>
                            </div>`;
                    _.take(categorizedResults.helpcenter, searchLimit).forEach((help_center) => {
                        html += `
                        <a href="${help_center.url}" target="_blank">
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
               
                const encodedQuery = encodeURIComponent(query);
                    const linkHTML = `  
                    <div class="full-page-link">
                        <a href="${fPageUrl}?q=${encodedQuery}" class="full-search-page">
                        <i class="fa-light fa-arrow-up-right"></i> Open Search Page
                        </a>
                        </div>
                    `;
                    html += linkHTML;

                if (_.isEmpty(html)) {
                    html = '<div class="ai-search-suggestions">No results found.</div>';
                }

                resultsContainer.innerHTML = html;

            } catch (error) {
                console.error('Search error:', error);
                $('#loading-spinner').hide();
                resultsContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
                resultsContainer.style.display = 'block';
            }
        }, searchDelay);

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
            $('#bettersearch-input').val('');
            $('#ai-search-suggestions-bs').empty().hide();
        });

        function getThumbnail(thumbnail_url) {
            return thumbnail_url === "" || !thumbnail_url
                ? `${aiSearch.plugin_url}assets/images/default-thumbnail.png`
                : thumbnail_url;
        }
    }
});











































// document.addEventListener('DOMContentLoaded', function () {
//     const searchInput = document.getElementById('bettersearch-input');
//     const resultsContainer = document.getElementById('ai-search-suggestions-bs');
//     const nonce = aiSearch.nonce;
//     const searchLimit = aiSearch.search_limit;
//     const searchDelay = aiSearch.search_delay;
//     const apiUrl = aiSearch.api_url;
//     const apiKey = aiSearch.api_key;
//     const search_type = aiSearch.search_type;
//     const c_search_limit = aiSearch.c_search_limit;
//     const fPageUrl = aiSearch.search_results_page_url;
 
//     const $ = jQuery;

        
    
    
//     const isFullPage = window.location.href.includes(fPageUrl);
    
//     if (isFullPage && decodedQuery.trim() !== '') {
//         resultsContainer.style.display = 'none';
//         $('#loading-spinner').hide();
//         $('#ai-search-clear').hide();
        
//     } else {

//         $("#bettersearch-input").keypress(function(event) {
//             if (event.key === "Enter") { // Check if Enter key is pressed
//                 event.preventDefault();
//                 let query = encodeURIComponent($(this).val().trim());
//                 window.location.href = `${fPageUrl}?q=${query}`;
//             }
            
//         });

// // Click outside to close functionality
// function handleClickOutside(event) {
//     if (!resultsContainer.contains(event.target) && 
//         event.target !== searchInput && 
//         !searchInput.contains(event.target)) {
//         resultsContainer.style.display = 'none';
//     }
// }

// // Show results container when input is focused
// searchInput.addEventListener('focus', function() {
//     if (searchInput.value.trim().length >= 3) {
//         resultsContainer.style.display = 'block';
//     }
//     document.addEventListener('click', handleClickOutside);
// });

// // Hide results when clicking the clear button
// $('#ai-search-clear').on('click', function() {
//     resultsContainer.style.display = 'none';
//     document.removeEventListener('click', handleClickOutside);
// });





// // Fetch Filtered Lessons API
// const fetchFilteredLessons = (query) => {
    

//     return fetch(apiUrl, {
//         // signal: controller.signal,
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'x-api-key': apiKey,
//         },
//         body: JSON.stringify({
//             Query: query,
//             SearchType: search_type,
//             Filter: "(asset_type='Courses') AND (license_type!=Private)",
//             Offset: 0,
//             Limit: c_search_limit,
//             nonce: nonce,
//         }),
//     })
//     .then(response => {
//         return response.json();
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
//         }else if (error.name === 'AbortError') {
//             error.message = 'Request timed out. Please try again later.';
//         } else if (error.message.includes('CORS')) {
//             error.message = 'CORS error: The request has been blocked. No "Access-Control-Allow-Origin" header found.';
//         }else if(error.message === 'Failed to fetch') {
//             error.message = 'API Key/ API URL is not Correct';
//         }
//         $('#loading-spinner').hide();
//         resultsContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
//         resultsContainer.style.display = 'block';  // Ensure the container is visible
//     })
    
// };

    
//     // Debounced search input handler
//     const handleSearch = _.debounce(function () {
//         const query = searchInput.value.trim();
//         $('#loading-spinner').show();
//         $('#ai-search-clear').hide();

//         if (query.length < 3) {
//             resultsContainer.innerHTML = '';
//             resultsContainer.style.display = 'none';
//             $('#loading-spinner').hide();
//             $('#ai-search-clear').show();
//             return;
//         }

//         // Fetch both suggestions and filtered lessons in parallel
//         Promise.all([
//             fetch(apiUrl, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'x-api-key': apiKey,
//                 },
//                 body: JSON.stringify({
//                     Query: query,
//                     SearchType: search_type,
//                     Filter: "asset_type!='Courses'",
//                     Offset: 0,
//                     Limit: 20,
//                     nonce: nonce,
//                 }),
//             }).then(response => {
//                 return response.json();
//             }),
            
//             fetchFilteredLessons(query),
//         ])
//         .catch((error) => {
//             if (error.message.includes("404")) {
//                 error.message = 'Requested resource not found! Please try again!';
//             } else if (error.message.includes("400")) {
//                 error.message = 'Bad request. Please check the request parameters.';
//             } else if (error.message.includes("500")) {
//                 error.message = 'Internal server error. Please try again later.';
//             } else if (error.message.includes("405")) {
//                 error.message = 'Method not allowed. Please check the API endpoint.';
//             }else if (error.name === 'AbortError') {
//                 error.message = 'Request timed out. Please try again later.';
//             } else if (error.message.includes('CORS')) {
//                 error.message = 'CORS error: The request has been blocked. No "Access-Control-Allow-Origin" header found.';
//             }else if(error.message === 'Failed to fetch') {
//                 error.message = 'API Key/ API URL is not Correct';
//             }
//             $('#loading-spinner').hide();
//             resultsContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
//             resultsContainer.style.display = 'block';  // Ensure the container is visible
//         })
//             .then(([suggestionsData, filteredLessonsData]) => {
//                 $('#loading-spinner').hide();
//                 $('#ai-search-clear').show();

//                 if (suggestionsData.status !== 'success' || filteredLessonsData.status !== 'success') {
//                     $('#ai-search-suggestions-bs').html(`<div class="error">${suggestionsData.message || filteredLessonsData.message}</div>`).show();
//                     return;
//                 }

//                 resultsContainer.style.display = 'block';
//                 const categorizedResults = {
//                     lessons: filteredLessonsData.data,
//                     features: [],
//                     helpcenter: [],
//                     articles: [],
//                 };
//                 // Categorize remaining results based on asset type
//                 suggestionsData.data.forEach((item) => {
//                     if (item.asset_type === 'Video lesson' || item.asset_type === 'Non-Video lesson')
//                     {
//                         categorizedResults.lessons.push(item);
//                     } else if (item.asset_type === 'Feature') {
//                         categorizedResults.features.push(item);
//                     } else if (item.asset_type === 'Help Center') {
//                         categorizedResults.helpcenter.push(item);
//                     } else {
//                         categorizedResults.articles.push(item);
//                     }
//                 });
                

//                 let html = '';
//                 // Handle Features Section
//                 if (!_.isEmpty(categorizedResults.features)) {
//                     html += `<div >
//                                     <div >
//                                         <div class="category-title">Features </div>
//                                     </div>
//                             </div>`;
//                     _.take(categorizedResults.features, searchLimit).forEach((feature) => {
//                         const thumbnail = getThumbnail(feature.thumbnail_url);
//                         html += `
//                         <a href="${feature.url}" >
//                         <div class="ai-search-suggestions">
//                             <div>
//                                     <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
//                             </div>
//                                 <div class="search-title">
                            
//                                    <h5> ${feature.title}</h5>  
//                                    </div>
//                                    </div>
//                                    </a>
//                                    `;
//                     });
//                     html += `<hr>`;
//                 }

//                 // Handle Course/Lessons Section
//                 if (!_.isEmpty(categorizedResults.lessons)) {
//                     html += `<div>
//                                 <div>
//                                     <div class="category-title">Course/Lessons</div>
//                                 </div>
//                             </div>`;
//                             const uniqueLessons = _.uniqBy(categorizedResults.lessons, (lesson) => {
//                                 if (lesson.asset_type === "Video lesson") {
//                                     const videoUrl = lesson.external_url || "";
//                                     const urlMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
//                                     return urlMatch ? urlMatch[1] : lesson.url; // Use Vimeo ID if available, otherwise use URL
//                                 }
//                                 return lesson.url; 
//                             });
//                             _.take(uniqueLessons, searchLimit).forEach((lesson) => {
//                                                     const thumbnail = lesson.asset_type === "Courses"
//                                                                         ? `<div class="ai-thumbnail-course" style="background-image: url('${lesson.thumbnail_url}');"></div>` // Use lesson.thumbnail_url if asset_type is "courses"
//                                                                         : lesson.asset_type === "Video lesson"
//                                                                         ? `<div class="bs-thumbnail-lesson"><i class="fa-light fa-play"></i></div>`
//                                                                         : `<div class="bs-thumbnail-lesson"><i class="fa-light fa-book"></i></i></div>`;
                
//                                                                         // Determine if the asset_type is "Video lesson"
//                                                                         const isVideoLesson = lesson.asset_type === "Video lesson";
                                                                        
//                                                                         const videoUrl = isVideoLesson ? lesson.external_url : ""; 
//                                                                         const urlMatch = isVideoLesson ? videoUrl.match(/vimeo\.com\/(\d+)/) : null;
//                                                                         const vimeoId = urlMatch ? urlMatch[1] : "";
                                                                        
                                                                        
//                                                                         const videoMarkup = isVideoLesson
//                                                                             ? `<div class="video-icon">
//                                                                                     <i class="fa-light fa-play"></i> Play Video
//                                                                             </div>`
//                                                                             : "";

//                                 const category = lesson.asset_type === "Courses" ? lesson.category : lesson.asset_type;
                
//                         html += `
//                         <a href="${lesson.asset_type === 'Video lesson' ? 'javascript:void(0);' : lesson.url}" 
//                                     ${lesson.asset_type === 'YouTube video' ? 'target="_blank"' : ''}
//                                     ${lesson.asset_type === 'Video lesson' ? `onClick="openLessonPreviewModal('${vimeoId}','${lesson.title}','${lesson.url}','${lesson.specific_metadata.id}')"` : ''}>
//                             <div> 
//                                 <div class="ai-search-suggestions">
//                                     <div>
//                                      ${thumbnail}
//                                     </div>
//                                     <div class="search-title ">
//                                             <p class="asset-type" data-type="${lesson.asset_type}">${category}</p>    
//                                             <h5>${lesson.title}</h5> 
//                                         ${videoMarkup}
//                                     </div>
//                                 </div>
//                             </div>
//                             </a>`;
//                     });
//                     html += `<hr>`;
//                 }
                

//                 // Handle Misc Section
//                 if (!_.isEmpty(categorizedResults.articles)) {
//                     html += `<div >
//                                 <div >
//                                         <div class="category-title">Content</div>
//                                 </div>
//                             </div>`;
//                     _.take(categorizedResults.articles, searchLimit).forEach((article) => {
//                         const thumbnail = article.thumbnail_url === "" || null
//                                             ? `${aiSearch.plugin_url}assets/images/Default-Misc.png`
//                                             : article.thumbnail_url;
//                         html += `
//                         <a href="${article.url}" ${article.asset_type === 'Article' ? 'target="_blank"' : ''}>
// 						<div > 
//                                 <div class="ai-search-suggestions">
//                                     <div >
                                        
//                                             <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
                                       
//                                     </div>
//                                         <div class="search-title ">
                                    
//                                     <p class="asset-type" data-type="${article.asset_type}" >${article.asset_type}</p>	
//                                         <h5> ${article.title}</h5>  
                                    
//                                         </div>
//                                 </div>
// 							</div>
//                             </a>`;
//                     });
//                     html += `<hr>`;
//                 }
//                 // Handle Help Center Section
//                 if (!_.isEmpty(categorizedResults.helpcenter)) {
//                     html += `<div >
//                                     <div >
//                                         <div class="category-title">Knowledge Base </div>
//                                     </div>
//                             </div>`;
//                     _.take(categorizedResults.helpcenter, searchLimit).forEach((help_center) => {

//                         html += `
//                         <a href="${help_center.url}" target="_blank">
//                             <div>
//                                 <div class="ai-search-suggestions">
//                                 <div>
//                                     <div class="bs-thumbnail-help">
//                                     <i class="fa-regular fa-question"></i>
//                                     </div>
//                                 </div>
//                                 <div class="search-title ">
//                                     <p class="asset-type">FAQ - Knowledge Base</p>
//                                     <h5> ${help_center.title}</h5>
//                                 </div>
//                                 </div>
//                             </div>
//                         </a>
//                                    `;
//                     });
//                     html += `<hr>`;
//                 }
               
//                 const encodedQuery = encodeURIComponent(query);
//                     const linkHTML = `  
//                     <div class="full-page-link">
//                         <a href="${fPageUrl}?q=${encodedQuery}" class="full-search-page">
//                         <i class="fa-light fa-arrow-up-right"></i> Open Search Page
//                         </a>
//                         </div>
//                     `;
//                     html += linkHTML;

//                 if (_.isEmpty(html)) {
//                     html = '<div class="ai-search-suggestions">No results found.</div>';
//                 }

//                 resultsContainer.innerHTML = html;
//             })
//     }, searchDelay);

//     // Attach event listener to the input
//     searchInput.addEventListener('input', handleSearch);
    
//     document.addEventListener("keydown", function (event) {
//         if (event.key === "/" && document.activeElement !== searchInput) {
//             event.preventDefault(); // Prevent typing "/" in the input
//             searchInput.focus();
//         }
//     });
//     // Clear search box and suggestions
//     $('#ai-search-clear').on('click', function () {
//         $('#bettersearch-input').val('');
//         $('#ai-search-suggestions-bs').empty().hide();
//     });

//     function getThumbnail(thumbnail_url) {
//         return thumbnail_url === "" || !thumbnail_url
//             ? `${aiSearch.plugin_url}assets/images/default-thumbnail.png`
//             : thumbnail_url;
//     }


// }
// });






// // const currentToken = localStorage.getItem('currentToken');

// async function getAccessibleCoursesJourney() {
//     try {
//         const response = await fetch('https://mocki.io/v1/6fe0b4f8-caf0-45a9-b61f-b710133e3bd5');
        
//         if (!response.ok) {
//             throw new Error('Network response was not ok');
//         }
        
//         const courses = await response.json(); // API se array mil gaya

//         // LocalStorage mein store karein
//         const now = Date.now();
//         const item = {
//             data: courses,
//             expiry: now + (0.1 * 60 * 1000) // 20 minutes
//         };
//         localStorage.setItem('accessible_courses', JSON.stringify(item));

//         return courses;

//     } catch (error) {
//         console.error('Error fetching courses:', error);
//         return null;
//     }
// }

// // Check if data exists and valid
// function checkAccessibleCourses() {
//     const itemStr = localStorage.getItem('accessible_courses');
//     if (!itemStr) {
//         console.log("No data");
//         return;
//     }

//     const item = JSON.parse(itemStr);
//     const now = Date.now();

//     if (now > item.expiry) {
//         localStorage.removeItem('accessible_courses');
//         console.log("No data");
//         return;
//     }

//     console.log("Data hai:", item.data);
// }

// // Jab check karna ho
// // checkAccessibleCourses();
// // const coursesIds = getAccessibleCoursesJourney(currentToken);

// // console.log(coursesIds);


// // // Get token
// // if (currentToken) {
// //     courseIdInAccessableCoursesJourney(currentToken);
// // } else {
// //     console.error('JWT Token missing!');
// // }