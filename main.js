if (typeof ArrayBuffer == "undefined")
  throw new Error("Missing ArrayBuffer");
if (typeof DataView == "undefined")
  throw new Error("Missing DataView");
if (typeof Uint8Array == "undefined")
  throw new Error("Missing Uint8Array");
if (typeof WeakMap == "undefined")
  throw new Error("Missing WeakMap");

var typeR = { 0: "null", 1: "i8", 2: "i16", 3: "i32", 4: "i64", 5: "f32", 6: "f64", 7: "a8", 8: "str", 9: "list", 10: "comp", 11: "a32", 12: "a64" }
  , typeW = { "null": 0, "i8": 1, "i16": 2, "i32": 3, "i64": 4, "f32": 5, "f64": 6, "a8": 7, "str": 8, "list": 9, "comp": 10, "a32": 11, "a64": 12 }
  , lMask, hMask, shift;

const NBTObjectProto = {
  __NBT__: 1,
  get: function (type, key) {
    return NBT.get(this, type, key)
  },
  set: function (type, key, value) {
    return NBT.set(this, type, key, value)
  }
};

if (typeof BigInt != "undefined") {
  lMask = BigInt(0xFFFFFFFF);
  hMask = lMask << BigInt(32);
  shift = BigInt(32)
}

function detectCircularReferences(obj, allowBigInt) {
  const cache = new WeakMap();
  return JSON.parse(JSON.stringify(obj, (_, value) => {
    if (typeof value == 'object' && value !== null) {
      if (cache.has(value))
        throw new Error("Cannot serialize circular reference to NBT")
      cache.set(value, true);
    } else if (typeof value == 'bigint' && allowBigInt)
      return {
        low: Number(value & lMask) | 0,
        high: Number((value & hMask) >> shift) | 0
      };
    return value;
  }));
}

function fromUtf8(a) {
  var b, c = [];
  for (b = 0; b < a.length; b++)
    0 === (128 & a[b]) ? c.push(127 & a[b]) : b + 1 < a.length && 192 === (224 & a[b]) && 128 === (192 & a[b + 1]) ? c.push((31 & a[b]) << 6 | 63 & a[b + 1]) : b + 2 < a.length && 224 === (240 & a[b]) && 128 === (192 & a[b + 1]) && 128 === (192 & a[b + 2]) ? c.push((15 & a[b]) << 12 | (63 & a[b + 1]) << 6 | 63 & a[b + 2]) : b + 3 < a.length && 240 === (248 & a[b]) && 128 === (192 & a[b + 1]) && 128 === (192 & a[b + 2]) && 128 === (192 & a[b + 3]) && c.push((7 & a[b]) << 18 | (63 & a[b + 1]) << 12 | (63 & a[b + 2]) << 6 | 63 & a[b + 3]);
  return String.fromCharCode.apply(null, c)
}

function toUtf8(a) {
  var b, c, d = [];
  for (b = 0; b < a.length; b++)
    c = a.charCodeAt(b),
      128 > c ? d.push(c) : 2048 > c ? (d.push(192 | c >> 6),
        d.push(128 | 63 & c)) : 65536 > c ? (d.push(224 | c >> 12),
          d.push(128 | c >> 6 & 63),
          d.push(128 | 63 & c)) : (d.push(240 | c >> 18 & 7),
            d.push(128 | c >> 12 & 63),
            d.push(128 | c >> 6 & 63),
            d.push(128 | 63 & c));
  return d
}

function ReaderProto(buf, forceBE, asBigInt, isSerial) {
  function g(b, c) {
    return a["get" + b](offset, (offset += c, isBedrock))
  }

  var offset = 0
    , a = new DataView(buf)
    , r = new Uint8Array(buf)
    , isBedrock = false
    , func = {};

  // Detect MCBE NBT header
  buf.length > 8 && a.getUint32(4, true) == r.byteLength - 8 && (forceBE = true, offset = 8);
  // Force to read as MCBE type
  !!forceBE && (isBedrock = true);

  func["Uint16"] = g.bind(func, "Uint16", 2);
  // i8
  func[1] = g.bind(func, "Int8", 1);
  // i16
  func[2] = g.bind(func, "Int16", 2);
  // i32
  func[3] = g.bind(func, "Int32", 4);
  // i64
  func[4] = asBigInt ? g.bind(func, "BigInt64", 8) : function () {
    var a = this[3](), b = this[3]();
    return isBedrock ? { high: b, low: a, } : { high: a, low: b }
  }.bind(func);
  // f32
  func[5] = g.bind(func, "Float32", 4);
  // f64
  func[6] = g.bind(func, "Float64", 8);
  // a8
  func[7] = function () {
    var a = this[3]()
      , b = [];
    for (; a > 0; a--)
      b.push(this[1]());
    return b
  }.bind(func);
  // str
  func[8] = function () {
    var l = this["Uint16"](), b;
    b = fromUtf8(r.slice(offset, offset += l));
    return b
  }.bind(func);
  // list
  func[9] = function () {
    var b = [], c, d;
    d = this[1]();
    c = this[3]();
    b.push(typeR[d]);
    if (this[d])
      for (; c > 0; c--)
        b.push(this[d]());
    else if (d == 0)
      ;
    else
      throw new Error(`Invalid tag ID at Byte${offset - 1} : ${r[offset - 1]}`);
    return b;
  }.bind(func);
  // comp
  func[10] = function () {
    var b = { __proto__: NBTObjectProto }, c, d;
    while ((c = r[offset]) > 0x00)
      if (this[c]) {
        offset++;
        d = this[8]();
        b[typeR[c] + ">" + d] = this[c]();
      } else
        throw new Error('Invalid tag ID at Byte' + offset + ' : ' + r[offset]);
    return offset++, b;
  }.bind(func);
  // i32
  func[11] = function () {
    var a = this[3](),
      b = [];
    for (; a > 0; a--)
      b.push(this[3]());
    return b
  }.bind(func);
  // i64
  func[12] = function () {
    var a = this[3](),
      b = [];
    for (; a > 0; a--)
      b.push(this[4]());
    return b
  }.bind(func);
  func["root"] = function () {
    var b = { __proto__: NBTObjectProto }, c = r[offset], d;
    if (this[c]) {
      offset++;
      d = this[8]();
      b[typeR[c] + ">" + d] = this[c]();
    } else
      throw new Error('Invalid tag ID at Byte' + offset + ' : ' + r[offset]);
    return b
  }.bind(func);
  if (isSerial) {
    var result = [];
    while (1) {
      if (func[r[offset]]) result.push(func["root"]());
      else if (offset < buf.byteLength) offset++;
      else break;
    }
    return result
  } else return {
    value: func["root"](),
    length: offset
  }
}

function WriterProto(obj, littleEndian, allowBigInt, noCheck) {
  function g(a, b, c) {
    if (offset + b > abuf.byteLength) {
      var t1 = new ArrayBuffer(offset + b), t2 = new DataView(t1), t3 = new Uint8Array(t1);
      t3.set(port);
      abuf = t1, dtv = t2, port = t3;
    }
    dtv["set" + a](offset, (offset += b, c), isBedrock);
  }

  var c = noCheck ? c : detectCircularReferences(obj, allowBigInt)
    , isBedrock = !!littleEndian
    , func = {}
    , abuf = new ArrayBuffer(1)
    , dtv = new DataView(abuf)
    , port = new Uint8Array(abuf)
    , offset = 0;

  func["Uint16"] = g.bind(func, "Uint16", 2);
  func["BigInt64"] = g.bind(func, "BigInt64", 8);
  func[1] = g.bind(func, "Int8", 1);
  func[2] = g.bind(func, "Int16", 2);
  func[3] = g.bind(func, "Int32", 4);
  func[4] = function (o) {
    if (typeof o == 'bigint')
      func["BigInt64"](o);
    else
      isBedrock ? (func[3](0 | o.low || 0), func[3](0 | o.high || 0)) : (func[3](0 | o.high || 0), func[3](0 | o.low || 0));
  }.bind(func);
  func[5] = g.bind(func, "Float32", 4);
  func[6] = g.bind(func, "Float64", 8);
  func[7] = function (o) {
    this[3](o.length);
    for (var e of o)
      this[1](e)
  }.bind(func);
  func[8] = function (s) {
    var a = toUtf8(s);
    this["Uint16"](a.length);
    for (var e of a)
      this[1](e)
  }.bind(func);
  func[9] = function (l) {
    var t = typeW[l[0]], m = l.slice(1);
    this[1](t);
    if (t) {
      this[3](m.length);
      for (var e of m)
        this[t](e)
    } else if (t == 0) {
      this[3](0)
    } else throw new Error("Invalid type name: " + t);
  }.bind(func);
  func[10] = function (o) {
    for (var e in o) {
      var f = e.indexOf(">"), g = typeW[e.substring(0, f)];
      if (!g) throw new Error("Invalid type name: " + f[0]);
      this[1](g);
      this[8](e.substring(f + 1));
      this[g](o[e]);
    }
    this[1](0)
  }.bind(func);
  func[11] = function (o) {
    this[3](o.length);
    for (var e of o)
      this[3](e)
  }.bind(func);
  func[12] = function (o) {
    this[3](o.length);
    for (var e of o)
      this[4](e)
  }.bind(func);
  func["root"] = function (o) {
    var keys = Object.keys(o);
    if (keys.length != 1 || keys[0] != "comp>")
      o = { "comp>": o };

    for (var e in o) {
      var f = e.indexOf(">"), g = typeW[e.substring(0, f)];
      if (!g) throw new Error("Invalid type name: " + f[0]);
      this[1](g);
      this[8](e.substring(f + 1));
      this[g](o[e]);
    }
  }.bind(func);
  func["root"](c);
  return abuf
}

class NBT {
  /**
   * Create a new NBT object
   * @returns 
   */
  static create() {
    return {
      __proto__: NBTObjectProto
    }
  }

  /**
   * Get attribute in NBT object.
   * 
   * When type is not a string, it will return the first value with given key,
   * no matter its type.
   * @param {*} obj - NBT object
   * @param {String|undefined} type - Value type or "[type]>[key]" formatted key
   * @param {String|undefined} key - Key
   * @returns
   */
  static get(obj, type, key) {
    if (typeof key == 'undefined')
      return obj[type]
    else if (typeof type != 'string') {
      for (var k of NBT.keys(obj))
        if (k.split(">")[1] == key)
          return obj[k];
      return void 0
    } else if (Object.keys(typeW).indexOf(type) == -1)
      throw new Error("Invalid type name " + type);
    return obj[type + ">" + key]
  }

  /**
   * Set attribute in NBT object with validation.
   * 
   * When type is not a string, it will set the first value matches given key,
   * with its existing type. If the key not exists, it wont be created.
   * @param {*} obj - Input buffer
   * @param {String} type - Value type
   * @param {String} key - Key
   * @param {*} value - Value
   * @returns
   */
  static set(obj, type, key, value) {
    if (key.indexOf(">") != -1)
      throw new Error("Invalid key " + type);
    if (typeof type != 'string') {
      for (var k of NBT.keys(obj))
        if (k.split(">")[1] == key)
          obj[k] = value;
      return
    } else if (Object.keys(typeW).indexOf(type) == -1)
      throw new Error("Invalid type name " + type);

    for (var k of Object.keys(obj))
      if (k.split(">")[1] == key) {
        delete obj[k];
        break;
      }
    obj[type + ">" + key] = value;
  }

  /**
   * Returns the names with valid type-value pair of an NBT object.
   * @param {*} obj 
   * @returns {String[]}
   */
  static keys(obj) {
    var result = [];
    for (var k of Object.getOwnPropertyNames(obj)) {
      var l = k.split(">");
      if (Object.keys(typeW).indexOf(l[0]) != -1)
        result.push(k)
    }
    return result
  }

  /**
   * Read NBT data in buffer.
   * @param {ArrayBuffer} buf - Input buffer
   * @param {Boolean} littleEndian - Read as little endian if true
   * @param {Boolean} asBigInt - Read i64 as BigInt if true
   * @returns {*}
   */
  static Reader(buf, littleEndian, asBigInt) {
    return ReaderProto(buf, littleEndian, asBigInt, !1).value
  }

  /**
   * Read concatenated root label sequence.
   * @param {ArrayBuffer} buf - Input buffer
   * @param {Boolean} littleEndian - Read as little endian if true
   * @param {Boolean} asBigInt - Read i64 as BigInt if true
   * @returns {Array} Array of NBT root tags
   */
  static ReadSerial(buf, littleEndian, asBigInt) {
    return ReaderProto(buf, littleEndian, asBigInt, !0)
  }

  /**
   * Serialize NBT object.
   * @param {*} obj - Input object
   * @param {Boolean} littleEndian - Write as little endian if true
   * @param {Boolean} allowBigInt - Allow BigInt in i64 input
   * @param {Boolean} noCheck - Disable circular reference detect for faster operation
   * @returns {ArrayBuffer}
   */
  static Writer(obj, littleEndian, allowBigInt, noCheck) {
    return WriterProto(obj, littleEndian, allowBigInt, noCheck)
  }

  /**
   * Creates a reader.
   * @param {ArrayBuffer} buf - Input buffer
   * @param {Boolean} isLE - Read as little endian if true
   * @param {Boolean} asBigInt - Convert i64 to BigInt
   */
  constructor(buf, isLE, asBigInt) {
    this.buf = buf;
    this.offset = 0;
    this.isLE = !!isLE;
    this.asBigInt = !!asBigInt;
  }

  /**
   * Get input buffer.
   * @returns {ArrayBuffer}
   */
  getBuffer() {
    return this.buf
  }

  /**
   * Get offset.
   * @returns {Number}
   */
  getOffset() {
    return this.offset
  }

  /**
   * Get number endian.
   * 
   * True if little endian.
   * @returns {Boolean}
   */
  getEndian() {
    return this.isLE
  }

  /**
   * Detect whether reached the end.
   * @returns {Boolean}
   */
  canRead() {
    return this.offset < this.buf.byteLength
  }

  /**
   * Read a single NBT root tag.
   * 
   * Returns null when read to the end.
   * @returns {*|null}
   */
  read() {
    if (!this.canRead())
      return null;
    var t = ReaderProto(this.buf.slice(this.offset), this.isLE, !1);
    this.offset += t.length;
    return t.value
  }

  [Symbol.iterator]() {
    var t = new NBT(this.buf, this.isLE, this.asBigInt);
    return {
      next: function () {
        var s = !t.canRead();
        return {
          done: s,
          value: t.read()
        }
      }
    }
  }
}

module.exports = NBT;
