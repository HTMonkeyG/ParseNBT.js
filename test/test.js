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
    if (!(t.length == 1 && t[0] == "obj>"))
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
    if (!(t.length == 1 && t[0] == "obj>"))
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
  console.log(t["obj>"]["i64>qwq"] == 5201314n);
}
test6();

function test7() {
  console.log("7  NBT.equal")
  var r = NBT.Reader(binData, { littleEndian: true })
    , s = NBT.Reader(binData, { littleEndian: true });
  console.log(NBT.equal(r, s));

  s["obj>"]["i32>awa"] = "QAQ";

  console.log(!NBT.equal(r, s));
}
test7();

function test8() {
  console.log("8  TypedArray")
  var r = NBT.create(), s, t;
  r["obj>"] = NBT.create();
  r["obj>"]["lst>emmm"] = new Int32Array(10);
  r["obj>"]["lst>emmm"][0] = 114514;
  s = NBT.Writer(r, { littleEndian: true, allowBigInt: true, allowTypedArray: true });
  t = NBT.Reader(s, { littleEndian: true, asBigInt: true, asTypedArray: true });
  console.log(NBT.equal(r, t));
}
test8();

function test9() {
  console.log("9  Proxy")

  var r = NBT.create(true);

  r["i08>qwq"] = 0;
  console.log(r.qwq == 0);

  r["i08>qwq"] = 114514;
  console.log(r.qwq == 127);

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
  console.log(t["obj>"]["str>键"] == "值");
  console.log(t["obj>"]["str>Astral planes⭐"] == "🤣👉🤡");
}
test10();

function test11() {
  console.log("11  Circular");

  var r = NBT.create(true)
    , s = NBT.create(true)
    , t = NBT.create(true)
    , u;

  r["obj>0"] = s;
  s["obj>1"] = t;
  t["obj>2"] = s;

  try {
    u = NBT.Writer(r, { littleEndian: true });
  } catch (e) {
    console.log(e.message == "Cannot serialize circular reference to NBT.")
  }
}
test11();

function test12() {
  console.log("12  NBT.assign");

  var r = NBT.create(true)
    , s = NBT.create(true)
    , t;

  r["str>awa"] = "qwq";
  r["i08>k"] = 42;

  s["i16>awa"] = 1145;

  t = NBT.assign(r, s);

  console.log(t.awa == 1145 && t["str>awa"] == void 0)
}
test12();

function issue1() {
  console.log("Issue #1");
  console.log(NBT.Writer({ "obj>": { "obj>": {} } }, { littleEndian: true }).byteLength == 8);
}
issue1();

// Regression tests for the issues fixed after 3.1.3
var passed = 0
  , failed = [];

function ok(name, cond) {
  cond ? passed++ : failed.push(name);
}

function throws(name, fn, match) {
  try {
    fn();
    failed.push(name + ": did not throw");
  } catch (e) {
    e.message.indexOf(match) >= 0 ? passed++ : failed.push(name + ": " + e.message);
  }
}

function hex(s) {
  return toArrayBuffer(Buffer.from(s, "hex"))
}

function regression() {
  console.log("Regression");

  // MCBE header detection used to test ArrayBuffer.length, which never exists
  var body = Buffer.from(NBT.Writer({ "obj>": { "i08>a": 1 } }, { littleEndian: true }))
    , head = Buffer.alloc(8);
  head.writeUInt32LE(8, 0);
  head.writeUInt32LE(body.length, 4);
  ok("header skipped", NBT.Reader(toArrayBuffer(Buffer.concat([head, body])), { littleEndian: true })["obj>"]["i08>a"] === 1);
  ok("headerless data unaffected", NBT.Reader(toArrayBuffer(body), { littleEndian: true })["obj>"]["i08>a"] === 1);

  // Cycles reachable only through a list went undetected and overflowed the stack
  var r = NBT.create()
    , l = ["obj"];
  r["lst>l"] = l;
  l.push(r);
  throws("cycle through a list", function () { NBT.Writer(r) }, "circular");

  // A value referenced twice is not a cycle
  var shared = NBT.create()
    , d = NBT.create();
  shared["i08>v"] = 1;
  d["obj>a"] = shared;
  d["obj>b"] = shared;
  ok("shared reference allowed", NBT.Writer(d).byteLength === 24);

  // asTypedArray alone used to leave a32 as a plain Array
  var t = NBT.Reader(NBT.Writer({ "a32>x": new Int32Array([1, 2, 3]), "a08>y": new Int8Array([1, 2]) }), { asTypedArray: true });
  ok("a32 as Int32Array", t["obj>"]["a32>x"] instanceof Int32Array);
  ok("a8 as Int8Array", t["obj>"]["a08>y"] instanceof Int8Array);

  // ownKeys reported keys that getOwnPropertyDescriptor denied
  var p = NBT.create(true);
  p["i08>a"] = 1;
  p["str>b"] = "x";
  ok("Object.keys on proxy", Object.keys(p).join() === "i08>a,str>b");
  ok("JSON.stringify on proxy", JSON.stringify(p) === '{"i08>a":1,"str>b":"x"}');
  ok("spread on proxy", JSON.stringify({ ...p }) === '{"i08>a":1,"str>b":"x"}');
  ok("proxy converts to primitive", typeof String(p) === "string");
  ok("in with type", "i08>a" in p);
  ok("in without type", "a" in p);

  // Traps used to return a falsy value, which throws in strict mode
  ok("delete of a missing key", (function () { "use strict"; return delete p["i08>zzz"] })());
  ok("symbol key round trip", (function () { "use strict"; var s = Symbol("k"); p[s] = 7; return p[s] === 7 })());
  ok("PROXIED_NBT stays read only", (function () { p[NBT.PROXIED_NBT] = 1; return p[NBT.PROXIED_NBT] !== 1 })());

  // Type override used to scan every key, making a fill O(n^2)
  var big = NBT.create(true)
    , i;
  for (i = 0; i < 20000; i++)
    big["i32>k" + i] = i;
  ok("proxy fill stays linear", NBT.keys(big).length === 20000 && big.k19999 === 19999);

  // equal() dereferenced its arguments before checking them for null
  ok("equal(null, null)", NBT.equal(null, null) === true);
  ok("equal(null, {})", NBT.equal(null, NBT.create()) === false);
  ok("equal with holes", NBT.equal([void 0], [void 0]) === true);
  // Arrays, typed arrays and compounds are never equal to each other
  ok("equal array vs compound", NBT.equal([1, 2, 3], NBT.create()) === false);
  ok("equal array vs typed array", NBT.equal(["i08", 1, 2], new Int8Array([1, 2])) === false);
  ok("equal typed arrays", NBT.equal(new Int8Array([1, 2]), new Int8Array([1, 2])) === true);
  var c1 = NBT.create()
    , c2 = NBT.create();
  c1["obj>s"] = c1;
  c2["obj>s"] = c2;
  ok("equal terminates on a cycle", NBT.equal(c1, c2) === true);

  // assign() only overrode types present in target before the call
  var a = NBT.assign(NBT.create(), { "i08>a": 1 }, { "i32>a": 2 });
  ok("assign overrides across sources", NBT.keys(a).join() === "i32>a" && a["i32>a"] === 2);
  ok("assign to null", NBT.assign(null, { "i08>a": 1 }) === null);

  // typeof null == "object", so null used to pass every container type check
  var n = NBT.create(true);
  n["obj>c"] = null;
  n["lst>l"] = null;
  n["i64>i"] = null;
  ok("null becomes an empty compound", NBT.keys(n["obj>c"]).length === 0);
  ok("null becomes an empty list", Array.isArray(n["lst>l"]));
  ok("null becomes a zero i64", n["i64>i"].high === 0 && n["i64>i"].low === 0);
  throws("null compound reported", function () { NBT.Writer({ "obj>x": null }) }, "Invalid compound");
  throws("plain object as a list", function () { NBT.Writer({ "lst>l": {} }) }, "Invalid list");

  // i64 given a number used to be written as zero
  function i64(v, o) {
    return NBT.Reader(NBT.Writer({ "i64>n": v }, o), Object.assign({ asBigInt: true }, o))["obj>"]["i64>n"]
  }
  ok("i64 from a positive number", i64(42) === 42n);
  ok("i64 from a negative number", i64(-1) === -1n);
  ok("i64 above 32 bits", i64(1099511627776) === 1099511627776n);
  ok("i64 little endian", i64(-12345678901, { littleEndian: true }) === -12345678901n);
  var q = NBT.create(true);
  q["i64>n"] = -1;
  ok("i64 through typeCheck", NBT.Reader(NBT.Writer(q), { asBigInt: true })["obj>"]["i64>n"] === -1n);

  // The 16 bit length field used to wrap silently
  throws("overlong string", function () { NBT.Writer({ "str>s": "a".repeat(70000) }) }, "too long");
  ok("longest valid string", NBT.Reader(NBT.Writer({ "str>s": "a".repeat(65535) }))["obj>"]["str>s"].length === 65535);

  // Byte 6 holds the invalid element type: the offset used to be reported as 10
  throws("list element type offset", function () { NBT.Reader(hex("0a00000900006300000000")) }, "Byte6 : 99");

  // Running out of data used to end a compound silently
  throws("missing TAG_End", function () { NBT.Reader(hex("0a00000100016105")) }, "missing TAG_End");
  throws("length past the end", function () { NBT.Reader(hex("0a00000b00007FFFFFFF00")) }, "Unexpected end");
  ok("complete data still reads", NBT.Reader(hex("0a0000010001610500"))["obj>"]["i08>a"] === 5);

  // read() used to copy the whole remaining buffer on every call
  var seq = hex("0a000000".repeat(4000))
    , rd = new NBT(seq)
    , c = 0;
  while (rd.canRead()) {
    rd.read();
    c++;
  }
  ok("read stays linear", c === 4000);

  // The iterator restarted from zero and ignored the reader offset
  rd = new NBT(hex("0a000000".repeat(3)));
  rd.read();
  ok("iterator continues from the offset", [...rd].length === 2);
  ok("iterator is iterable", [...new NBT(hex("0a000000"))[Symbol.iterator]()].length === 1);

  // A Buffer or any view of an ArrayBuffer is accepted directly now
  var buf = Buffer.from(NBT.Writer({ "obj>": { "i08>a": 7 } }, { littleEndian: true }));
  ok("Buffer input", NBT.Reader(buf, { littleEndian: true })["obj>"]["i08>a"] === 7);
  ok("view with a byte offset", NBT.Reader(Buffer.concat([Buffer.alloc(3, 255), buf]).subarray(3), { littleEndian: true })["obj>"]["i08>a"] === 7);
  throws("input that is not a buffer", function () { NBT.Reader("nope") }, "ArrayBuffer");

  // Big endian data now uses Java's modified UTF-8, MCBE keeps standard UTF-8
  function strBytes(v, o) {
    var b = Buffer.from(NBT.Writer({ "str>k": v }, o));
    return b.subarray(9, b.length - 1).toString("hex")
  }
  ok("java writes 0xC080 for U+0000", strBytes("\u0000") === "c080");
  ok("java writes surrogates apart", strBytes("\u{1F600}") === "eda0bdedb880");
  ok("java leaves ascii alone", strBytes("hello") === "68656c6c6f");
  ok("java leaves the BMP alone", strBytes("值") === "e580bc");
  ok("mcbe keeps standard UTF-8", strBytes("\u{1F600}", { littleEndian: true }) === "f09f9880");
  ok("mcbe keeps a raw NUL", strBytes("\u0000", { littleEndian: true }) === "00");
  for (var v of ["", "hello", "\u0000", "\u{1F600}", "a\u0000b\u{1F600}c值", "键值⭐🤣👉🤡"]) {
    ok("round trip big endian " + JSON.stringify(v), NBT.Reader(NBT.Writer({ "str>k": v }))["obj>"]["str>k"] === v);
    ok("round trip little endian " + JSON.stringify(v), NBT.Reader(NBT.Writer({ "str>k": v }, { littleEndian: true }), { littleEndian: true })["obj>"]["str>k"] === v);
  }
  // Plain UTF-8 written by earlier versions still decodes
  ok("legacy plain UTF-8 read back", NBT.Reader(toArrayBuffer(Buffer.concat([
    Buffer.from("0a00000800016b", "hex"), Buffer.from([0, 4]), Buffer.from("\u{1F600}", "utf8"), Buffer.from([0])
  ])))["obj>"]["str>k"] === "\u{1F600}");

  console.log(failed.length ? passed + " passed, " + failed.length + " failed:" : passed + " passed");
  for (var f of failed)
    console.log("  " + f);
  failed.length && (process.exitCode = 1);
}
regression();