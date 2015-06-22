
'use strict';

var _ = require('underscore');
var path = require('path');

function _processPathsAndPackages(paths, packages, options) {
    var result = {
        paths: {},
        packages: []
    };
    _.each(paths, function (path, pathName) {
        result.paths[pathName] = _.contains(options.notMerge, pathName) ? 'empty:' : path;
    });
    _.each(packages, function (pkg, i) {
        if (_.contains(options.notMerge, pkg.name)) {
            result.paths[pkg.name] = 'empty:';
        } else {
            result.packages.push(pkg);
        }
    });
    return result;
}

function _processVerModule(modConfigs) {
    return _.map(modConfigs, function (mod) {
        if (_.isString(mod)) {
            mod = {
                name: mod,
                source: './modules'
            };
        }
        return mod;
    });
}

// 每个 entry 配置转换为 requirejs 的 module 配置
function _entryToReqMod(entry) {
    var helper = require('./helper.js')(options);
    var solutionPath = helper.getSolutionPath(entry.solution);
    var baseInclude = solutionPath === '' ? [] : [solutionPath];
    var moduleInclude = _.compact(_processVerModule(entry.modules).map(function (mod, idx) {
        if (mod.name === '.' || mod.hasEntry === false) return false;
        return mod.source + '/' + mod.name + '/main';
    }));

    return {
        name: entry.name,
        include: baseInclude.concat(entry.merge).concat(moduleInclude)
    }
}

function getReqOptions(options) {
    var reqConf = options.reqConfig;
    var pp = _processPathsAndPackages(reqConf.paths, reqConf.packages, options);

    var options = {
        appDir: options.appDir,
        baseUrl: options.baseUrl,
        dir: options.dir,
        //    modules: _.map(options.entryPack, _entryToReqMod),
        modules: options.entryPack,
        paths: pp.paths,
        shim: reqConf.shim || {},
        packages: reqConf.packages || [],
        optimize: "none",
        onBuildRead: function (moduleName, path, contents) {
            if (moduleName.indexOf('require-conf') > -1) {
                return contents.replace(/debug\s*\:\s*(true|false)/g, 'debug: false, optimized: true');
            }
            //if (solutionPath !== '' && moduleName === 'main') {
            //    return 'window.verSolution="' + solutionPath + '";\n' + contents;
            //}
            return contents;
        },
        preserveLicenseComments: false,
        removeCombined: options.removeCombined,
        fileExclusionRegExp: /^\./
    };

    return options;
}


module.exports = {
    getReqOptions: getReqOptions
}
