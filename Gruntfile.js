var src = 'src/ProductApi.js',
    dest = 'dest/ProductApi.js';

module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            dest: {
                src: ['dest']
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: src,
                dest: dest
            }
        },
        jshint: {
            src: [src, 'Gruntfile.js'],
            options: {
                reporter: require('jshint-stylish'),
                asi: true,
                boss: true,
                browser: true,
                curly: true,
                eqnull: true,
                evil: true,
                expr: true,
                latedef: true,
                maxerr: 100,
                newcap: true,
                noarg: true,
                noempty: true,
                shadow: true,
                laxbreak: true,
                globals: {
                    define: true
                }
            }
        },
        watch: {
            files: [src, 'Gruntfile.js', 'test/*.js', '!**/node_modules/**/*'],
            tasks: ['jshint', 'mochacli', 'build']
        },
        mochacli: {
            options: {
                bail: true
            },
            all: ['test/*.js']
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-cli');

    // Default task(s).
    grunt.registerTask('default', [
        'jshint',
        'mochacli',
        'build',
        'watch'
    ]);

    grunt.registerTask('build', [
        'clean',
        'uglify'
    ]);

    grunt.registerTask('test', [
        'mocha:test'
    ]);
};