const { isDataView } = require("util/types");

var NBT = function () {
  if (!ArrayBuffer)
    throw new Error("Missing ArrayBuffer");
  if (!DataView)
    throw new Error("Missing DataView");
  if (!Uint8Array)
    throw new Error("Missing Uint8Array");
  var type = ["null", "i8", "i16", "i32", "i64", "f32", "f64", "a8", "str", "list", "comp", "a32", "a64"];
  function Reader(b, d) {
    function g(b, c) { return a["get" + b](offset, (offset += c, isBedrock)) }
    var offset = 0, a = new DataView(b), r = new Uint8Array(b), isBedrock = !1, result = {}, func = {};
    r[1] == 0 && r[2] == 0 && r[3] == 0 && (offset = 8, isBedrock = !0);
    !!d && (isBedrock = d);
    func[1] = g.bind(func, "Int8", 1);
    func[2] = g.bind(func, "Int16", 2);
    func["Uint16"] = g.bind(func, "Uint16", 2);
    func[3] = g.bind(func, "Int32", 4);
    func[4] = function () {
      return {
        low: a.getInt32(offset, (offset += 4, isBedrock)),
        high: a.getInt32(offset, (offset += 4, isBedrock))
      }
    }.bind(func);
    func[5] = g.bind(func, "Float32", 4);
    func[6] = g.bind(func, "Float64", 8);
    func[7] = function () {
      var a = this[3]()
        , b = [];
      for (; a > 0; a--)
        b.push(this[1]()),
          offset++;
      return b
    }.bind(func);
    func[8] = function () {
      var l = this["Uint16"](), b;
      b = t(r.slice(offset, offset += l));
      return b
    }.bind(func);
    func[9] = function () {
      var b = [], c, d;
      d = this[1](); c = this[3]();
      b.push(type[d]);
      if (this[d])
        for (; c > 0; c--)
          b.push(this[d]());
      else if (d == 0);
      else
        throw new Error(`Invalid tag ID at Byte${offset - 1} : ${r[offset - 1]}`);
      return b;
    }.bind(func);
    func[10] = function () {
      var b = {}, c, d;
      while ((c = r[offset]) > 0x00)
        if (this[c]) {
          offset++;
          d = this[8]();
          b[type[c] + ">" + d] = this[c]();
        } else
          throw new Error('Invalid tag ID at Byte' + offset + ' : ' + r[offset]);
      return offset++, b;
    }.bind(func);
    func[11] = function () {
      var a = this[3](),
        b = [];
      for (; a > 0; a--)
        b.push(this[3]()),
          offset += 4;
      return b
    }.bind(func);
    func[12] = function () {
      var a = this[3](),
        b = [];
      for (; a > 0; a--)
        b.push(this[3]()),
          offset += 8;
      return b
    }.bind(func);
    function t(a) {
      var b, c = [];
      for (b = 0; b < a.length; b++)
        0 === (128 & a[b]) ? c.push(127 & a[b]) : b + 1 < a.length && 192 === (224 & a[b]) && 128 === (192 & a[b + 1]) ? c.push((31 & a[b]) << 6 | 63 & a[b + 1]) : b + 2 < a.length && 224 === (240 & a[b]) && 128 === (192 & a[b + 1]) && 128 === (192 & a[b + 2]) ? c.push((15 & a[b]) << 12 | (63 & a[b + 1]) << 6 | 63 & a[b + 2]) : b + 3 < a.length && 240 === (248 & a[b]) && 128 === (192 & a[b + 1]) && 128 === (192 & a[b + 2]) && 128 === (192 & a[b + 3]) && c.push((7 & a[b]) << 18 | (63 & a[b + 1]) << 12 | (63 & a[b + 2]) << 6 | 63 & a[b + 3]);
      return String.fromCharCode.apply(null, c)
    }
    while (offset < r.length) {
      var d = r[offset], e;
      if (func[d]) {
        offset++;
        e = func[8]();
        result[type[d] + ">" + e] = func[d]();
      } else
        throw new Error('Invalid tag ID at Byte' + offset + ' : ' + r[offset]);
    }
    return result
  }
  function Writer(a, b) {
    function g(a, b, c) {
      if (offset + b > abuf.byteLength) {
        var t1 = new ArrayBuffer(offset + b), t2 = new DataView(t1), t3 = new Uint8Array(t1);
        t3.set(port);
        t3.fill(0, offset, offset + b);
      }
      t2["set" + a](offset, (offset += b, c));
      abuf = t1, dtv = t2, port = t3;
    }
    var c = JSON.parse(JSON.stringify(a));
    var func = {}, abuf = new ArrayBuffer(0), dtv = new DataView(abuf), port = new Uint8Array(abuf), offset = 0;
    func[1] = g.bind(func, "Int8", 1);
    func[2] = g.bind(func, "Int16", 2);
    func["Uint16"] = g.bind(func, "Uint16", 2);
    func[3] = g.bind(func, "Int32", 4);
    func[4] = function (o) {

    }.bind(func);
    func[5] = g.bind(func, "Float32", 4);
    func[6] = g.bind(func, "Float64", 8);
    func[7] = function () {
      var a = this[3]()
        , b = [];
      for (; a > 0; a--)
        b.push(this[1]()),
          offset++;
      return b
    }.bind(func);
    func[8] = function () {
      var l = this["Uint16"](), b;
      b = t(r.slice(offset, offset += l));
      return b
    }.bind(func);
    func[9] = function () {
      var b = [], c, d;
      d = this[1]();
      b.push(type[d]);
      c = this[3]();
      if (this[d])
        for (; c > 0; c--)
          b.push(this[d]());
      else
        throw new Error(`Invalid tag ID at Byte${offset - 1} : ${a[offset - 1]}`);
      return b;
    }.bind(func);
    func[10] = function () {
      var b = {}, c, d;
      while ((c = r[offset]) > 0x00)
        if (this[c]) {
          offset++;
          d = this[8]();
          b[type[c] + ">" + d] = this[c]();
        } else
          throw new Error('Invalid tag ID at Byte' + offset + ' : ' + a[offset]);
      return offset++, b;
    }.bind(func);
    func[11] = function () {
      var a = this[3](),
        b = [];
      for (; a > 0; a--)
        b.push(this[3]()),
          offset += 4;
      return b
    }.bind(func);
    func[12] = function () {
      var a = this[3](),
        b = [];
      for (; a > 0; a--)
        b.push(this[3]()),
          offset += 8;
      return b
    }.bind(func);
  }
  return {
    Reader: Reader,
    Writer: Writer
  }
}();

module.exports ? (module.exports = NBT) : (window.NBT = NBT);