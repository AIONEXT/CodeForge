<?php
/**
 * Plugin Name: CodeForge Recall
 * Description: Universal command recorder and recall system for WordPress.
 * Version: 0.1.0
 * Author: AIONEXT
 * License: MIT
 */
if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
    add_menu_page('CodeForge', 'CodeForge', 'manage_options', 'codeforge', 'codeforge_dashboard');
});

function codeforge_dashboard() {
    echo '<div class="wrap"><h1>CodeForge Recall Dashboard</h1><p>WebUI: <a href="https://codeforge.ai">https://codeforge.ai</a></p></div>';
}
