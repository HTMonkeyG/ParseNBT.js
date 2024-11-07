if (typeof ArrayBuffer == "undefined")
  throw new Error("Missing ArrayBuffer");
if (typeof DataView == "undefined")
  throw new Error("Missing DataView");
if (typeof Uint8Array == "undefined")
  throw new Error("Missing Uint8Array");
if (typeof WeakSet == "undefined")
  throw new Error("Missing WeakSet");
if (typeof TextEncoder == "undefined")
  throw new Error("Missing TextEncoder");
if (typeof TextDecoder == "undefined")
  throw new Error("Missing TextDecoder");

const NBTObjectProto = {}
  , TYPER = { 0: "null", 1: "i8", 2: "i16", 3: "i32", 4: "i64", 5: "f32", 6: "f64", 7: "a8", 8: "str", 9: "list", 10: "comp", 11: "a32", 12: "a64" }
  , TYPEW = { "null": 0, "i8": 1, "i16": 2, "i32": 3, "i64": 4, "f32": 5, "f64": 6, "a8": 7, "str": 8, "list": 9, "comp": 10, "a32": 11, "a64": 12 }
  , PROXIED_NBT = Symbol("NBT_PROXIED");

Object.freeze(NBTObjectProto);

function detectCircularReference(obj) {
  var cache = new WeakSet();
  function recurse(obj) {
    obj = obj[PROXIED_NBT] || obj;
    for (var k of Object.getOwnPropertyNames(obj)) {
      // Write values
      var f = splitTK(k)
        , g = TYPEW[f[0]];
      if (!g)
        continue;
      var value = obj[k];
      if (typeof value == 'object' && value !== null && !ArrayBuffer.isView(value)) {
        if (cache.has(value))
          throw new Error("Cannot serialize circular reference to NBT.");
        cache.add(value);
        if (Array.isArray(value))
          for (var im = value.length, i = 0, v = value[0]; i < im; i++, v = value[i])
            typeof v == "object" && v !== null && recurse(value);
        else
          recurse(value);
      }
    }
    return obj
  }

  cache.add(obj);
  return recurse(obj);
}

function getTypeOfArray(l) {
  var constructors = new Map();
  constructors.set(Int8Array, 1);
  constructors.set(Uint8Array, 1);
  constructors.set(Uint8ClampedArray, 1);
  constructors.set(Int16Array, 2);
  constructors.set(Uint16Array, 2);
  constructors.set(Int32Array, 3);
  constructors.set(Uint32Array, 3);
  constructors.set(BigInt64Array, 4);
  constructors.set(BigUint64Array, 4);
  constructors.set(Float32Array, 5);
  constructors.set(Float64Array, 6);

  for (var c of constructors)
    if (l instanceof c[0])
      return c[1];

  return false
}

function toTypedArray(t) {
  return {
    1: Int8Array,
    2: Int16Array,
    3: Int32Array,
    4: BigInt64Array,
    5: Float32Array,
    6: Float64Array
  }[t];
}

function typeCheck(v, t) {
  switch (t) {
    case "i8":
      return typeof v == "number" ? v < -256 ? -256 : v > 255 ? 255 : v : 0;
    case "i16":
      return typeof v == "number" ? v < -65536 ? -65536 : v > 65535 ? 65535 : v : 0;
    case "i32":
      return typeof v == "number" ? v < -2147483648 ? -2147483648 : v > 2147483647 ? 2147483647 : v : 0;
    case "i64":
      if (typeof v == "object") {
        typeof v.high != "number" && (v.high = 0);
        typeof v.low != "number" && (v.low = 0);
        return v
      } else if (typeof v == "bigint")
        return v < -0x8000000000000000n ? -0x8000000000000000n : v > 0x7FFFFFFFFFFFFFFFn ? 0x7FFFFFFFFFFFFFFFn : v
      else
        return {
          high: 0,
          low: typeof v == "number" ? v | 0 : 0
        };
    case "f32": case "f64":
      return typeof v == "number" ? v : 0
    case "str":
      return typeof v == "undefined" || v === null ? "" : v + "";
    case "comp":
      return typeof v == "object" ? v : NBT.create(true);
    case "list": case "a8": case "a32": case "a64":
      return typeof v == "object" ? v : [];
  }
}

function splitTK(s) {
  var i = s.indexOf(">");
  if (i == -1)
    return [null, s];
  return [
    s.slice(0, i),
    s.slice(i + 1)
  ]
}

function ReaderProto(buf, option, isSerial) {
  function g(b, c) {
    return a["get" + b](offset, (offset += c, isBedrock))
  }

  option = typeof option == "object" ? option : {};

  var offset = 0
    , a = new DataView(buf)
    , r = new Uint8Array(buf)
    , isBedrock = false
    , func = {};

  if (option.littleEndian) {
    // Detect MCBE NBT header
    buf.length > 8 && a.getUint32(4, true) == r.byteLength - 8 && (offset = 8);
    isBedrock = true;
  }

  // Unsigned 16 bit integer
  // Only used in length of array-like
  func["Uint16"] = g.bind(func, "Uint16", 2);
  // 8 bit signed integer
  func[1] = g.bind(func, "Int8", 1);
  // 16 bit signed integer
  func[2] = g.bind(func, "Int16", 2);
  // 32 bit signed integer
  func[3] = g.bind(func, "Int32", 4);
  // 64 bit signed integer
  func[4] = option.asBigInt ? g.bind(func, "BigInt64", 8) : function () {
    var a = this[3]()
      , b = this[3]();
    return isBedrock ? { high: b, low: a, } : { high: a, low: b }
  }.bind(func);
  // Single precision float
  func[5] = g.bind(func, "Float32", 4);
  // Double precision float
  func[6] = g.bind(func, "Float64", 8);

  // Array of 8 bit signed integer
  func[7] = function () {
    var a = this[3]()
      , b = [];

    if (option.asTypedArray) {
      b = new (toTypedArray(1))(a);
      b.set(r.slice(offset, offset += a))
    } else
      for (; a > 0; a--)
        b.push(this[1]());
    return b
  }.bind(func);

  // String
  func[8] = function () {
    var l = this["Uint16"](), b;
    b = new TextDecoder().decode(r.slice(offset, offset += l));
    return b
  }.bind(func);

  // List tag
  func[9] = function () {
    var b = []
      // Type of elements in the list
      , c = this[1]()
      // Length of the list
      , d = this[3]()
      , i;

    if (option.asTypedArray && toTypedArray(c)) {
      for (b = new (toTypedArray(c))(d), i = 0; i < d; i++)
        b[i] = this[c]();
      return b
    } else if (!option.withoutNBTList)
      b.push(TYPER[c]);
    else
      b.type = TYPER[c];

    if (this[c])
      for (; d > 0; d--)
        b.push(this[c]());
    else if (c == 0)
      // Null type list, always empty
      ;
    else
      throw new Error(`Invalid tag ID at Byte${offset - 1} : ${r[offset - 1]}`);
    return b;
  }.bind(func);

  // Compound tag
  func[10] = function () {
    var b = NBT.create(option.asProxy)
      , c, d
      , e = b[PROXIED_NBT] || b;

    while ((c = r[offset]) > 0x00)
      if (this[c]) {
        offset++;
        d = this[8]();
        e[TYPER[c] + ">" + d] = this[c]();
      } else
        throw new Error('Invalid tag ID at Byte' + offset + ' : ' + r[offset]);
    return offset++, b;
  }.bind(func);

  // Array of 32 bit signed integer
  func[11] = function () {
    var a = this[3]()
      , b = [];

    if (option.asTypedArray)
      for (b = (new toTypedArray(3))(a), i = 0; i < a; i++)
        b[i] = this[3]();
    else
      for (; a > 0; a--)
        b.push(this[3]());
    return b
  }.bind(func);

  // Array of 64 bit signed integer
  func[12] = function () {
    var a = this[3]()
      , b = []
      , i;

    if (option.asTypedArray && option.asBigInt)
      for (b = new toTypedArray(4)(a), i = 0; i < a; i++)
        b[i] = this[4]();
    else
      for (; a > 0; a--)
        b.push(this[4]());
    return b
  }.bind(func);

  func["root"] = function () {
    var b = NBT.create(option.asProxy)
      , c = r[offset]
      , d
      , e = b[PROXIED_NBT] || b;

    if (this[c]) {
      offset++;
      d = this[8]();
      e[TYPER[c] + ">" + d] = this[c]();
    } else
      throw new Error('Invalid tag ID at Byte' + offset + ' : ' + r[offset]);
    return b
  }.bind(func);

  var result = [];
  if (isSerial)
    while (1) {
      if (func[r[offset]])
        result.push(func["root"]());
      else if (offset < buf.byteLength)
        offset++;
      else
        return result
    }
  else
    return {
      value: func["root"](),
      length: offset
    }
}

function WriterProto(obj, option) {
  // Write a single value
  function g(a, b, c) {
    if (offset + b > abuf.byteLength) {
      var l = abuf.byteLength;
      while (l < offset + b)
        l *= 2;
      var t1 = new ArrayBuffer(l)
        , t2 = new DataView(t1)
        , t3 = new Uint8Array(t1);
      t3.set(port);
      abuf = t1, dtv = t2, port = t3;
    }
    dtv["set" + a](offset, (offset += b, c), isBedrock);
  }

  // Write a typed array
  function h(a) {
    var t = getTypeOfArray(a);
    if (!t)
      return;

    if (offset + a.byteLength > abuf.byteLength) {
      var l = abuf.byteLength;
      while (l < offset + a.byteLength)
        l *= 2;
      var t1 = new ArrayBuffer(l)
        , t2 = new DataView(t1)
        , t3 = new Uint8Array(t1);
      t3.set(port);
      abuf = t1, dtv = t2, port = t3;
    }

    if (t == 1)
      port.set(a, offset), offset += a.byteLength;
    else
      for (var i = 0, im = a.length; i < im; i++)
        func[t](a[i]);
  }

  option = typeof option == "object" ? option : {};

  var c = option.noCheck ? obj : detectCircularReference(obj)
    , isBedrock = !!option.littleEndian
    , func = {}
    , abuf = new ArrayBuffer(128)
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
    else if (typeof o != "object")
      func[3](0), func[3](0)
    else
      isBedrock ? (func[3](0 | o.low || 0), func[3](0 | o.high || 0)) : (func[3](0 | o.high || 0), func[3](0 | o.low || 0));
  }.bind(func);
  func[5] = g.bind(func, "Float32", 4);
  func[6] = g.bind(func, "Float64", 8);

  // Array of 8 bit signed integer
  func[7] = function (o) {
    this[3](o.length);
    if (getTypeOfArray(o) == 1)
      h(o);
    else
      for (var im = o.length, i = 0; i < im; i++)
        this[1](o[i])
  }.bind(func);

  // String tag
  func[8] = function (s) {
    var a = new TextEncoder().encode(s);
    this["Uint16"](a.length);
    h(a);
  }.bind(func);

  // List tag
  // Allows any object with type, length and integer keys
  func[9] = function (l) {
    var t, m = l, n;

    if (l.type && typeof TYPEW[l.type] != 'undefined')
      // Specified type
      t = TYPEW[l.type], n = l.type;
    else if (ArrayBuffer.isView(l) && option.allowTypedArray)
      // Typed array
      t = getTypeOfArray(l), n = "Invalid TypedArray";
    else {
      // Legacy NBT list with type on the first element
      t = TYPEW[l[0]];
      m = l.slice(1);
      n = l[0];
    }

    // Write as empty list when m.length is falsy or null type
    if (t === 0 || !m.length) {
      this[1](0);
      this[3](0);
    } else if (t) {
      // Write type of the list
      this[1](t);
      // Write length
      this[3](m.length);
      for (var i = 0, im = m.length; i < im; i++)
        this[t](m[i])
    } else
      throw new Error("Invalid type: " + n);
  }.bind(func);

  // Compound tag
  func[10] = function (o, root) {
    o = o[PROXIED_NBT] || o;

    // Optimize performance
    // Reduce traversal times 
    for (var k of Object.getOwnPropertyNames(o)) {
      // Write values
      var f = splitTK(k)
        , g = TYPEW[f[0]];
      // Ignore non-NBT keys
      if (!g)
        continue;

      this[1](g);
      this[8](f[1]);
      this[g](o[k]);
    }
    root || this[1](0)
  }.bind(func);

  // Array of 32 bit signed integer
  func[11] = function (o) {
    // Write length
    this[3](o.length);
    for (var im = o.length, i = 0; i < im; i++)
      // Write elements
      this[3](o[i])
  }.bind(func);

  // Array of 64 bit signed integer
  func[12] = function (o) {
    this[3](o.length);
    for (var im = o.length, i = 0; i < im; i++)
      this[4](o[i])
  }.bind(func);

  func["root"] = function (o) {
    o = o[PROXIED_NBT] || o;

    var keys = NBT.keys(o);
    if (keys.length != 1 || keys[0] != "comp>")
      o = { "comp>": o };

    this[10](o, true)
  }.bind(func);

  func["root"](c);
  return abuf.slice(0, offset)
}

class NBT {
  /**
   * A symbol to get the original object of a proxied NBT object.
   * 
   * Only for debug use.
   */
  static get PROXIED_NBT() {
    return PROXIED_NBT
  }

  /**
   * Create a new empty NBT object.
   * @param {Boolean} isProxy - Create a new empty NBT object with proxy if true.
   * @returns {Object}
   */
  static create(isProxy) {
    var result = {
      __proto__: NBTObjectProto
    };

    if (!isProxy)
      return result;

    return new Proxy(result, {
      get: function (target, property) {
        if (property === PROXIED_NBT)
          return result;
        if (typeof property == "symbol")
          return void 0;

        var tk = splitTK(property);
        if (tk && TYPEW[tk[0]])
          // Key with type
          return target[property];

        // Key without type
        for (var k of NBT.keys(target))
          if (splitTK(k)[1] == property)
            return target[k];
        return void 0
      },
      set: function (target, property, value) {
        if (typeof property == "symbol")
          return void 0;
        var tk = splitTK(property);
        if (tk && TYPEW[tk[0]]) {
          // Key with type
          // Directly return existing propertys
          if (typeof target[property] != "undefined") {
            target[property] = typeCheck(value, tk[0]);
            return true
          }
          // Type override
          for (var k of NBT.keys(target))
            if (splitTK(k)[1] == tk[1])
              delete target[k];
          target[property] = typeCheck(value, tk[0]);
          return true
        }
        // Key without type
        for (var k of NBT.keys(target)) {
          var tk = splitTK(k);
          if (tk[1] == property) {
            target[k] = typeCheck(value, tk[0]);
            return true
          }
        }
        return false
      },
      deleteProperty: function (target, property) {
        if (typeof property == "symbol")
          return true;
        var tk = splitTK(property);
        if (tk && TYPEW[tk[0]]) {
          // Key with type
          // Directly return existing propertys
          if (typeof target[property] != "undefined")
            return delete target[property];
          // Type override
          for (var k of NBT.keys(target))
            if (splitTK(k)[1] == tk[1])
              return delete target[k];
        }
        // Key without type
        for (var k of NBT.keys(target))
          if (splitTK(k)[1] == property)
            return delete target[k];
      },
      setPrototypeOf: function () {
        return false
      },
      defineProperty: function () {
        return false
      },
      preventExtensions: function () {
        return false
      },
      getOwnPropertyDescriptor: function () {
        return void 0
      },
      ownKeys: function (target) {
        return NBT.keys(target)
      },
      has(target, property) {
        return NBT.keys(target).indexOf(property) !== -1
      }
    })
  }

  /**
   * Returns a boolean value that indicates whether a value is a object created by NBT.create().
   * @returns {Boolean}
   */
  static isNBT(obj) {
    function $() { }
    $.prototype = NBTObjectProto;
    return obj instanceof $;
  }

  /**
   * Returns the names with valid type-value pair of an NBT object.
   * @param {Object} obj 
   * @returns {String[]}
   */
  static keys(obj) {
    var result = [];
    if (obj[PROXIED_NBT])
      obj = obj[PROXIED_NBT];
    for (var k of Object.getOwnPropertyNames(obj)) {
      var l = k.split(">");
      if (Object.keys(TYPEW).indexOf(l[0]) != -1)
        result.push(k)
    }
    return result
  }

  /**
   * Recursively detect whether objects are compvarely equal.
   * @param {Object} a
   * @param {Object} b 
   * @returns {Boolean}
   */
  static equal(a, b) {
    var visited = new WeakSet();

    function recursive(a, b) {
      if (a[PROXIED_NBT])
        a = a[PROXIED_NBT];
      if (b[PROXIED_NBT])
        b = b[PROXIED_NBT];

      if (visited.has(a) && visited.has(b) && a === b)
        return true;
      if (a === null && b === null)
        return true;
      if (a === void 0 && b === void 0)
        return true;
      if (a === null || b === null || a === void 0 || b === void 0)
        return false;
      if (typeof a !== typeof b)
        return false;
      if (typeof a !== 'object')
        return a === b;

      visited.add(a);
      visited.add(b);

      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length)
          return false;
        for (var i = 0; i < a.length; i++)
          if (!recursive(a[i], b[i]))
            return false;
        return true;
      }

      if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
        if (getTypeOfArray(a) !== getTypeOfArray(b))
          return false;
        if (a.length !== b.length)
          return false;
        for (var i = 0; i < a.length; i++)
          if (!recursive(a[i], b[i]))
            return false;
        return true;
      }

      var keys1 = NBT.keys(a)
        , keys2 = NBT.keys(b);

      if (keys1.length !== keys2.length)
        return false;

      for (var key of keys1)
        if (!keys2.includes(key) || !recursive(a[key], b[key], visited))
          return false;

      return true;
    }

    return recursive(a, b);
  }

  /**
   * Read NBT data in buffer.
   * @param {ArrayBuffer} buf - Input buffer
   * @param {Object} option - Options
   * @param {Boolean} option.littleEndian - Read as little endian if true
   * @param {Boolean} option.asBigInt - Read i64 as BigInt if true
   * @param {Boolean} option.asTypedArray - Read array and list as TypedArray if true
   * @param {Boolean} option.withoutNBTList - Read list of objects as Array with extra type property if true
   * @param {Boolean} option.asProxy - Create proxied NBT object.
   * @returns {Object}
   */
  static Reader(buf, option) {
    return ReaderProto(buf, option, !1).value
  }

  /**
   * Read concatenated root label sequence.
   * @param {ArrayBuffer} buf - Input buffer
   * @param {Object} option - Options
   * @param {Boolean} option.littleEndian - Read as little endian if true
   * @param {Boolean} option.asBigInt - Read i64 as BigInt if true
   * @param {Boolean} option.asTypedArray - Read array and list as TypedArray if true
   * @param {Boolean} option.withoutNBTList - Read list of objects as Array with extra type property if true
   * @param {Boolean} option.asProxy - Create proxied NBT object
   * @returns {Array} Array of NBT root tags
   */
  static ReadSerial(buf, option) {
    return ReaderProto(buf, option, !0)
  }

  /**
   * Serialize NBT object.
   * @param {Object} obj - Input object
   * @param {Object} option - Options
   * @param {Boolean} option.littleEndian - Write as little endian if true
   * @param {Boolean} option.noCheck - Disable circular reference detect for faster operation
   * @param {Boolean} option.allowTypedArray - Allow TypedArray in array type input
   * @returns {ArrayBuffer}
   */
  static Writer(obj, option) {
    return WriterProto(obj, option)
  }

  /**
   * Creates a reader.
   * @param {ArrayBuffer} buf - Input buffer
   * @param {Object} option - Options
   * @param {Boolean} option.littleEndian - Read as little endian if true
   * @param {Boolean} option.asBigInt - Read i64 as BigInt if true
   * @param {Boolean} option.asTypedArray - Read array and list as TypedArray if true
   * @param {Boolean} option.withoutNBTList - Read list of objects as Array with extra type property if true
   * @param {Boolean} option.asProxy - Create proxied NBT object.
   * @returns {Object}
   */
  constructor(buf, option) {
    this.buf = buf;
    this.offset = 0;
    this.option = option;
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
   * @returns {Object|null}
   */
  read() {
    if (!this.canRead())
      return null;
    var t = ReaderProto(this.buf.slice(this.offset), this.option, !1);
    this.offset += t.length;
    return t.value
  }

  [Symbol.iterator]() {
    var t = new NBT(this.buf, this.option);
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