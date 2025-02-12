
// Simulate 404 error manually
// const simulate404Error = () => {
//     return new Promise((resolve, reject) => {
//         // Simulate a 404 response
//         reject(new Error("Server responded with status: 404"));
//     });
// };


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
 
    const $ = jQuery;

// Fetch Filtered Lessons API
const fetchFilteredLessons = (query) => {
    // const controller = new AbortController();
    // const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout for 5 seconds

    return fetch(apiUrl, {
        // signal: controller.signal,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify({
            Query: query,
            SearchType: search_type,
            Filter: "(asset_type='Courses') AND (license_type!=Private)",
            Offset: 0,
            Limit: c_search_limit,
            nonce: nonce,
        }),
    })
    .then(response => {
        return response.json();
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
        }else if (error.name === 'AbortError') {
            error.message = 'Request timed out. Please try again later.';
        } else if (error.message.includes('CORS')) {
            error.message = 'CORS error: The request has been blocked. No "Access-Control-Allow-Origin" header found.';
        }else if(error.message === 'Failed to fetch') {
            error.message = 'API Key/ API URL is not Correct';
        }
        $('#loading-spinner').hide();
        resultsContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
        resultsContainer.style.display = 'block';  // Ensure the container is visible
    })
    // .finally(() => {
    //     clearTimeout(timeoutId); // Cleanup timeout if request completes
    // });
};

    // const fetchFilteredLessons = (query) => {
    //     // API Call for Filtered Lessons
    //     return fetch(apiUrl, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'x-api-key': apiKey,
    //         },
    //         body: JSON.stringify({
    //             Query: query,
    //             SearchType: search_type,
    //             Filter: "(asset_type='Courses') AND  (license_type!=Private)",
    //             Offset: 0,
    //             Limit: c_search_limit,
    //             nonce: nonce,
    //         }),
    //     }).then(response => {
    //         return response.json();
    //     })
    // };

    // Debounced search input handler
    const handleSearch = _.debounce(function () {
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

        // Fetch both suggestions and filtered lessons in parallel
        Promise.all([
            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    Query: query,
                    SearchType: search_type,
                    Filter: "asset_type!='Courses'",
                    Offset: 0,
                    Limit: 20,
                    nonce: nonce,
                }),
            }).then(response => {
                return response.json();
            }),
            
            fetchFilteredLessons(query),
        ])
        .catch((error) => {
            if (error.message.includes("404")) {
                error.message = 'Requested resource not found! Please try again!';
            } else if (error.message.includes("400")) {
                error.message = 'Bad request. Please check the request parameters.';
            } else if (error.message.includes("500")) {
                error.message = 'Internal server error. Please try again later.';
            } else if (error.message.includes("405")) {
                error.message = 'Method not allowed. Please check the API endpoint.';
            }else if (error.name === 'AbortError') {
                error.message = 'Request timed out. Please try again later.';
            } else if (error.message.includes('CORS')) {
                error.message = 'CORS error: The request has been blocked. No "Access-Control-Allow-Origin" header found.';
            }else if(error.message === 'Failed to fetch') {
                error.message = 'API Key/ API URL is not Correct';
            }
            $('#loading-spinner').hide();
            resultsContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
            resultsContainer.style.display = 'block';  // Ensure the container is visible
        })
            .then(([suggestionsData, filteredLessonsData]) => {
                $('#loading-spinner').hide();
                $('#ai-search-clear').show();

                if (suggestionsData.status !== 'success' || filteredLessonsData.status !== 'success') {
                    $('#ai-search-suggestions-bs').html(`<div class="error">${suggestionsData.message || filteredLessonsData.message}</div>`).show();
                    return;
                }

                resultsContainer.style.display = 'block';
                const categorizedResults = {
                    lessons: filteredLessonsData.data,
                    features: [],
                    helpcenter: [],
                    articles: [],
                };
                // Categorize remaining results based on asset type
                suggestionsData.data.forEach((item) => {
                    // console.log ("Items Are there: ", item.asset_type);
                    // console.log ("Items Are there: ", item.title);
                    if (item.asset_type === 'Video lesson' || item.asset_type === 'Non-Video lesson')
                    {
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
                    html += `<div >
                                    <div >
                                        <div class="category-title">Features </div>
                                    </div>
                            </div>`;
                    _.take(categorizedResults.features, searchLimit).forEach((feature) => {
                        const thumbnail = getThumbnail(feature.thumbnail_url);
                        html += `
                        <div class="ai-search-suggestions">
                            <div>
                                <a href="${feature.url}" target="_blank">
                                    <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
                                </a>
                            </div>
                                <div class="search-title">
                            <a href="${feature.url}" target="_blank">
                                   <h5> ${feature.title}</h5>  
                            </a>
                                </div>
                        </div>`;
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
                            _.take(categorizedResults.lessons, searchLimit).forEach((lesson) => {
                                                    const thumbnail = lesson.asset_type === "Courses"
                                                                        ? `<div class="ai-thumbnail" style="background-image: url('${lesson.thumbnail_url}');"></div>` // Use lesson.thumbnail_url if asset_type is "courses"
                                                                        : lesson.asset_type === "Video lesson"
                                                                        // ? `${aiSearch.plugin_url}assets/images/Video-lesson.png`
                                                                        // : `${aiSearch.plugin_url}assets/images/Non-Video-Lesson.png`;
                                                                        ? `<div class="bs-thumbnail-lesson"><i class="fa-light fa-play"></i></div>`
                                                                        : `<div class="bs-thumbnail-lesson"><i class="fa-light fa-book"></i></i></div>`;
                
                                                                        // Determine if the asset_type is "Video lesson"
                                                                        const isVideoLesson = lesson.asset_type === "Video lesson";
                                                                        
                                                                        const videoUrl = isVideoLesson ? lesson.external_url : ""; 
                                                                        const urlMatch = isVideoLesson ? videoUrl.match(/vimeo\.com\/(\d+)/) : null;
                                                                        const vimeoId = urlMatch ? urlMatch[1] : "";
                                                                        
                                                                        
                                                                        const videoMarkup = isVideoLesson
                                                                            ? `<div class="video-icon">
                                                                                    <i class="fa-light fa-play"></i> Play Video
                                                                            </div>`
                                                                            : "";
                
                        html += `
                        <a href="${lesson.asset_type === 'Video lesson' ? 'javascript:void(0);' : lesson.url}" 
                                    ${lesson.asset_type !== 'Video lesson' ? 'target="_blank"' : ''}
                                    ${lesson.asset_type === 'Video lesson' ? `onClick="openLessonPreviewModal('${vimeoId}','${lesson.title}','${lesson.url}')"` : ''}>
                            <div> 
                                <div class="ai-search-suggestions">
                                    <div>
                                     ${thumbnail}
                                    </div>
                                    <div class="search-title px-0">
                                            <p class="asset-type" data-type="${lesson.asset_type}">${lesson.asset_type}</p>    
                                            <h5>${lesson.title}</h5> 
                                        ${videoMarkup}
                                    </div>
                                </div>
                            </div>
                            </a>`;
                            // console.log("Vimeo ID: " + lesson.external_url);
                    });
                    html += `<hr>`;
                }
                // if (!_.isEmpty(categorizedResults.lessons)) {
                //     html += ` <div >
                //                     <div >
                //                         <div class="category-title">Course/Lessons</div>
                //                     </div>
                //             </div>`;

                //         _.take(categorizedResults.lessons, searchLimit).forEach((lesson) => {
                //                     const thumbnail = lesson.asset_type === "Courses"
                //                                         ? lesson.thumbnail_url // Use lesson.thumbnail_url if asset_type is "courses"
                //                                         : lesson.asset_type === "Video lesson"
                //                                             ? `${aiSearch.plugin_url}assets/images/Video-lesson.png`
                //                                             : `${aiSearch.plugin_url}assets/images/Non-Video-Lesson.png`;
                                      
                //                 html += `
                //                 <div >
                //                 <div class="ai-search-suggestions">
                //                 <div >
                //                     <a href="${lesson.url}" target="_blank">
                //                         <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
                //                     </a>
                //                 </div>
                //                     <div class="search-title">
                //                 <a href="${lesson.url}" target="_blank">
                //                 <p class="asset-type" data-type="${lesson.category}" >${lesson.category}</p> 
                //                        <h5> ${lesson.title}</h5>  
                //                 </a>
                //                     </div>
                //                     </div>
                //                 </div>`;
                            
                //         });
                //         html += `<hr>`;
                //     }

                // Handle Misc Section
                if (!_.isEmpty(categorizedResults.articles)) {
                    html += `<div >
                                <div >
                                        <div class="category-title">Misc</div>
                                </div>
                            </div>`;
                    _.take(categorizedResults.articles, searchLimit).forEach((article) => {
                        const thumbnail = article.thumbnail_url === "" || null
                                            ? `${aiSearch.plugin_url}assets/images/Default-Misc.png`
                                            : article.thumbnail_url;
                        html += `
						<div > 
                                <div class="ai-search-suggestions">
                                    <div >
                                        <a href="${article.url}" target="_blank">
                                            <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
                                        </a>
                                    </div>
                                        <div class="search-title px-0">
                                    <a href="${article.url}" target="_blank">
                                    <p class="asset-type" data-type="${article.asset_type}" >${article.asset_type}</p>	
                                        <h5> ${article.title}</h5>  
                                    </a>
                                        </div>
                                </div>
							</div>`;
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
						<div > 
                        <div class="ai-search-suggestions">
                            <div >
                                <a href="${help_center.url}" target="_blank">
									
                                    <div class="bs-thumbnail-help"><i class="fa-regular fa-question"></i></div>
                                </a>
                            </div>
                                <div class="search-title px-0">
                            <a href="${help_center.url}" target="_blank">
                            <p class="asset-type">FAQ - Knowledge Base</p>
                                   <h5> ${help_center.title}</h5>                                     
                            </a>
                                </div>
                        </div>
							</div>`;
                    });
                    html += `<hr>`;
                }
                

                if (_.isEmpty(html)) {
                    html = '<div class="ai-search-suggestions">No results found.</div>';
                }

                resultsContainer.innerHTML = html;
            })
            // .catch((error) => {
            //     $('#loading-spinner').hide();
            //     resultsContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
            // });
    }, searchDelay);

    // Attach event listener to the input
    searchInput.addEventListener('input', handleSearch);

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
});