

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('bettersearch-input');
    const resultsContainer = document.getElementById('ai-search-suggestions-bs');
    const nonce = aiSearch.nonce;
    const searchLimit = aiSearch.search_limit;
    const searchDelay = aiSearch.search_delay;
    const apiUrl = aiSearch.api_url;
    const apiKey = aiSearch.api_key;
    const search_type = aiSearch.search_type;

    const $ = jQuery;

    const fetchFilteredLessons = (query) => {
        // API Call for Filtered Lessons
        return fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                Query: query,
                SearchType: search_type,
                Filter: "(asset_type='Courses') AND  (license_type!=Private)",
                Offset: 0,
                Limit: 20,
                nonce: nonce,
            }),
        }).then((response) => response.json());
    };

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
            }).then((response) => response.json()),
            fetchFilteredLessons(query),
        ])
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
                    html += `<div class="container">
                                    <div class="row">
                                        <div class="col-sm-4 category-title">Features </div>
                                    </div>
                            </div>`;
                    _.take(categorizedResults.features, searchLimit).forEach((feature) => {
                        const thumbnail = getThumbnail(feature.thumbnail_url);
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

                // Handle Course/Lessons Section
                if (!_.isEmpty(categorizedResults.lessons)) {
                    html += ` <div class="container">
                                    <div class="row">
                                        <div class="col-sm-4 category-title">Course/Lessons</div>
                                    </div>
                            </div>`;
                        
                        const sortedLessons = categorizedResults.lessons.sort((a, b) => {
                            if (a.asset_type === "Courses") return -1;
                            if (b.asset_type === "Courses") return 1;
                            return 0;
                        });

                        _.take(sortedLessons, searchLimit).forEach((lesson) => {
                                // console.log('Filtered Lessons Data Response:', lesson._rankingScoreDetails);
                                    const searchThreshold = parseFloat(lesson._rankingScoreDetails.words.score.toFixed(2));
                                    const thumbnail = lesson.asset_type === "Courses"
                                                        ? lesson.thumbnail_url // Use lesson.thumbnail_url if asset_type is "courses"
                                                        : lesson.asset_type === "Video lesson"
                                                            ? `${aiSearch.plugin_url}assets/images/Video-lesson.png`
                                                            : `${aiSearch.plugin_url}assets/images/Non-Video-Lesson.png`;
                                      
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
                                <p class="asset-type my-0 mx-1" data-type="${lesson.category}" >${lesson.category} ${lesson.asset_type === "Courses" ? `<span><b>(${searchThreshold})</b></span>` : ""}</p> 
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
                resultsContainer.innerHTML = `<div class="error">Error occurred: ${error.message || 'Unknown error'}</div>`;
            });
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