const fs = require('fs')
  , NBT = require('../main.js');

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
  var r = NBT.Reader(binData, { littleEndian: true })
    , s = NBT.Writer(r, { littleEndian: true });
  console.log(s.byteLength == binData.byteLength);
}
test1();

function test2() {
  console.log("2  NBT.prototype.read")
  var r = new NBT(binData, { littleEndian: true })
    , s = r.read()
    , t = NBT.Writer(s, { littleEndian: true });
  console.log(t.byteLength == binData.byteLength);
}
test2();

function test3() {
  console.log("3  Multiple NBT.prototype.read");
  var binData = toArrayBuffer(Buffer.from("0a0000000a0000000a0000000a0000000a000000", "hex"));
  var r = new NBT(binData, { littleEndian: true }), s, t, u = true;
  for (var i = 0; i < 5; i++) {
    s = r.read();
    t = NBT.keys(s);
    if (!(t.length == 1 && t[0] == "comp>"))
      u = false;
  }
  console.log(u);
}
test3();

function test4() {
  console.log("4  Iterator");
  var binData = toArrayBuffer(Buffer.from("0a0000000a0000000a0000000a0000000a000000", "hex"));
  var r = new NBT(binData, { littleEndian: true }), t, u = true;
  for (var s of r) {
    t = NBT.keys(s);
    if (!(t.length == 1 && t[0] == "comp>"))
      u = false;
  }
  console.log(u);
}
test4();


function test6() {
  console.log("6  BigInt64");
  var r = NBT.create(), s, t;
  // Type override
  r["i64>qwq"] = 5201314n;
  s = NBT.Writer(r, { littleEndian: true, allowBigInt: true });
  t = NBT.Reader(s, { littleEndian: true, asBigInt: true });
  console.log(t["comp>"]["i64>qwq"] == 5201314n);
}
test6();

function test7() {
  console.log("7  NBT.equal")
  var r = NBT.Reader(binData, { littleEndian: true })
    , s = NBT.Reader(binData, { littleEndian: true });
  console.log(NBT.equal(r, s));

  s["comp>"]["i32>awa"] = "QAQ";

  console.log(!NBT.equal(r, s));
}
test7();

function test8() {
  console.log("8  TypedArray")
  var r = NBT.create(), s, t;
  r["comp>"] = NBT.create();
  r["comp>"]["list>emmm"] = new Int32Array(10);
  r["comp>"]["list>emmm"][0] = 114514;
  s = NBT.Writer(r, { littleEndian: true, allowBigInt: true, allowTypedArray: true });
  t = NBT.Reader(s, { littleEndian: true, asBigInt: true, asTypedArray: true });
  console.log(NBT.equal(r, t));
}
test8();

function test9() {
  console.log("9  Proxy")

  var r = NBT.create(true);

  r["i8>qwq"] = 0;
  console.log(r.qwq == 0);

  r["i8>qwq"] = 114514;
  console.log(r.qwq == 255);

  r["str>qwq"] = 114514;
  console.log(r.qwq == "114514");
}
test9();

function test10() {
  console.log("10  UTF-8");

  var r = {
    "str>键": "值",
    "str>Astral planes⭐": "🤣👉🤡"
  }
    , s, t;

  s = NBT.Writer(r, { littleEndian: true });
  t = NBT.Reader(s, { littleEndian: true });
  console.log(t["comp>"]["str>键"] == "值");
  console.log(t["comp>"]["str>Astral planes⭐"] == "🤣👉🤡");
}
test10();

function issue1() {
  console.log("Issue #1");
  console.log(NBT.Writer({ "comp>": { "comp>": {} } }, { littleEndian: true }).byteLength == 8);
}
issue1();