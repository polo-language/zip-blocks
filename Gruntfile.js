module.exports = function(grunt) {
  grunt.initConfig({
    jasmine_node: {
      all: ['spec/']
    },

    jshint: {
      all: ['zip-blocks.js']
    }
  });

  grunt.loadNpmTasks('grunt-jasmine-node');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', ['jasmine_node']);
};
