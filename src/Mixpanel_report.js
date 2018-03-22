var Mixpanel = require('mixpanel');

module.exports = exports = (function () {

  var Mixpanel_report = function () { };

  Mixpanel_report.prototype.sendMixpanel = function (name, report, config) {
    var mixpanel_maintainability, mixpanel_complexity;
    // Get tokens
    config = config || {};
    if (typeof config != "object"){
      var error = new Error("[Mixpanel] config of mixpanel must be an object");
      throw error;
    }
    if (config) {
      if (config.complexity) {
        mixpanel_complexity = Mixpanel.init(config.complexity);
        // send maintainability
        var maintainability = {
          component: name,
          maintainability: report.js[0].complexity.maintainability
        };
        mixpanel_maintainability.track(name, maintainability);
      }
      if (config.maintainability) {
        mixpanel_maintainability = Mixpanel.init(config.maintainability);
        // send complexity
        var complexity = {
          component: name,
          complexity: report.js[0].complexity.methodAverage.cyclomatic
        };
        mixpanel_complexity.track(name, complexity);
      }
    }
  }

  return new Mixpanel_report();
})();