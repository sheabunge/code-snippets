'use strict';

import fs from 'fs';
import gulp from 'gulp';
import sourcemaps from 'gulp-sourcemaps';
import rename from 'gulp-rename';

import clean from 'gulp-clean';
import copy from 'gulp-copy';
import change from 'gulp-change';
import archiver from 'gulp-archiver';

import postcss from 'gulp-postcss';
import cssnano from 'cssnano';
import rtlcss from 'gulp-rtlcss';
import cssimport from 'postcss-easy-import';
import hexrgba from 'postcss-hexrgba';
import autoprefixer from 'autoprefixer';

import imagemin from 'gulp-imagemin';

import webpack from 'webpack-stream';
import terser from 'gulp-terser';
import eslint from 'gulp-eslint';

import makepot from 'gulp-wp-pot';
import gettext from 'gulp-gettext'

import phpcs from 'gulp-phpcs';
import phpunit from 'gulp-phpunit';
import composer from 'gulp-composer';

import pkg from './package.json';

const sass = require('gulp-sass')(require('sass'));

const src_files = {
	php: ['*.php', 'php/**/*.php'],
	js: ['js/**/*.js', '!js/min/**/*.js'],
	css: ['css/*.scss', '!css/_*.scss'],
};

const dist_dirs = {
	js: 'js/min/',
	css: 'css/min/'
};

const text_domain = pkg.name;

gulp.task('css', (done) => {

	let processors = [
		cssimport({prefix: '_', extensions: ['.scss', '.css']}),
		hexrgba(),
		autoprefixer(),
		cssnano({'preset': ['default', {'discardComments': {'removeAll': true}}]})
	];

	const dir_css = ['edit.css', 'manage.css'];

	return gulp.series(
		() => gulp.src(src_files.css)
			.pipe(sourcemaps.init())
			.pipe(sass().on('error', sass.logError))
			.pipe(postcss(processors))
			.pipe(sourcemaps.write('.'))
			.pipe(gulp.dest(dist_dirs.css)),
		() => gulp.src(dir_css.map((f) => dist_dirs.css + f))
			.pipe(rename({suffix: '-rtl'}))
			.pipe(sourcemaps.init())
			.pipe(rtlcss())
			.pipe(sourcemaps.write('.'))
			.pipe(gulp.dest(dist_dirs.css))
	)(done);
});

gulp.task('test-js', () => {

	const options = {
		parserOptions: {
			ecmaVersion: 9,
			sourceType: 'module'
		},
		extends: 'eslint:recommended',
		rules: {
			'quotes': ['error', 'single'],
			'linebreak-style': ['error', 'unix'],
			'eqeqeq': ['warn', 'always'],
			'indent': ['error', 'tab', {'SwitchCase': 1}]
		}
	};

	return gulp.src(src_files.js)
		.pipe(eslint(options))
		.pipe(eslint.format())
		.pipe(eslint.failAfterError())
});


gulp.task('js', gulp.series('test-js', () =>
	gulp.src(src_files.js)
		.pipe(webpack(require('./webpack.config.js')))
		.pipe(sourcemaps.init())
		.pipe(terser())
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('js/min'))));

gulp.task('images', () =>
	gulp.src('screenshots/**/*')
		.pipe(imagemin())
		.pipe(gulp.dest('screenshots')));

gulp.task('makepot', () =>
	gulp.src(src_files.php)
		.pipe(makepot({
			domain: text_domain,
			package: 'Code Snippets',
			bugReport: 'https://github.com/sheabunge/code-snippets/issues',
			metadataFile: 'code-snippets.php',
		}))
		.pipe(gulp.dest(`languages/${text_domain}.pot`)));

gulp.task('gettext', () =>
	gulp.src('languages/*.po')
		.pipe(gettext())
		.pipe(gulp.dest('languages')));

gulp.task('i18n', gulp.parallel(['makepot', 'gettext']));

gulp.task('phpcs', () =>
	gulp.src(src_files.php)
		.pipe(phpcs({bin: 'vendor/bin/phpcs', showSniffCode: true}))
		.pipe(phpcs.reporter('log', {})));

gulp.task('phpunit', () =>
	gulp.src('phpunit.xml')
		.pipe(phpunit('vendor/bin/phpunit')));

gulp.task('vendor', () =>
	gulp.src('node_modules/codemirror/theme/*.css')
		.pipe(postcss([cssnano()]))
		.pipe(gulp.dest(dist_dirs.css + 'editor-themes')));

gulp.task('clean', () =>
	gulp.src([dist_dirs.css, dist_dirs.js], {read: false, allowEmpty: true})
		.pipe(clean()));


gulp.task('test', gulp.parallel('test-js', gulp.series('phpcs', 'phpunit')));

gulp.task('default', gulp.series('clean', gulp.parallel('vendor', 'css', 'js', 'i18n')));

gulp.task('package', gulp.series(
	'default',

	// remove files from last run
	() => gulp.src(['dist', pkg.name, `${pkg.name}.*.zip`], {read: false, allowEmpty: true})
		.pipe(clean()),

	// remove composer dev dependencies
	() => composer({'no-dev': true}),

	// copy files into a new directory
	() => gulp.src([
		'code-snippets.php', 'uninstall.php', 'php/**/*', 'vendor/**/*',
		'readme.txt', 'license.txt', 'css/font/**/*', 'languages/**/*'
	])
		.pipe(copy(pkg.name, {})),

	// copy minified scripts and stylesheets, while removing source map references
	() => gulp.src('css/min/**/*.css')
		.pipe(change((content) => content.replace(/\/\*# sourceMappingURL=[\w.-]+\.map \*\/\s+$/, '')))
		.pipe(gulp.dest(pkg.name + '/css/min')),

	() => gulp.src('js/min/**/*.js')
		.pipe(change((content) => content.replace(/\/\/# sourceMappingURL=[\w.-]+\.map\s+$/, '')))
		.pipe(gulp.dest(pkg.name + '/js/min')),

	// create a zip archive
	() => gulp.src(pkg.name + '/**/*', {base: '.'})
		.pipe(archiver(`${pkg.name}.${pkg.version}.zip`))
		.pipe(gulp.dest('.')),

	(done) => {
		// reinstall dev dependencies
		composer();

		// rename the distribution directory to its proper name
		fs.rename(pkg.name, 'dist', err => {
			if (err) throw err;
			done();
		});
	}
));

gulp.task('test', gulp.parallel('test-js', 'phpcs'));

gulp.task('default', gulp.series('clean', gulp.parallel('vendor', 'css', 'js', 'i18n')));

gulp.task('watch', gulp.series('default', (done) => {
	gulp.watch('css/*.scss', gulp.series('css'));
	gulp.watch(['js/**/*.js', '!js/min/**/*'], gulp.series('js'));
	done();
}));
