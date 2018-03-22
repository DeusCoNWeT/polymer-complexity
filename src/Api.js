var express = require('express');
const formidable = require('formidable');
const path = require('path');
const uploadDir = path.join(__dirname, '/uploads/');

var app = express()

app.post("/", uploadMedia);



function uploadMedia (req, res, next) { // This is just for my Controller same as app.post(url, function(req,res,next) {....
  var form = new formidable.IncomingForm()
  form.multiples = true;
  form.keepExtensions = true;
  form.uploadDir = uploadDir;

  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json({ uploaded: true })
  });

  form.on('fileBegin', function (name, file) {
    const [fileName, fileExt] = file.name.split('.');
    file.path = path.join(uploadDir, `${fileName}_${new Date().getTime()}.${fileExt}`);
  });

}


app.listen(8080);