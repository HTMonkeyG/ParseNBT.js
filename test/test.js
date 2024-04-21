const fs = require('fs'), NBT = require('../main.js');

var binData = fs.readFileSync(__dirname + '/temp4.mcstructure');

console.log(binData);

// Buffer ---> ArrayBuffer
function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}
// ArrayBuffer ---> Buffer
function toBuffer(ab) {
  var buf = new Buffer(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    buf[i] = view[i];
  }
  return buf;
}

var r;
console.log(r = NBT.Reader(toArrayBuffer(binData), !0));
console.log(JSON.stringify(r));