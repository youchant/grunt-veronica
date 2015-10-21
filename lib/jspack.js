
'use strict';

var _ = require('underscore');
var path = require('path');

var excludeFileNames = ['.css', '.js', '.DS_Store', 'styles'];
var reqPluginNames = ['ver', 'text', 'css', 'normalize', 'css-builder'];

function _getReqModules(config) {
    var fs = require('fs');
    var folder = config.temp_unique;

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
function createUniqueFolder(path, tag, useUnique) {
    if (useUnique) {
        if (tag !== '') { tag = tag + '-'; }
        return tag + path.replace('/', '-');
    } else {
        return path;
    }

}

// 获取package路径
function getPaths(packConfig, options, pkgSysDefaults) {
    var paths = packConfig.paths;
    var defaults = packConfig.defaults;

    return _.map(paths, function (p) {

        if (_.isString(p)) {
            p = {
                name: p
            };
        }
        var p = _.extend({
            origin: function () {
                return pkgSysDefaults.pkgParent + this.name;
            },
            target: pkgSysDefaults.pkgTarget,
            unique: false
        }, defaults, p);

        var name = _.result(p, 'name');
        var target = _.result(p, 'target');
        var unique = _.result(p, 'unique');
        var origin = _.result(p, 'origin');

        return {
            name: name || '',
            origin: path.join(options.appDir, options.baseUrl, origin),
            temp: path.join(options.dir, options.baseUrl, '/__temp__', name),
            temp_unique: path.join(options.dir, options.baseUrl, '/__tempUnique__', name),
            temp_release: path.join(options.dir, options.baseUrl, '/__tempRelease__', name),
            target: path.join(options.dir, options.baseUrl, target),
            unique: unique
        };
    });
}

function getReqOptions(packConfig, options) {
    var reqConf = options.reqConfig;
    var appBasePath = path.join(options.appDir, options.baseUrl);
    // 应用程序基路径
    var appTargetBasePath = path.join(options.dir, options.baseUrl);
    var helper = require('./helper')(options);
    var currBaseUrl = packConfig.temp_unique;
    var currReleaseUrl = packConfig.temp_release;

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
            widgetPaths[pathName] = helper.getRelativePath(appBasePath, path, currReleaseUrl);  // ？
        } else {
            emptyPaths[pathName] = 'empty:';
        }
    });
    _.each(reqConf.packages, function (pkg, i) {
        var clonePkg = _.clone(pkg);
        if (!_.contains(options.notMerge, pkg.name)) {
            clonePkg.location = helper.getRelativePath(appBasePath, clonePkg.location, currReleaseUrl);
            widgetPackages.push(clonePkg);
        }
    });

    var result = _.extend(defaults, {
        baseUrl: currBaseUrl,
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
