<?php
/*
Plugin Name: Better Search
Description: A plugin to manage Better Search configurations (API URL and API Key).
Version: 2.0
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



// Enqueue necessary scripts and styles for the frontend
function ai_search_enqueue_scripts()
{

    // Enqueue Bootstrap CSS
    wp_enqueue_style('bootstrap-css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css', [], '5.3.2');



    // Enqueue Font Awesome CDN for icons
    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');
    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');


    // Enqueue custom styles for the search bar
    wp_enqueue_style('ai-search-style', plugin_dir_url(__FILE__) . 'css/bettersearch-style.css?v=2.0');


    $options = get_option('wp_aisearch_settings');  // Assuming 'wp_aisearch_settings' is the option name where your search_limit is stored
    $search_limit = isset($options['search_limit']) ? intval($options['search_limit']) : 5;
    $search_delay = isset($options['search_delay']) ? intval($options['search_delay']) : 500;
    $api_url = isset($options['api_url']) ? $options['api_url'] : '';
    $api_key = isset($options['api_key']) ? $options['api_key'] : '';
    $search_type = isset($options['precision']) ? intval($options['precision']) : 0;




    // Enqueue script for handling AJAX search
    wp_enqueue_script(
        'ai-search-script',
        plugin_dir_url(__FILE__) . 'js/bettersearch-script.js?v=2.0', // Adjust the path as needed
        ['lodash', 'jquery'], // Dependencies: jQuery and Lodash
        '1.0.0',
        true
    );

    wp_enqueue_script('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js', ['jquery'], '5.3.2', true);

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

    <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js"></script>


    <div class="search-container container">
        <div class="row align-items-center">
            <div class="col position-relative">
                <!-- Search Icon -->
                <span class="search-icon position-absolute top-50 start-5 translate-middle-y ps-3">
                    <i class="fa fa-search form-control-feedback"></i>
                </span>

                <!-- Search Input -->
                <input type="text" class="form-control better-search-box ps-5"  id="bettersearch-input">

                <!-- Spinner -->
                <span id="loading-spinner" class="position-absolute end-5 top-50 translate-middle-y pe-4" style="display: none;">
                    <div class="search-spinner" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </span>

                <!-- Clear Icon -->
                <span id="ai-search-clear" class="ai-search-clear position-absolute end-5 top-50 translate-middle-y pe-3" role="button">
                    <i class="fa fa-times" aria-hidden="true"></i>
                </span>
            </div>
        </div>
        <div id="ai-search-suggestions-bs" class="ai-search-suggestions-box"></div>
    </div>

<?php

    return ob_get_clean();
}


