const fs = require('fs'), NBT = require('../main.js');

var binData = toArrayBuffer(fs.readFileSync(__dirname + '/test.mcstructure'));

// Buffer ---> ArrayBuffer
function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}

function test1() {
  console.log("1  NBT.Reader & NBT.Writer")
  var r = NBT.Reader(binData, true)
    , s = NBT.Writer(r, !0);
  console.log(s.byteLength == binData.byteLength);
}
test1();

function test2() {
  console.log("2  NBT.prototype.read")
  var r = new NBT(binData, true)
    , s = r.read()
    , t = NBT.Writer(s, true);
  console.log(t.byteLength == binData.byteLength);
}
test2();

function test3() {
  console.log("3  Multiple NBT.prototype.read");
  var binData = toArrayBuffer(Buffer.from("0a0000000a0000000a0000000a0000000a000000", "hex"));
  var r = new NBT(binData, true), s, t, u = true;
  for (var i = 0; i < 5; i++) {
    s = r.read();
    t = Object.keys(s);
    if (!(t.length == 1 && t[0] == "comp>"))
      u = false;
  }
  console.log(u);
}
test3();

function test4() {
  console.log("4  Iterator");
  var binData = toArrayBuffer(Buffer.from("0a0000000a0000000a0000000a0000000a000000", "hex"));
  var r = new NBT(binData, true), t, u = true;
  for (var s of r) {
    t = Object.keys(s);
    if (!(t.length == 1 && t[0] == "comp>"))
      u = false;
  }
  console.log(u);
}
test4();

function test5() {
  console.log("5  NBT.get & NBT.set");
  var r = NBT.Reader(binData, true);
  console.log(r.get("comp", "").get("i32", "format_version") == 1);
  try {
    r.get("not_exist_type", "qwq")
    console.log(false);
  } catch (e) {
    console.log(true);
  }

  var s = NBT.create();
  // Type override
  s.set("comp", "qwq", "QAQ");
  s.set("i32", "qwq", 114514);
  console.log(s.get("i32", "qwq") == 114514);
  try {
    s.set("not_exist_type", "awa", "emmm");
    console.log(false);
  } catch (e) {
    console.log(true);
  }
}
test5();

function test6() {
  console.log("6  BigInt64");
  var r = NBT.create(), s, t;
  // Type override
  r.set("i64", "qwq", 5201314n);
  s = NBT.Writer(r, true, true);
  t = NBT.Reader(s, true, true);
  console.log(t.get("comp>").get("i64", "qwq") == 5201314n);
}
test6();

function issue1() {
  console.log("Issue #1");
  console.log(NBT.Writer({ "comp>": { "comp>": {} } }).byteLength == 8);
}
issue1();