var gulp = require("gulp");
var jsdoc = require("gulp-jsdoc3");

gulp.task("doc", function (cb) {
  gulp.src(["./README.md",'./src/**/*.js', "./wcc"], { read: false })
    .pipe(jsdoc({
      "opts": {
        "template": "node_modules/docdash",
        "destination":"./doc/"
      }
    }, cb));
})