// Auxiliar functions
var fs = require('fs');
var jsdom = require('jsdom');
var jquery = require("jquery");
var Promise = require('promise');
var http = require('http');
var https = require('https');

module.exports = exports = (function () {

/**
 * Auxiliar functions to handle with folders and files
 * @exports Utils
 * @example
 *  var Utils = require('.src/utils')
 */
  var Utils = function () { };

  /**
   *  Get folder from a file path
   * 
   * @param  {String} file Path of the file
   * @return {String}      Path to the folder
   */
  Utils.prototype.getCurrentDir = function (file) {
    var split = file.split('/');
    split.length = split.length - 1;
    return split.join('/') + '/';
  }


  /**
   * Remove references to back in a path (/../)
   *
   * @param  {type} url Path with .. references
   * @return {type}     Path without .. references
   */
  Utils.prototype.removeDotDot = function (url) {
    var realUrl = [];
    var splited = url.split('/');
    for (var i = 0; i < splited.length; i++) {
      if (splited[i] === '..' && realUrl.length > 0) {
        realUrl.length = realUrl.length - 1;
      } else {
        realUrl.push(splited[i]);
      }
    }
    return realUrl.join('/');
  }

  /**
   * Get a script from external resource (CDN)
   * @name Utils#getScriptFromUrl
   * 
   * @param  {String} url Script URL
   * @return {Promise}    Resolve: [{file:url_of_file, script:script_contained_in_file}]
   *                      Reject: Response received of GET to url
   */
  Utils.prototype.getScriptFromUrl = function (url) {
    return new Promise(function (resolve, reject) {
      var script = "";
      var protocol = url.match(/^https/) ? https : http;
      var request = protocol.get(url, function (response) {
        if (response.statusCode !== 200) {
          reject(response);
        } else {
          response.setEncoding('utf8');
          response.on('data', function (chunk) {
            script += chunk;
          });
          response.on('end', function () {
            resolve([{
              file: url,
              script: script
            }]);
          });
        }
      });
    });
  }

  /**
 * description
 * @name Utils#getScriptFromScript
 * 
 * @param  {String} file Script path
 * @return {Promise}    Resolve: [{file:path_to_file, script:script_contained_in_file}]
 *                      Reject: ReadFile error
 */
  Utils.prototype.getScriptFromScript = function (file) {
    return new Promise(function (resolve, reject) {
      file = removeDotDot(file);
      fs.readFile(file, function (err, script) {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve([{
            file: file,
            script: script
          }]);
        }
      });
    });
  }
  /**
   * getScripts - Get all scripts from path. If recursive is true, get all script from link and script tags
   *
   * @param  {type} file      Path to principal file
   * @param  {type} recursive If true, look for scripts in the dependencies of the principal file.
   * @return {Promise}        Resolve: [{file:parth_to_file, script:script_contained_in_file}]
   *                          Reject: if exist error to open the file
   */
  Utils.prototype.getScripts = function (file, recursive) {
    file = this.removeDotDot(file);
    var html = fs.readFileSync(file, "utf-8");
    var current_dir = this.getCurrentDir(file);

    return new Promise(function (resolve, reject) {
      jsdom.env(html, function (err, window) {
        if (err) {
          reject(err);
          return;
        }
        var $ = jquery(window);
        var $script = "";
        var $imports = $('link[rel="import"]');
        var promises = [];
        // get scripts
        $('script').each(function (index) {
          // script element
          var $el = $(this);
          // script source if exist
          var src = $el.attr('src');
          // if its a local file, folder
          var file_dir;
          if (src) {
            if (recursive) {
              if (src.match(/^https?/)) {
                promises.push(getScriptFromUrl(src));
              } else {
                file_dir = current_dir + src;
                promises.push(getScriptFromScript(file_dir));
              }
            }
          } else { // is a explicit script
            $script = $script + $el.html() + '\n';
          }
        });
        // get imports
        if ($imports && recursive) {
          $imports.each(function (index) {
            var file_dir = current_dir + $(this).attr('href');
            promises.push(getScripts(file_dir, recursive));
          });
        }
        if (promises.length > 0) {
          Promise.all(promises).then(function (values) {
            var reduced = values.reduce(function (a, b) {
              return a.concat(b);
            });
            var current = {
              file: file,
              script: $script
            };
            reduced.push(current);
            resolve(reduced);
          });
        } else {
          resolve([{
            file: file,
            script: $script
          }]);
        }
      });
    });
  }
  /**
 * removeRepeted - Remove repeted element from a list with {file:file_path,script:script_text}
 *
 * @param  {Array} list List with repeted elements
 * @return {type}      List without repeted elements
 */
  Utils.prototype.removeRepeted = function (list) {
    var repeted = [];
    var i = 0;
    while (i < list.length) {
      if (repeted.indexOf(list[i].file) == -1) {
        repeted.push(list[i].file);
        i++;
      } else {
        list.splice(i, 1);
      }
    }
    return list;
  }


  /**
   * deleteFolderRecursive - Remove a folder and all file contened inside.
   *
   * @param  {Script} path Path to folder
   */
  Utils.prototype.deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function (file, index) {
        var curPath = path + "/" + file;
        if (fs.lstatSync(curPath).isDirectory()) { // recurse
          this.deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      }.bind(this));
      fs.rmdirSync(path);
    }
  }

  /**
   * createFolder - Create a folder folder. If exist, override it.
   * 
   * @param {String} folder Path to new folder
   * @param {Boolean} override In case of path exist, if it must be overrides or not
   */
  Utils.prototype.createFolder = function (folder, override) {
    var exist_folder = fs.existsSync(folder);
    if (exist_folder && override) {
      this.deleteFolderRecursive(folder);
    }
    if (!exist_folder) {
      fs.mkdirSync(folder);
    }
  }

  /**
   * createFiles - Create temporal files to be read by plato.
   *
   * @param  {Array} files Array with files and script text {file:file,  script:script_text}
   * @param  {Array} folder Temportal folder to store files
   */
  Utils.prototype.createFiles = function (files, folder) {
    var new_dir = [];
    if (folder[folder.length - 1] !== '/') folder += '/';

    function errFn(err, file) {
      if (err) {
        console.error(err);
        throw new Error(err);
      }
    }
    for (var i = 0; i < files.length; i++) {
      var file_name = files[i].file.replace('./', '');
      file_name = file_name.replace(/\//g, '_');
      file_name = file_name.replace(/\.html$/g, '.js');
      var filepath = folder + file_name;
      new_dir.push(filepath);
      try {
        var fd = fs.openSync(filepath, 'w');
        fs.write(fd, files[i].script, null, 'utf8', errFn);
      } catch (e) {
        throw new Error(e);
      }
    }
    return new_dir;
  }

  return new Utils();
})();