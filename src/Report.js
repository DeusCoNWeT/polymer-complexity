var plato = require('plato');
var analyzeCss = require('analyze-css');
var utils = require('./Utils');
var fs = require("fs");
var async = require("async");
// STATIC FOLDER
var TMP_FOLDER = '.tmp_plato/';
var OUTPUT_FOLDER = '.report_output';

module.exports = exports = (function(){
  /**
   * @exports Report
   * @example 
   *  var Report = require('./src/Report');
   */
  var Report = {};
  var override = true;

  /**
   * Generate an JS report inside a folder
   * 
   * @param {String} files_dir Path to js files that will be analyzed
   * @param {String} output  Ouput folder where report will be stored
   * @param {Object} options Config options
   */
  Report.generateJSreport = function(files_dir, output, options) {
    return function (cb) {
      plato.inspect(files_dir, output, options || {}, function (results) {
        cb(null, results);
      });
    };
  };
  
  /**
   * 
   * @param {String} file Path to file that will be analyzed
   * @param {Object} options Config options
   */
  Report.generateCSSReport = function(file, options) {
    file = utils.removeDotDot(file);
    var html;
    try{
      html = fs.readFileSync(file, "utf-8");
    } catch(err){
      throw new Error("Error leyendo el fichero: " + file)     
    }
    // remove comments
    html = html.replace(/<!--(?!>)[\S\s]*?-->/g, '');
    // Remove @applys no supported)
    html = html.replace(/(@apply[^\)]*\)\;?)/g, "/*$1*/");
  
    return function (cb) {
      var css = "";
      var re = /<style[^>]*>([\w\W]*?)<\/style>/gm;
      var match;
  
      while ((match = re.exec(html)) !== null) {
        if (match.length > 1) {
          css += match[1] + '\n';
        }
      }
      new analyzeCss(css, options, function (err, results) {
        cb(err, results);
      });
    };
  };

  /**
   * Remove temporal folders and output folders
   */
  Report.cleanFolders = function(){
    utils.deleteFolderRecursive(TMP_FOLDER);
    utils.deleteFolderRecursive(OUTPUT_FOLDER);
  };

  /**
   * 
   * @param {String} path Path of component that will be analyzed. Must be an html file
   * @param {Object} options Config options. 
   *       {
   *         "recursive": false // Analyze all script files or only the script inside component file.  
   *       }
   */
  Report.analyze = function(path, options){
    return new Promise(function (resolve, reject) {
      var options = options || {};
      options.recursive = options.recursive || false;

      if (typeof options != "object"){
        reject({error: "Options must be an object"});
        return;
      }
      var tmp_folder =  TMP_FOLDER + Math.random().toString().replace('.', '');
      // get all scripts of the component
      utils.getScripts(path, options.recursive).then(function (results) {
        results = utils.removeRepeted(results); // remove repeted scripts
        utils.createFolder(TMP_FOLDER, override);
        override = false;
        utils.createFolder(tmp_folder,true);// create a temporal folder in order to save the scripts
        var files_dir = utils.createFiles(results, tmp_folder);
        var output = OUTPUT_FOLDER + '/' + path.replace('.html', '');
        var parallel = [this.generateJSreport(files_dir, output, {}), this.generateCSSReport(path, {})];
        async.parallel(parallel, function (err, result) {
          if (err) {
            reject(err);
          } else {
            var report = {
              js: result[0],
              css: result[1]
            };
            resolve(report);
          }
        });
      }.bind(this));
    }.bind(this));
  };
  
  /**
   * Generate a report file based on analyze report of a component
   * @param {Object} report Report produced by analyze
   * @param {String} output Path to output folder
   * @param {String} name Name of the output file that will be generated
   */
  Report.generateReport = function(report, output, name){
    utils.createFolder(output);
    name = name || "complexityReport.json";
    utils.createFiles([{
      file: name,
      script: JSON.stringify(report, null, 2)
    }], output);
  };

  return Report;
})();