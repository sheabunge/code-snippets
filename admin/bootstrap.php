<?php

/**
 * Load the functions for handling the administration interface
 *
 * @package    Code_Snippets
 * @subpackage Administration
 */

/* Bail if not in admin area */
if ( ! is_admin() ) {
	return;
}

require_once plugin_dir_path( __FILE__ ) . 'manage.php';
require_once plugin_dir_path( __FILE__ ) . 'single.php';
require_once plugin_dir_path( __FILE__ ) . 'import.php';

/**
 * Allow super admins to control site admin access to
 * snippet admin menus
 *
 * Adds a checkbox to the *Settings > Network Settings*
 * network admin menu
 *
 * @since 1.7.1
 * @access private
 *
 * @param array $menu_items The current mu menu items
 * @return array The modified mu menu items
 */
function code_snippets_mu_menu_items( $menu_items ) {
	$menu_items['snippets'] = __( 'Snippets', 'code-snippets' );
	return $menu_items;
}

add_filter( 'mu_menu_items', 'code_snippets_mu_menu_items' );

/**
 * Enqueue the icon stylesheet globally in the admin
 *
 * @since 1.0
 * @access private
 * @uses wp_enqueue_style() To add the stylesheet to the queue
 * @uses get_user_option() To check if MP6 mode is active
 * @uses plugins_url() To retrieve a URL to assets
 */
function code_snippets_load_admin_icon_style() {
	global $code_snippets;

	wp_enqueue_style(
		'menu-icon-snippets',
		plugins_url( 'css/min/menu-icon.css', $code_snippets->file ),
		false,
		$code_snippets->version
	);
}

add_action( 'admin_enqueue_scripts', 'code_snippets_load_admin_icon_style' );

/**
 * Adds a link pointing to the Manage Snippets page
 *
 * @since 2.0
 * @access private
 * @param array $links The existing plugin action links
 * @return array The modified plugin action links
 */
function code_snippets_plugin_settings_link( $links ) {
	array_unshift( $links, sprintf(
		'<a href="%1$s" title="%2$s">%3$s</a>',
		self_admin_url( 'admin.php?page=snippets' ),
		__( 'Manage your existing snippets', 'code-snippets' ),
		__( 'Manage', 'code-snippets' )
	) );
	return $links;
}

global $code_snippets;
add_filter( 'plugin_action_links_' . plugin_basename( $code_snippets->file ), 'code_snippets_plugin_settings_link' );

/**
 * Adds extra links related to the plugin
 *
 * @since  2.0
 * @access private
 * @param  array  $links The existing plugin info links
 * @param  string $file  The plugin the links are for
 * @return array         The modified plugin info links
 */
function code_snippets_plugin_meta( $links, $file ) {
	global $code_snippets;

	/* We only want to affect the Code Snippets plugin listing */
	if ( $file !== plugin_basename( $code_snippets->file ) ) {
		return $links;
	}

	$format = '<a href="%1$s" title="%2$s">%3$s</a>';

	/* array_merge appends the links to the end */
	return array_merge( $links, array(
		sprintf( $format,
			'http://wordpress.org/plugins/code-snippets/',
			__( 'Visit the WordPress.org plugin page', 'code-snippets' ),
			__( 'About', 'code-snippets' )
		),
		sprintf( $format,
			'http://wordpress.org/support/plugin/code-snippets/',
			__( 'Visit the support forums', 'code-snippets' ),
			__( 'Support', 'code-snippets' )
		),
		sprintf( $format,
			'http://code-snippets.bungeshea.com/donate/',
			__("Support this plugin's development", 'code-snippets' ),
			__( 'Donate', 'code-snippets' )
		)
	) );
}

add_filter( 'plugin_row_meta', 'code_snippets_plugin_meta', 10, 2 );

/**
 * Print a notice inviting people to participate in the Code Snippets Survey
 *
 * @since  1.9
 * @return void
 */
function code_snippets_survey_message() {
	global $current_user;

	$key = 'ignore_code_snippets_survey_message';

	/* Bail now if the user has dismissed the message */
	if ( get_user_meta( $current_user->ID, $key ) ) {
		return;
	}
	elseif ( isset( $_GET[ $key ], $_REQUEST['_wpnonce'] ) && wp_verify_nonce( $_REQUEST['_wpnonce'], $key ) ) {
		add_user_meta( $current_user->ID, $key, true, true );
		return;
	}

	?>

	<br />

	<div class="updated"><p>

	<?php _e( "<strong>Have feedback on Code Snippets?</strong> Please take the time to answer a short survey on how you use this plugin and what you'd like to see changed or added in the future.", 'code-snippets' ); ?>

	<a href="http://code-snippets.bungeshea.com/survey/" class="button secondary" target="_blank" style="margin: auto .5em;">
		<?php _e( 'Take the survey now', 'code-snippets' ); ?>
	</a>

	<a href="<?php echo wp_nonce_url( add_query_arg( $key, true ), $key ); ?>">Dismiss</a>

	</p></div>

	<?php
}

add_action( 'code_snippets/admin/manage', 'code_snippets_survey_message' );

/**
 * Remove the old CodeMirror version used by the Debug Bar Console
 * plugin that is messing up the snippet editor
 * @since 1.9
 */
function code_snippets_remove_debug_bar_codemirror() {
	global $pagenow;

	/* Try to discern if we are on the single snippet page as best as we can at this early time */
	is_admin() && 'admin.php' === $pagenow && isset( $_GET['page' ] ) && 'snippet' === $_GET['page']

	/* Remove the action and stop all Debug Bar Console scripts */
	&& remove_action( 'debug_bar_enqueue_scripts', 'debug_bar_console_scripts' );
}

add_action( 'init', 'code_snippets_remove_debug_bar_codemirror' );