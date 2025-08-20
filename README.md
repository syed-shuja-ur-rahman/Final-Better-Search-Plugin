# Better Search Plugin for WordPress

## Description

WP Plugin of Better Search.

## Features

*   **Multiple Search Types:** Choose between Keyword, Hybrid, or Semantic search to best fit your content and user needs.
*   **Customizable Search Experience:** Control the number of search results and the search delay.
*   **Easy Integration:** Simply add a shortcode to any page or post to display the search bar.
*   **Dynamic Dropdown Results:** As users type, a dropdown will appear with instant search results.
*   **Full-Page Search View:** Provides a comprehensive search results page with pagination and filtering options.

## Installation

1.  **Log in** to your WordPress dashboard.
2.  Navigate to **Plugins > Add New**.
3.  Click **Upload Plugin** and select the `BetterSearch.zip` file from your computer.
4.  Click **Install Now** and then **Activate Plugin**.

## Configuration

After activating the plugin, you need to configure its settings to connect to your search API.

1.  Click on the **Better Search** menu item in the WordPress sidebar.
2.  Fill in the following details:
    *   **API URL:** Enter the URL for your search API.
    *   **API Key:** Provide your X-API key.
3.  Adjust the settings according to your requirements:
    *   **Search Result Limits:** Set a value to limit the number of results displayed.
    *   **Search Delay:** Configure a delay in milliseconds before the search is triggered as the user types.
    *   **Search Type:** Select the type of search you want to implement:
        *   `0` for Keyword Search
        *   `0.5` for Hybrid Search
        *   `1` for Semantic Search
4.  Now add the url for **Full Search Results** page.
5.  Click the **Save Settings** button to save your changes.

## Usage

To add the search bar to your website, you can use the provided shortcode.

1.  In the Better Search settings page, copy the shortcode: `[better_search_bar]`
2.  Paste this shortcode into any page, post, or widget where you want the search bar to appear.
3.  For a full-page search bar, please use the following shortcode: `[better_search_results]`
4.  For more detailed instructions on using shortcodes, refer to the "How to Use the Shortcode" section within the plugin's settings page.

## Frontend Functionality

The Better Search plugin utilizes two JavaScript files to manage the frontend search experience, ensuring it is both smooth and efficient.

*   `bettersearch-script.js`: This script handles the dynamic dropdown that displays search results as a user is typing in the search bar.
*   `full-page-search.js`: This script powers the full-page search results, including pagination and advanced filtering options when a user navigates to the dedicated search page.

These scripts work together to provide a seamless and optimized search experience in both the compact dropdown and the extended full-page views.