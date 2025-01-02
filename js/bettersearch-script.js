// jQuery(document).ready(function ($) {
//     console.log("Better Search admin script loaded.");

// });


document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('bettersearch-input');
    const resultsContainer = document.getElementById('ai-search-suggestions-bs');
    const nonce = aiSearch.nonce; // Localized nonce for security
    const searchLimit = aiSearch.search_limit; // Limit for each result type
    const searchDelay = aiSearch.search_delay; // Limit for each result type
    const apiUrl = aiSearch.api_url; // API URL from settings
    const apiKey = aiSearch.api_key; // API key from settings
    const search_type = aiSearch.search_type;
    const filteredData = "license_type!=Private";

    const $ = jQuery;

    
    

    if (searchInput.value === " ") {
        return;
    };
    
    // Debounced search input handler
    const handleSearch = _.debounce(function () {

        const query = searchInput.value.trim();
        // Show spinner and hide cross icon
        $('#loading-spinner').show();
        $('#ai-search-clear').hide();


        if (query.length < 3) {
            // Clear results if the query is too short
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            $('#loading-spinner').hide();
            $('#ai-search-clear').show();
            return;
        }



        // Fetch suggestions via AJAX
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey, 
            },

            body: JSON.stringify({
                Query: query,
                SearchType: search_type, 
                Filter: filteredData,
                Offset: 0,
                Limit: 20,
                nonce: nonce,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                // Hide spinner and show cross icon
                $('#loading-spinner').hide();
                $('#ai-search-clear').show();
 
                if (data.status !== 'success') {
                    $('#ai-search-suggestions-bs').html(`<div class="error">${data.message}</div>`).show();
                    return;
                }


                resultsContainer.style.display = 'block';
                const categorizedResults = {
                    lessons: [],
                    features: [],
                    helpcenter: [],
                    articles: []
                };

                // Categorize results based on asset type
                data.data.forEach(item => {

                    if (item.asset_type === 'Courses' || item.asset_type === 'Video lesson' || item.asset_type === 'Non-Video lesson') {
                        categorizedResults.lessons.push(item);
                    } else if (item.asset_type === 'Feature') {
                        categorizedResults.features.push(item);
                    } else if (item.asset_type === 'Help Center') {
                        categorizedResults.helpcenter.push(item);
                    } else {
                        categorizedResults.articles.push(item);
                    }
                });
                
                function getThumbnail(thumbnail_url) {
                    // Check if the thumbnail URL is empty
                    return thumbnail_url === "" || !thumbnail_url
                        ? `${aiSearch.plugin_url}assets/images/default-thumbnail.png`  // Default image
                        : thumbnail_url;  // If there's a valid thumbnail URL, return it
                }



                let html = '';
                // Handle Features Section
                if (!_.isEmpty(categorizedResults.features)) {
                    html += `<div class="container">
                                    <div class="row">
                                        <div class="col-sm-4 category-title">Features </div>
                                    </div>
                            </div>`;
                    _.take(categorizedResults.features, searchLimit).forEach((feature) => {
                        const thumbnail = getThumbnail(feature.getThumbnail);
                        html += `
                        <div class="container">
                        <div class="ai-search-suggestions row">
                            <div class="col-sm-1 text-md-end px-0 my-auto">
                                <a href="${feature.url}" target="_blank">
                                    <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
                                </a>
                            </div>
                                <div class="col-sm-10 d-flex align-items-center search-title px-0">
                            <a href="${feature.url}" target="_blank">
                                   <h5> ${feature.title}</h5>  
								 
                            </a>
                                </div>
                                </div>
                        </div>`;
                    });
                    html += `<hr>`;
                }

                // Handle Course/Lessons section
                if (!_.isEmpty(categorizedResults.lessons)) {
                    html += ` <div class="container">
                                    <div class="row">
                                        <div class="col-sm-4 category-title">Course/Lessons</div>
                                    </div>
                            </div>`;
                        
                        // Sort lessons so "Course" items appear first
                        // const sortedLessons = categorizedResults.lessons.sort((a, b) => {
                        //     if (a.asset_type === "Courses" || b.asset_type !== "Courses") return -1; // "Courses" comes first
                        //     if (a.asset_type !== "Courses" || b.asset_type === "Courses") return 1;  // Other types come later
                        //     return 0; // Maintain relative order for other types
                        // });

                    _.take(categorizedResults.lessons, searchLimit).forEach((lesson) => {
                        const thumbnail = lesson.asset_type === "Video lesson"
                                            ? `${aiSearch.plugin_url}assets/images/Video-lesson.png`
                                            : lesson.asset_type === "Non-Video lesson" || lesson.asset_type === "Courses"
                                                ? `${aiSearch.plugin_url}assets/images/Non-Video-Lesson.png`
                                                : `${lesson.thumbnail_url}`;

                                console.log ('<===Here is the License Type for a course===>' + lesson.license_type);



                        html += `
                        <div class="container">
                        <div class="ai-search-suggestions row">
                        <div class="col-sm-1 text-md-end px-0 my-auto">
                            <a href="${lesson.url}" target="_blank">
                                <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
                            </a>
                        </div>
                            <div class="col-sm-10 d-flex align-items-center search-title px-0">
                        <a href="${lesson.url}" target="_blank">
                        <p class="asset-type my-0 mx-1" data-type="${lesson.category}" >${lesson.category}</p>
                               <h5> ${lesson.title}</h5>  
                        </a>
                            </div>
                            </div>
                    </div>`;
                    });
                    html += `<hr>`;
                }

                // Handle Misc Section
                if (!_.isEmpty(categorizedResults.articles)) {
                    html += `<div class="container">
                                <div class="row">
                                        <div class="col-sm-4 category-title">Misc</div>
                                </div>
                            </div>`;
                    _.take(categorizedResults.articles, searchLimit).forEach((article) => {
                        const thumbnail = article.thumbnail_url === "" || null
                                            ? `${aiSearch.plugin_url}assets/images/Default-Misc.png`
                                            : article.thumbnail_url;
                        html += `
						<div class="container"> 
                                <div class="ai-search-suggestions row">
                                    <div class="col-sm-1 text-md-end px-0 my-auto">
                                        <a href="${article.url}" target="_blank">
                                            
                                            <div class="ai-thumbnail" style="background-image: url('${thumbnail}');"></div>
                                        </a>
                                    </div>
                                        <div class="col-sm-10 d-flex align-items-center search-title px-0">
                                    <a href="${article.url}" target="_blank">
                                    <p class="asset-type my-0 mx-1" data-type="${article.asset_type}" >${article.asset_type}</p>	
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
                    html += `<div class="container">
                                    <div class="row">
                                        <div class="col-sm-4 category-title">Knowledge Base </div>
                                    </div>
                            </div>`;
                    _.take(categorizedResults.helpcenter, searchLimit).forEach((help_center) => {

                        html += `
						<div class="container"> 
                        <div class="ai-search-suggestions row">
                            <div class="col-sm-1 text-md-center px-0 my-auto">
                                <a href="${help_center.url}" target="_blank">
									
                                    <div class="ai-thumbnail-help"><i class="fa-solid fa-question"></i></div>
                                </a>
                            </div>
                                <div class="col-sm-10 d-flex align-items-center search-title px-0">
                            <a href="${help_center.url}" target="_blank">
                            <p class="asset-type my-0 mx-1" >FAQ - Knowledge Base</p>
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
            .catch((error) => {
                $('#loading-spinner').hide();

                // Check if the error has a response
                if (error.response && error.response.data) {
                    const errorMessage = error.response.data.message || 'Error fetching results.';
                    const errorDetails = error.response.data.error_details || 'No additional error details available.';

                    // Display the error message and details
                    resultsContainer.innerHTML = `
                        <div class="error">
                            <p>${errorMessage}</p>
                            <p><strong>Details:</strong> ${errorDetails}</p>
                        </div>
                    `;
                } else {
                    // Fallback error message if no specific response is available
                    resultsContainer.innerHTML = `<div class="error">Unknown error occurred.</div>`;
                }
            });

    }, searchDelay); // Debounce for better performance

    // Attach event listener to the input
    searchInput.addEventListener('input', handleSearch);


    // Clear search box and suggestions
    $('#ai-search-clear').on('click', function () {
        $('#bettersearch-input').val(''); // Clear the input field
        $('#ai-search-suggestions-bs').empty().hide(); // Clear and hide the suggestions box
    });
    
});