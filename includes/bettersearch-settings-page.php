<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Add admin menu
add_action('admin_menu', 'ai_search_add_admin_menu');

function ai_search_add_admin_menu()
{
    // Add the main menu
    add_menu_page(
        __('Better Search Settings', 'aisearch'),
        'Better Search',
        'manage_options',
        'ai_search_settings',
        'ai_search_render_settings_page',
        'dashicons-search',
        2
    );

    // Add a submenu for API Configuration
    add_submenu_page(
        'ai_search_settings',                  // Parent slug
        __('API Configuration', 'aisearch'),  // Page title
        'API Configuration',                  // Menu title
        'manage_options',                     // Capability
        'api_configuration',                  // Submenu slug
        'ai_search_render_settings_page' // Callback function
    );
}

// Remove the default duplicate submenu
function aisearch_remove_duplicate_submenu()
{
    // Remove the submenu that points to the same page as the main menu
    remove_submenu_page('ai_search_settings', 'ai_search_settings');
}
add_action('admin_menu', 'aisearch_remove_duplicate_submenu', 999);



// Register settings
add_action('admin_init', 'ai_search_register_settings');

function ai_search_register_settings()
{
    // Register a new setting
    register_setting('ai_search_settings_group', 'wp_aisearch_settings', 'ai_search_sanitize_settings');

    // Add a settings section
    add_settings_section(
        'ai_search_main_section',
        __('Better Search Configuration', 'aisearch'),
        'ai_search_section_callback',
        'ai_search_settings'
    );

    // Add a field for API URL
    add_settings_field(
        'api_url_field',
        __('API URL', 'aisearch'),
        'ai_search_api_url_field_callback',
        'ai_search_settings',
        'ai_search_main_section'
    );

    // Add a field for API Key
    add_settings_field(
        'api_key_field',
        __('API Key', 'aisearch'),
        'ai_search_api_key_field_callback',
        'ai_search_settings',
        'ai_search_main_section'
    );

    // Add a field for Accessible Journey URL
    add_settings_field(
        'accessible_journey_url',
        __('Accessible Journey URL', 'aisearch'),
        'ai_accessible_journey_url_field_callback',
        'ai_search_settings',
        'ai_search_main_section'
    );

   
    // Add a field for Search Results Limit
    add_settings_field(
        'search_limit_field',
        __('Search Results Limit', 'aisearch'),
        'ai_search_limit_field_callback',
        'ai_search_settings',
        'ai_search_main_section'
    );
    
    // Add a field for Corses Search Results Limit
    add_settings_field(
        'c_search_limit_field',
        __('Courses Search Results Limit', 'aisearch'),
        'ai_c_search_limit_field_callback',
        'ai_search_settings',
        'ai_search_main_section'
    ); 
     
    // Add a field for Search Delay
    add_settings_field(
        'search_delay_field',
        __('Search Delay (ms)', 'aisearch'),
        'ai_search_delay_field_callback',
        'ai_search_settings',
        'ai_search_main_section'
    );
    
    // Add a field for Search Precision
    add_settings_field(
        'search_precision_field',
        __('Search Type', 'aisearch'),
        'ai_search_precision_field_callback',
        'ai_search_settings',
        'ai_search_main_section'
    );

// Add a field for Search Results Page URL
add_settings_field(
    'search_results_page_url',
    __('Full Page Search Results Page URL', 'aisearch'),
    'ai_search_results_page_url_field_callback',
    'ai_search_settings',
    'ai_search_main_section'
);


}

// Section description
function ai_search_section_callback()
{
    echo '<p>' . __('Enter your API URL, API Key, and configure the search results limit and delay.', 'aisearch') . '</p>';
}

// Field callback for API URL
function ai_search_api_url_field_callback()
{
    $options = get_option('wp_aisearch_settings');
    $api_url = isset($options['api_url']) ? $options['api_url'] : '';
    echo '<input type="url" id="api_url" name="wp_aisearch_settings[api_url]" value="' . esc_attr($api_url) . '" class="regular-text" ' . '>';
}

// Field callback for API Key
function ai_search_api_key_field_callback()
{
    $options = get_option('wp_aisearch_settings');
    $api_key = isset($options['api_key']) ? $options['api_key'] : '';
    echo '<input type="text" id="api_key" name="wp_aisearch_settings[api_key]" value="' . esc_attr($api_key) . '" class="regular-text" ' .  '>';
}

// Field callback for Accessible Journey URL
function ai_accessible_journey_url_field_callback()
{
    $options = get_option('wp_aisearch_settings');
    $accessible_journey_url = isset($options['accessible_journey_url']) ? $options['accessible_journey_url'] : '';
    echo '<input type="url" id="accessible_journey_url" name="wp_aisearch_settings[accessible_journey_url]" value="' . esc_attr($accessible_journey_url) . '" class="regular-text">';
    echo '<p class="description">' . __('Enter the URL for Accessible Journey.', 'aisearch') . '</p>';
}

// Field callback for Search Results Limit
function ai_search_limit_field_callback()
{
    $options = get_option('wp_aisearch_settings');
    $search_limit = isset($options['search_limit']) ? $options['search_limit'] : 5; // Default to 5
    echo '<input type="number" id="search_limit" name="wp_aisearch_settings[search_limit]" value="' . esc_attr($search_limit) . '" class="regular-text" min="1" max="20">';
    echo '<p class="description">' . __('Set the maximum number of search results to display (1-20).', 'aisearch') . '</p>';
}

// Field callback for Search Threshold
function ai_c_search_limit_field_callback()
{
    $options = get_option('wp_aisearch_settings');
    $c_search_limit = isset($options['c_search_limit']) ? $options['c_search_limit'] : 2; // Default to 2
    echo '<input type="number" id="c_search_limit" name="wp_aisearch_settings[c_search_limit]" value="' . esc_attr($c_search_limit) . '" class="regular-text">';
    echo '<p class="description">' . __('Set the courses search results limit.', 'aisearch') . '</p>';
}

// Field callback for Search Delay
function ai_search_delay_field_callback()
{
    $options = get_option('wp_aisearch_settings');
    $search_delay = isset($options['search_delay']) ? $options['search_delay'] : 500; // Default to 0ms
    echo '<input type="number" id="search_delay" name="wp_aisearch_settings[search_delay]" value="' . esc_attr($search_delay) . '" class="regular-text" min="0" max="5000">';
    echo '<p class="description">' . __('Set the delay in milliseconds for the search request (0-5000 ms).', 'aisearch') . '</p>';
}


// Field callback for Search Type
function ai_search_precision_field_callback()
{
    $options = get_option('wp_aisearch_settings');
    $precision = isset($options['precision']) ? $options['precision'] : '0'; // Default to '0'
    ?>
    <select id="search_precision" name="wp_aisearch_settings[precision]" class="regular-text">
        <option value="0" <?php selected($precision, '0'); ?>>0: Keyword search</option>
        <option value="0.5" <?php selected($precision, '0.5'); ?>>0.5: Hybrid</option>
        <option value="1" <?php selected($precision, '1'); ?>>1: Semantic search</option>
    </select>
    <p class="description"><?php _e('Set the type for search results.', 'aisearch'); ?></p>
    <?php
}

// Field callback for Search Results Page URL
function ai_search_results_page_url_field_callback()
{
    $options = get_option('wp_aisearch_settings');
    $search_results_page_url = isset($options['search_results_page_url']) ? $options['search_results_page_url'] : '';
    echo '<input type="url" id="search_results_page_url" name="wp_aisearch_settings[search_results_page_url]" value="' . esc_attr($search_results_page_url) . '" class="regular-text">';
    echo '<p class="description">' . __('Enter the URL where full search results should be displayed.', 'aisearch') . '</p>';
}





// Sanitize settings to preserve existing values for disabled fields
function ai_search_sanitize_settings($input)
{
    $options = get_option('wp_aisearch_settings');

    // Preserve existing API URL if it's disabled
    if (isset($options['api_url']) && !isset($input['api_url'])) {
        $input['api_url'] = $options['api_url'];
    }

    // Preserve existing API Key if it's disabled
    if (isset($options['api_key']) && !isset($input['api_key'])) {
        $input['api_key'] = $options['api_key'];
    }

    // Ensure accessible_journey_url is a valid URL
    if (isset($input['accessible_journey_url'])) {
        $input['accessible_journey_url'] = esc_url_raw($input['accessible_journey_url']);
    }

    // Ensure search_limit is numeric and within range
    if (isset($input['search_limit'])) {
        $input['search_limit'] = max(1, min(20, intval($input['search_limit'])));
    }
    // Ensure c_search_limit is numeric and within range
    if (isset($input['c_search_limit'])) {
        $input['c_search_limit'] =  intval($input['c_search_limit']);
    }
    // Ensure search_delay is numeric and within range (0-5000ms)
    if (isset($input['search_delay'])) {
        $input['search_delay'] = max(0, min(5000, intval($input['search_delay'])));
    }
    // Ensure search_results_page_url is a valid URL
    if (isset($input['search_results_page_url'])) {
        $input['search_results_page_url'] = esc_url_raw($input['search_results_page_url']);
    }
    return $input;
}
// Add reset button functionality
function ai_search_reset_button()
{
?>
    <form method="post" action="admin-post.php">
        <input type="hidden" name="action" value="ai_search_reset">
        <?php wp_nonce_field('ai_search_reset_nonce', 'ai_search_reset_nonce_field'); ?>
        <p><button type="submit" class="button ai-search-reset-button" onclick="return confirm('Are you sure you want to reset?')"><?php _e('Reset Settings', 'aisearch'); ?></button></p>
    </form>
<?php
}

// Handle reset action
add_action('admin_post_ai_search_reset', 'ai_search_reset_settings');
function ai_search_reset_settings()
{
    // Verify nonce for security
    if (isset($_POST['ai_search_reset_nonce_field']) && wp_verify_nonce($_POST['ai_search_reset_nonce_field'], 'ai_search_reset_nonce')) {
        delete_option('wp_aisearch_settings');

        // Redirect back to the settings page with a success message
        $redirect_url = add_query_arg(
            array(
                'page' => 'ai_search_settings',
                'reset' => 'success'
            ),
            admin_url('admin.php')
        );
        wp_redirect($redirect_url);
        exit;
    }
}

// Render the settings page
function ai_search_render_settings_page()
{
?>


    <style>
        .bs-instructions {
            display: flex;
            flex-wrap: wrap;
        }

        .shortcode-instructions{
            margin-top: 3%;
        }


    </style>

    <div class="row bs-instructions">

        <div class="wrap">
            <h1><?php _e('Better Search Settings', 'aisearch'); ?></h1>

            <!-- Show success messages -->
            <?php if (isset($_GET['reset']) && $_GET['reset'] === 'true') : ?>
                <div class="updated">
                    <p><strong><?php _e('Settings have been reset.', 'aisearch'); ?></strong></p>
                </div>
            <?php endif; ?>

            <form method="post" action="options.php">
                <?php
                // Output security fields for the registered setting
                settings_fields('ai_search_settings_group');

                // Output settings sections and fields
                do_settings_sections('ai_search_settings');

                // Submit button
                submit_button(__('Save Settings', 'aisearch'));
                ?>
            </form>
            <?php ai_search_reset_button(); ?>
        </div>

        <!-- Add Reset Button -->

        <div class="shortcode-instructions">
            <h2>How to Use the Shortcode</h2>
            <p>To display the Search Bar provided by this plugin, simply add the following shortcode to any post, page, or widget:</p>
            <pre><code>[better_search_bar]</code></pre>
            <p>Just paste the shortcode into the editor where you'd like it to appear, and the Search Bar will be rendered on the frontend.</p>
            <p>For a full-page search bar, please use the following shortcode: <code>[better_search_results]</code></p>
        </div>


    </div>
<?php
}
