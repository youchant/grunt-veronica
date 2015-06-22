
'use strict';

var _ = require('underscore');
var path = require('path');

var excludeFileNames = ['.css', '.js', '.DS_Store', 'styles'];
var reqPluginNames = ['ver', 'text', 'css', 'normalize', 'css-builder'];

function _getReqModules(config) {
    var fs = require('fs');
    var otherIsEmptyPath = false;
    var folder = config.temp;

    if (!config || !fs.existsSync(folder)) {
        return false;
    }

    var dirs = fs.readdirSync(folder);
    var subSource = _.filter(dirs, function (dir) {
        // 排除不是部件文件夹的目录
        return _.indexOf(fs.readdirSync(folder + '/' + dir), 'main.js') < 0;  // TODO: hard code
    });
    var realDirs = _.reject(dirs, function (dir) {
        // 排除特殊的文件（夹）名称和其他源路径名称
        return _.find(excludeFileNames.concat(subSource), function (tag) {
            return dir === tag;
        });
    });

    var result = _.map(realDirs, function (dir) {
        return {
            name: dir + '/main',
            exclude: reqPluginNames
        };
    });

    return result;
}
// 判断该文件所属的文件夹是否是 package 文件夹
function isInPackage(file) {
    return file === 'main.js';
}
// 生成一个唯一名称文件夹
function createUniqueFolder(tag, path) {
    if (tag !== '') { tag = tag + '-'; }
    return tag + path.replace('/', '-');
}

function getPaths(packConfig, options) {
    var paths = packConfig.paths;

    return _.map(paths, function (p) {
        return {
            name: p.name || '',
            origin: path.join(options.appDir, options.baseUrl, p.origin),
            temp: path.join(options.dir, options.baseUrl, '/__temp__', p.name),
            temp_release: path.join(options.dir, options.baseUrl, '/__tempRelease__', p.name),
            target: path.join(options.dir, options.baseUrl, p.target)
        };
    });
}

function getReqOptions(packConfig, options) {
    var reqConf = options.reqConfig;
    var appBasePath = path.join(options.appDir, options.baseUrl);
    // 应用程序基路径
    var appTargetBasePath = path.join(options.dir, options.baseUrl);
    var helper = require('./helper')(options);

    // 默认配置
    var defaults = {
        shim: reqConf.shim || {},
        optimize: "none",
        // optimizeCss: "none",
        removeCombined: true,  // 永远移除合并项
        preserveLicenseComments: false,
        fileExclusionRegExp: /^\./,
        separateCSS: true,
        onBuildWrite: function (moduleName, path, contents) {
            // Bugfixed：当在未知的情况下，有可能会出现识别不了 widget 的情况
            var packageName = moduleName.substring(0, moduleName.indexOf('/main'));
            if (packageName.length > 0) {
                return contents + "\ndefine('" + packageName + "', ['" + moduleName + "'], function (main) { return main; });";
            }
            return contents;
        }
    };

    var modules = _getReqModules(packConfig);

    var widgetPaths = {};
    var emptyPaths = {};
    var widgetPackages = [];

    // 解析以下几个文件相对于部件文件夹的正确路径 ['text', 'css', 'normalize', 'css-builder']
    // reqConf.paths

    _.each(options.notMerge, function (name) {
        emptyPaths[name] = 'empty:';
    })

    _.each(reqConf.paths, function (path, pathName) {
        if (_.contains(reqPluginNames, pathName)
            || _.contains(options.moduleMerge, pathName)) {
            widgetPaths[pathName] = helper.getRelativePath(appBasePath, path, packConfig.temp);  // ？
        } else {
            emptyPaths[pathName] = 'empty:';
        }
    });
    _.each(reqConf.packages, function (pkg, i) {
        var clonePkg = _.clone(pkg);
        if (!_.contains(options.notMerge, pkg.name)) {
            clonePkg.location = helper.getRelativePath(appBasePath, clonePkg.location, packConfig.temp);
            widgetPackages.push(clonePkg);
        }
    });

    var result = _.extend(defaults, {
        baseUrl: packConfig.temp,
        dir: packConfig.temp_release,
        paths: _.extend({}, widgetPaths, emptyPaths, options.buildPaths || {}),
        modules: modules,
        packages: widgetPackages
    });
    return result;
}

module.exports = {
    getReqOptions: getReqOptions,
    getPaths: getPaths,
    isInPackage: isInPackage,
    createUniqueFolder: createUniqueFolder
}
