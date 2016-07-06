
'use strict';

var _ = require('underscore');
var path = require('path');
var grunt = require('grunt');

function createFile(opt, options, sysDefaults) {

    var helper = require('./helper')(options);
    var allStyleStream = '';
    var cssPackOpt = _.extend({}, sysDefaults, opt);
    var cssTarget = cssPackOpt.target;
    var cssName = '/' + cssPackOpt.name;
    var allStyles = [];
    var fs = require('fs');
    var fileName = '';

    _.each(cssPackOpt.src, function (p) {
        var src = path.join(options.dir, options.baseUrl, p);  // 相对于基路径

        var thisStyles = grunt.file.expand([src + '/**/*.css', '!' + src + '/**/*.min.css']);
        allStyles.push(thisStyles);
    });

    _.each(allStyles, function (styles, idx) {
        var stream = '';

        _.each(styles, function (style) {
            stream += '@import "' + helper.getRelativePath('./', style, cssTarget) + '";\n';
        });

        if (cssPackOpt.mode === "all") {
            allStyleStream += stream;
        }
    });

    if (allStyleStream !== '') {
        fileName = cssTarget + cssName;
        grunt.file.write(fileName, allStyleStream);
    }

    return fileName;

}

function createFiles(options, sysDefaults) {
    var cssPack = options.cssPack;
    if (!_.isArray(cssPack)) {
        cssPack = [cssPack];
    }
    var result = _.map(cssPack, function(opt) {
        return createFile(opt, options, sysDefaults);
    });
    return result;
}

module.exports = {
    createFile: createFile,
    createFiles: createFiles
}
