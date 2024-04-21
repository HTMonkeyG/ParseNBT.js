var NBT = function () {
  if (!ArrayBuffer)
    throw new Error("Missing ArrayBuffer");
  if (!DataView)
    throw new Error("Missing DataView");
  if (!Uint8Array)
    throw new Error("Missing Uint8Array");
  var type = [null, "i8", "i16", "i32", "i64", "f32", "f64", "a8", "str", "list", "comp", "a32", "a64"];
  function Reader(b, d) {
    var offset = 0, a = new DataView(b), r = new Uint8Array(b), isBedrock = !1, result = {};
    r[1] == 0 && r[2] == 0 && r[3] == 0 && (offset = 8, isBedrock = !0);
    !!d && (isBedrock = d);
    function g(b, c) { return a["get" + b](offset, (offset += c, isBedrock)) }
    this[1] = g.bind(this, "Int8", 1);
    this[2] = g.bind(this, "Int16", 2);
    this["Uint16"] = g.bind(this, "Uint16", 2);
    this[3] = g.bind(this, "Int32", 4);
    this[4] = function () {
      return {
        low: a.getInt32(offset, (offset += 4, isBedrock)),
        high: a.getInt32(offset, (offset += 4, isBedrock))
      }
    }.bind(this);
    this[5] = g.bind(this, "Float32", 4);
    this[6] = g.bind(this, "Float64", 8);
    this[7] = function () {
      var a = this[3]()
        , b = [];
      for (; a > 0; a--)
        b.push(this[1]()),
          offset++;
      return b
    }.bind(this);
    this[8] = function () {
      var l = this["Uint16"](), b;
      b = t(r.slice(offset, offset += l));
      return b
    }.bind(this);
    this[9] = function () {
      var b = [], c, d;
      d = this[1]();
      b.push(type[d]);
      c = this[3]();
      if (this[d])
        for (; c > 0; c--)
          b.push(this[d]());
      else if (d == 0);
      else
        throw new Error(`Invalid tag ID at Byte${offset - 1} : ${a[offset - 1]}`);
      return b;
    }.bind(this);
    this[10] = function () {
      var b = {}, c, d;
      while ((c = r[offset]) > 0x00)
        if (this[c]) {
          offset++;
          d = this[8]();
          b[type[c] + ">" + d] = this[c]();
        } else
          throw new Error('Invalid tag ID at Byte' + offset + ' : ' + a[offset]);
      return offset++, b;
    }.bind(this);
    this[11] = function () {
      var a = this[3](),
        b = [];
      for (; a > 0; a--)
        b.push(this[3]()),
          offset += 4;
      return b
    }.bind(this);
    this[12] = function () {
      var a = this[3](),
        b = [];
      for (; a > 0; a--)
        b.push(this[3]()),
          offset += 8;
      return b
    }.bind(this);
    function t(a) {
      var b, c = [];
      for (b = 0; b < a.length; b++)
        0 === (128 & a[b]) ? c.push(127 & a[b]) : b + 1 < a.length && 192 === (224 & a[b]) && 128 === (192 & a[b + 1]) ? c.push((31 & a[b]) << 6 | 63 & a[b + 1]) : b + 2 < a.length && 224 === (240 & a[b]) && 128 === (192 & a[b + 1]) && 128 === (192 & a[b + 2]) ? c.push((15 & a[b]) << 12 | (63 & a[b + 1]) << 6 | 63 & a[b + 2]) : b + 3 < a.length && 240 === (248 & a[b]) && 128 === (192 & a[b + 1]) && 128 === (192 & a[b + 2]) && 128 === (192 & a[b + 3]) && c.push((7 & a[b]) << 18 | (63 & a[b + 1]) << 12 | (63 & a[b + 2]) << 6 | 63 & a[b + 3]);
      return String.fromCharCode.apply(null, c)
    }
    while (offset < r.length) {
      var d = r[offset], e;
      if (this[d]) {
        offset++;
        e = this[8]();
        result[type[d] + ">" + e] = this[d]();
      } else
        throw new Error('Invalid tag ID at Byte' + offset + ' : ' + r[offset]);
    }
    return result
  }
  function Writer() {

  }
  return {
    Reader: Reader,
    Writer: Writer
  }
}();

module.exports ? (module.exports = NBT) : (window.NBT = NBT);