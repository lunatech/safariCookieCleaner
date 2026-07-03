// eslint-disable-next-line no-undef
module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    'json-replace': {
      options: {
        space: '\t',
        replace: {
          version: '<%= pkg.version %>',
        },
      },
      safari: {
        files: [
          {
            src: 'manifest.<%= grunt.task.current.target %>.json',
            dest: 'manifest.<%= grunt.task.current.target %>.json',
          },
        ],
      },
    },
    exec: {
      lint: 'npm run lint',
    },
    clean: {
      safari: ['build/safari'],
    },
    copy: {
      safari: {
        files: [
          {
            expand: true,
            src: ['cookie-editor.js'],
            dest: 'build/<%= grunt.task.current.target %>/',
            filter: 'isFile',
          },
          {
            expand: true,
            src: ['interface/**'],
            dest: 'build/<%= grunt.task.current.target %>/',
          },
          {
            expand: true,
            src: ['icons/**'],
            dest: 'build/<%= grunt.task.current.target %>/',
          },
          {
            expand: true,
            src: 'manifest.<%= grunt.task.current.target %>.json',
            dest: 'build/<%= grunt.task.current.target %>/',
            filter: 'isFile',
            rename: function (dest, src) {
              return dest + src.replace('.' + grunt.task.current.target, '');
            },
          },
        ],
      },
    },
    replace: {
      options: {
        patterns: [
          {
            match: 'browser_name',
            replacement: '<%= grunt.task.current.target %>',
          },
        ],
      },
      safari: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['interface/lib/env.js'],
            dest: 'build/<%= grunt.task.current.target %>/interface/lib/',
          },
        ],
      },
    },
  });

  grunt.loadNpmTasks('grunt-json-replace');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-replace');

  grunt.registerTask('build-safari', [
    'json-replace:safari',
    'clean:safari',
    'copy:safari',
    'replace:safari',
    // Keep logs in Safari for now, otherwise can't easily debug.
    // Ideally there would be a different build config for dev/prod.
  ]);

  // Default task(s).
  grunt.registerTask('default', ['exec:lint', 'build-safari']);
};
