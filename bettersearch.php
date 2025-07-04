<?php
/*
Plugin Name: Better Search
Description: A plugin to manage Better Search configurations (API URL and API Key).
Version: 12.2
Author: AIHR
*/

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Include the settings page logic
require_once plugin_dir_path(__FILE__) . 'includes/bettersearch-settings-page.php';



// Plugin activation hook
function ai_search_activate()
{
    // Initialize default options if not set
    if (!get_option('wp_aisearch_settings')) {
        add_option('wp_aisearch_settings', array(
            'api_url' => '',
            'api_key' => '',
        ));
    }
}
register_activation_hook(__FILE__, 'ai_search_activate');

// Plugin deactivation hook
function ai_search_deactivate()
{
    // Optionally, delete the option
    delete_option('wp_aisearch_settings');
}
register_deactivation_hook(__FILE__, 'ai_search_deactivate');



// Register shortcode for AI Search
add_shortcode('better_search_bar', 'ai_search_shortcode_function');
add_shortcode('better_search_results', 'ai_search_results_function'); // Full-page search results shortcode


function ai_search_load_lodash() {
    echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"></script>';
}
add_action('wp_head', 'ai_search_load_lodash'); // ✅ Ensures Lodash is loaded in the <head>

function remove_bettersearch_script() {
    $search_results_page_url = get_option('search_results_page_url'); 

    if ($search_results_page_url) {
        $current_url = home_url($_SERVER['REQUEST_URI']);
        
        if (strpos($current_url, $search_results_page_url) !== false) {
            wp_dequeue_script('bettersearch-script');
            wp_deregister_script('bettersearch-script');
        }
    }
}
add_action('wp_enqueue_scripts', 'remove_bettersearch_script', 999);





// Enqueue necessary scripts and styles for the frontend
function ai_search_enqueue_scripts()
{
    
    // Enqueue Font Awesome CDN for icons
    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');
    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');


   // Enqueue custom styles for the search bar
    wp_enqueue_style('ai-search-style', plugin_dir_url(__FILE__) . 'css/bettersearch-style.css?v=5.2');


    $options = get_option('wp_aisearch_settings');  // Assuming 'wp_aisearch_settings' is the option name where your search_limit is stored
    $search_limit = isset($options['search_limit']) ? intval($options['search_limit']) : 5;
    $search_delay = isset($options['search_delay']) ? intval($options['search_delay']) : 500;
    $api_url = isset($options['api_url']) ? $options['api_url'] : '';
    $api_key = isset($options['api_key']) ? $options['api_key'] : '';
    $search_type = isset($options['precision']) ? $options['precision'] : 0;
    $c_search_limit = isset($options['c_search_limit']) ? intval($options['c_search_limit']) : 2;
    $search_results_page_url = isset($options['search_results_page_url']) ? $options['search_results_page_url'] : '#';

  
    wp_enqueue_script(
        'moment-js', 
        'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js', 
        array(), 
        '2.29.1', 
        true
    );

    // Enqueue script for handling AJAX search
    wp_enqueue_script(
        'ai-search-script',
        plugin_dir_url(__FILE__) . 'js/bettersearch-script.js?v=6.1', // Adjust the path as needed
        ['lodash', 'jquery'], // Dependencies: jQuery and Lodash
        '1.0.0',
        true
    );

    
    // Enqueue full-page search script
    wp_enqueue_script('ai-full-page-search', plugin_dir_url(__FILE__) . 'js/full-page-search.js', ['jquery'], '3.1.0', true);

        
    // Localize script for AJAX URL
    wp_localize_script('ai-search-script', 'aiSearch', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('ai_search_nonce'),
        'search_limit' => $search_limit,
        'search_delay' => $search_delay,
        'plugin_url' => plugin_dir_url(__FILE__),
        'api_url' => $api_url,
        'api_key' => $api_key,
        'search_type' => $search_type,
        'c_search_limit' => $c_search_limit,
        'search_results_page_url' => $search_results_page_url,
    ));
}
add_action('wp_enqueue_scripts', 'ai_search_enqueue_scripts');



// Shortcode callback function
function ai_search_shortcode_function($atts)
{
    ob_start();

    // Check if API URL is set
    $options = get_option('wp_aisearch_settings');
    $api_url = isset($options['api_url']) ? esc_url($options['api_url']) : '';
    $api_key = isset($options['api_key']) ? esc_url($options['api_key']) : '';

    // If API URL is not set, return a message
    if (empty($api_url) && empty($api_key)) {
        echo '<p>' . __('Please configure the API URL and API Key in the settings.', 'aisearch') . '</p>';
        return ob_get_clean();
    }

    
?>



    <div class="container">
    <div class="bs-search-box">
        <!-- Search Icon -->
        <span class="search-icon">
            <i class="fa fa-search form-control-feedback"></i>
        </span>

        <!-- Search Input -->
        <input type="text" class="better-search-box" id="bettersearch-input">

        <!-- Spinner -->
        <span id="loading-spinner" class="spinner-container" style="display: none;">
            <div class="search-spinner" role="status">
                <span class="sp-visually-hidden">Loading...</span>
            </div>
        </span>

        <!-- Clear Icon -->
        <span id="ai-search-clear" class="ai-search-clear" role="button">
            <i class="fa fa-times" aria-hidden="true"></i>
        </span>
    </div>
    <div id="ai-search-suggestions-bs" class="ai-search-suggestions-box" style="display: none;"></div>
</div>

<?php

    return ob_get_clean();
}

function ai_search_results_function() {
    ob_start();
    ?>
    
    <div class="fs-header-container">
        <div class="full-page-search-header" id="full-page-search-header"></div>
        <div id="filter-container"></div>
    </div>
    <div id="better-search-results"></div>
    <div id="pagination"></div>
    
    
    <?php
    return ob_get_clean();
}
