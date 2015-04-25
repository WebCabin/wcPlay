var _fs        = require('fs');
var _uglifyJS  = require('uglify-js');
var _uglifyCSS = require('uglifycss');

function concat(opts) {
    var fileList = opts.src;
    var distPath = opts.dest;
    var out = fileList.map(function(filePath){
            return _fs.readFileSync(filePath).toString();
        });
    _fs.writeFileSync(distPath, out.join('\n'));
    console.log(' '+ distPath +' built.');
}

function uglifyJS(srcPath, distPath) {
    var
      jsp = _uglifyJS.parser,
      pro = _uglifyJS.uglify,
      ast = jsp.parse( _fs.readFileSync(srcPath).toString() );
 
    ast = pro.ast_mangle(ast);
    ast = pro.ast_squeeze(ast);

var header = '\
/*!\n\
 * Web Cabin Play - Node based visual scripting tool.\n\
 *\n\
 * Dependancies:\n\
 *  JQuery 1.11.1\n\
 *  font-awesome 4.2.0\n\
 *\n\
 * Author: Jeff Houde (lochemage@webcabin.org)\n\
 * Web: https://play.webcabin.org/\n\
 * API: https://play.api.webcabin.org/\n\
 *\n\
 * Licensed under\n\
 *   MIT License http://www.opensource.org/licenses/mit-license\n\
 *\n\
 */\n';

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



// Combine the source files
concat({
  src: [
    '../Code/class.js',
    '../Code/play.js',
    '../Code/editor.js',
    '../Code/nodes/node.js',
    '../Code/nodes/entry.js',
    '../Code/nodes/process.js',
    '../Code/nodes/storage.js',
    '../Code/nodes/composite.js',
    '../Code/nodes/composite/compositescript.js',
    '../Code/nodes/composite/compositeentry.js',
    '../Code/nodes/composite/compositeexit.js',
    '../Code/nodes/composite/compositeproperty.js',
    '../Code/nodes/entry/start.js',
    '../Code/nodes/process/delay.js',
    '../Code/nodes/process/consolelog.js',
    '../Code/nodes/process/alert.js',
    '../Code/nodes/process/operation.js',
    '../Code/nodes/storage/global.js',
    '../Code/nodes/storage/toggle.js',
    '../Code/nodes/storage/number.js',
    '../Code/nodes/storage/string.js',
  ],
  dest: '../Build/wcPlay.js',
});

// Combine the example nodes.
concat({
  src: [
    '../Code/nodes/example/exampleviewport.js',
    '../Code/nodes/example/exampleproperties.js',
    '../Code/nodes/example/exampledynamic.js',
  ],
  dest: '../Build/wcPlayExampleNodes.js',
});

concat({
  src: [
    '../Code/editor.css',
  ],
  dest: '../Build/wcPlay.css',
});

// Now minify them. 
uglifyJS('../Build/wcPlay.js', '../Build/wcPlay.min.js');
uglifyCSS('../Build/wcPlay.css', '../Build/wcPlay.min.css');
