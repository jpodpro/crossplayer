module.exports = function( grunt )
{
    // project config
    grunt.initConfig( {
        pkg: grunt.file.readJSON( 'package.json' ),

        concat: {
            dist: {
                options: {
                    separator: grunt.util.linefeed + grunt.util.linefeed + grunt.util.linefeed,
                },
                src: [  'build/header.txt',
                        'src/basePlayer.js',
                        'src/abstractPlayer.js',
                        'src/soundCloudPlayer.js',
                        'src/youTubePlayer.js',
                        'src/webLinkPlayer.js',
                        'src/dropBoxPlayer.js',
                        'src/exportPlayer.js',
                        'build/footer.txt'],
                dest: 'dist/crossplayer.js',
            },
        },

        uglify: {
            dist: {
                options: {
                    sourceMap: false,
                    banner: '/*! <%= pkg.name %> v<%= pkg.version %> */ '
                },
                files: [ {
                    expand: true,
                    cwd: 'dist/',
                    src: ['crossplayer.js'],
                    dest: 'dist/',
                    ext: '.min.js'
                }, ],
            },
        },

        watch: {
            dist: {
                files: ['src/*'],
                tasks: ['concat', 'uglify'],
            },
        },
    } );


    // load uglify
    grunt.loadNpmTasks( 'grunt-contrib-concat' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-watch' );

    // default task
    grunt.registerTask( 'default', ['concat', 'uglify'] );

}