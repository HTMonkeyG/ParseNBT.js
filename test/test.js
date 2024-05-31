const fs = require('fs'), NBT = require('../main');

var binData = fs.readFileSync(__dirname + '/test.mcstructure');

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

var r, s;
console.log(r = NBT.Reader(toArrayBuffer(binData), !0));
console.log(binData.length)
console.log(JSON.stringify(r));
console.log(s = NBT.Writer(r, !0));
// Issue #1
console.log(s.byteLength)
console.log(NBT.Reader(s, !0));
console.log(NBT.Writer({"comp>":{"comp>":{}}}));

s = Buffer.from([0x0a,0x00,0x00,0x00,0x00,0x0a,0x00,0x00,0x00,0x00]);
console.log(NBT.ReadSerial(toArrayBuffer(s), !0));