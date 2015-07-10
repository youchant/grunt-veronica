
'use strict';

var _ = require('underscore');
var path = require('path');

module.exports = function (options) {

    var appBasePath = path.join(options.appDir, options.baseUrl);
    // 应用程序基路径
    var appTargetBasePath = path.join(options.dir, options.baseUrl);

    var defaultSubPaths = ['widgets', 'plugins'];
    var reqPluginNames = ['ver', 'text', 'css', 'normalize', 'css-builder'];
    var notEmptyPaths = ['', 'main', 'styles', 'views', 'templates'];
    var excludeFileNames = ['.css', '.js', '.DS_Store', 'styles'];

    var DEFAULT_MODULE_NAME = '__default__';

    var helper = {

        // 获取相对于某个基路径的真实路径
        getRelativePath: function (originBasePath, originPath, currBasePath) {
            // 实际路径
            var truePath = path.join(originBasePath, originPath);
            var dep = 10;  // 设定最多向上查找10次

            // 如果基路径不在应用程序路径中，则附加应用程序路径
            if (path.join(originBasePath) !== '.\\' && path.join(currBasePath, originPath).indexOf(path.join(originBasePath) + '\\') < 0) {
                originPath = path.join(appBasePath, originPath);
            }
            while (truePath !== path.join(currBasePath, originPath) && dep !== 0) {
                originPath = path.join('../', originPath);
                dep--;
            }
            return originPath;
        },

        getSolutionPath: function (solution) {
            return solution === '' ? '' : helper.getRelativePath('./', solution, appTargetBasePath);
        }
    };

    return helper;
}
