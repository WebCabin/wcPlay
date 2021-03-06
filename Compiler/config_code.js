var _fs        = require('fs');
var _uglifyJS  = require('uglify-js');
var _uglifyCSS = require('uglifycss');

function concat(opts) {
  var fileList = opts.src;
  var distPath = opts.dest;
  var out = fileList.map(function(filePath) {
    return _fs.readFileSync(filePath).toString();
  });
  _fs.writeFileSync(distPath, out.join('\n'));
  console.log(' '+ distPath +' built.');
}

function uglifyJS(srcPath, distPath) {
  var
    jsp = _uglifyJS.parser,
    pro = _uglifyJS.uglify,
    ast = jsp.parse(_fs.readFileSync(srcPath).toString());

  ast = pro.ast_mangle(ast);
  ast = pro.ast_squeeze(ast);

  var header = `
/*!
 * Web Cabin Play - Node based visual scripting tool.
 *
 * Dependancies:
 *  JQuery 1.11.1
 *  font-awesome 4.2.0
 *  wcMenu
 * Optional Dependencies:
 *  FileSaver.js
 *  wcUndoManager
 *
 * Author: Jeff Houde (lochemage@webcabin.org)
 * Web: http://play.webcabin.org/
 * API: http://play.api.webcabin.org/
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *
 */
`;

  _fs.writeFileSync(distPath, header + pro.gen_code(ast));
  console.log(' '+ distPath +' built.');
}

function uglifyCSS(srcPath, distPath) {
  var
    pro = _uglifyCSS.processString,
    ast = _fs.readFileSync(srcPath).toString();

  _fs.writeFileSync(distPath, pro(ast, {uglyComments:false}));
  console.log(' '+ distPath +' built.');
}



// Main script engine and core nodes.
concat({
  src: [
    '../Code/class.js',
    '../Code/play.js',
    '../Code/nodes/node.js',
    '../Code/nodes/entry.js',
    '../Code/nodes/process.js',
    '../Code/nodes/storage.js',
    '../Code/nodes/composite.js',
    '../Code/nodes/composite/compositescript.js',
    '../Code/nodes/composite/compositeentry.js',
    '../Code/nodes/composite/compositeexit.js',
    '../Code/nodes/composite/compositeproperty.js'
  ],
  dest: '../Build/wcPlay.js'
});

// Common Nodes.
concat({
  src: [
    '../Code/nodes/entry/start.js',
    '../Code/nodes/entry/update.js',
    '../Code/nodes/entry/interval.js',
    '../Code/nodes/entry/remote.js',
    '../Code/nodes/entry/callremote.js',
    '../Code/nodes/process/delay.js',
    '../Code/nodes/process/operation.js',
    '../Code/nodes/process/strcat.js',
    '../Code/nodes/process/ajax.js',
    '../Code/nodes/process/fetch.js',
    '../Code/nodes/process/consolelog.js',
    '../Code/nodes/process/alert.js',
    '../Code/nodes/storage/global.js',
    '../Code/nodes/storage/string.js',
    '../Code/nodes/storage/number.js',
    '../Code/nodes/storage/toggle.js'
  ],
  dest: '../Build/wcPlayNodes.js'
});

// Script editor tool.
concat({
  src: [
    '../Code/fuse.min.js',
    '../Code/editor.js'
  ],
  dest: '../Build/wcPlayEditor.js'
});
concat({
  src: [
    '../Code/editor.css'
  ],
  dest: '../Build/wcPlayEditor.css'
});

// Combine the example nodes.
concat({
  src: [
    '../Code/nodes/example/exampleviewport.js',
    '../Code/nodes/example/exampleproperties.js',
    '../Code/nodes/example/exampledynamic.js'
  ],
  dest: '../Build/wcPlayExampleNodes.js'
});

// Now minify them.
uglifyJS('../Build/wcPlay.js', '../Build/wcPlay.min.js');
uglifyJS('../Build/wcPlayNodes.js', '../Build/wcPlayNodes.min.js');
uglifyJS('../Build/wcPlayEditor.js', '../Build/wcPlayEditor.min.js');
uglifyCSS('../Build/wcPlayEditor.css', '../Build/wcPlayEditor.min.css');
