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

const NBTObjectProto = Object.freeze({ __proto__: null })
  , TYPE_DEF = {}
  , TYPE_ARR = {}
  , PROXIED_NBT = Symbol("PROXIED_NBT")
  , KEY_TYPES = Symbol("KEY_TYPES");

// Initialize type names.
!function (t) {
  t[t.nul = 0] = "nul";
  t[t.i8 = 1] = "i8";
  t[t.i16 = 2] = "i16";
  t[t.i32 = 3] = "i32";
  t[t.i64 = 4] = "i64";
  t[t.f32 = 5] = "f32";
  t[t.f64 = 6] = "f64";
  t[t.a8 = 7] = "a8";
  t[t.str = 8] = "str";
  t[t.list = 9] = "list";
  t[t.comp = 10] = "comp";
  t[t.a32 = 11] = "a32";
  t[t.a64 = 12] = "a64";

  // New alias names.
  t.i08 = 1;
  t.a08 = 7;
  t.lst = 9;
  t.obj = 10;
}(TYPE_DEF);

// Initialize typed arrays.
!function (t) {
  t[1] = [Int8Array, Uint8Array, Uint8ClampedArray];
  t[2] = [Int16Array, Uint16Array];
  t[3] = [Int32Array, Uint32Array];
  t[4] = [BigInt64Array, BigUint64Array];
  t[5] = [Float32Array];
  t[6] = [Float64Array];
}(TYPE_ARR);

// Get NBT type index of TypedArray arr.
function fromTypedArray(arr) {
  for (var i = 1; i < 7; i++)
    for (var c of TYPE_ARR[i])
      if (arr instanceof c)
        return i;

  return void 0;
}

// Get TypedArray constructor from NBT type index.
function toTypedArray(t) {
  return TYPE_ARR[t]?.[0];
}

function expandTypedKey(s) {
  var i = s.indexOf(">")
    , t;

  if (i === -1)
    return void 0;

  t = s.slice(0, i);

  return typeof TYPE_DEF[t] === "number"
    ? [t, s.slice(i + 1)]
    : void 0;
}

function validateType(v, t) {
  switch (t) {
    case "i8":
    case "i08":
      return typeof v == "number" ? v < -128 ? -128 : v > 127 ? 127 : v : 0;
    case "i16":
      return typeof v == "number" ? v < -32768 ? -32768 : v > 32767 ? 32767 : v : 0;
    case "i32":
      return typeof v == "number" ? v >> 0 : 0;
    case "i64":
      if (typeof v == "object") {
        typeof v.high != "number" && (v.high = 0);
        typeof v.low != "number" && (v.low = 0);
        return v;
      } else if (typeof v == "bigint")
        return BigInt.asIntN(64, v);
      else
        return BigInt.asIntN(64, typeof v == "number" ? BigInt(v) : 0n);
    case "f32":
      return typeof v == "number" ? Math.fround(v) : 0;
    case "f64":
      return typeof v == "number" ? v : 0;
    case "str":
      return typeof v == "undefined" || v === null ? "" : v + "";
    case "comp":
    case "obj":
      return typeof v == "object" ? v : NBT.create(true);
    case "lst":
    case "list":
    case "a8":
    case "a08":
    case "a32":
    case "a64":
      return typeof v == "object" ? v : [];
    default:
      throw new Error("invalid type " + t);
  }
}

function nbtPrimitiveRead() {

}

const NBTReaderProto = {
  type: 0,
  subtype: 0,
  offset: 0,
  isBedrock: false,
  dataView: null,
  buffer: null,

  primitive: function (type, size) {
    return this.dataView["get" + type](
      this.offset,
      (this.offset += size, this.isBedrock)
    );
  },
  Uint16: null,
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
  7: function () {
    var length = this[3]()
      , result, i;

    if (this.option.asTypedArray) {
      result = new (toTypedArray(1))(length);
      result.set(this.buffer.slice(offset, offset += length))
    } else {
      result = new Array(length);
      for (i = 0; i < length; i++)
        result[i] = this[1]();
    }

    return result
  }
};

function baseReader(buf, options, isSerial) {
  function primitive(b, c) {
    return dtv["get" + b](offset, (offset += c, isBedrock));
  }

  function error(offset, byte) {
    throw new Error(`invalid tag type at offs+0x${offset.toString(16)}: ${byte.toString(16)}`);
  }

  options = typeof options === "object" ? options : {};

  var offset = 0
    , dtv = new DataView(buf)
    , u8a = new Uint8Array(buf)
    , isBedrock = false
    , func = {};

  if (options.littleEndian) {
    // Detect MCBE NBT header.
    buf.length > 8 && dtv.getUint32(4, true) == u8a.byteLength - 8 && (offset = 8);
    isBedrock = true;
  }

  // Unsigned 16 bit integer.
  // Only used in length of array-like types.
  func["Uint16"] = primitive.bind(func, "Uint16", 2);
  // 8 bit signed integer.
  func[1] = primitive.bind(func, "Int8", 1);
  // 16 bit signed integer.
  func[2] = primitive.bind(func, "Int16", 2);
  // 32 bit signed integer.
  func[3] = primitive.bind(func, "Int32", 4);
  // 64 bit signed integer.
  func[4] = options.asBigInt ? primitive.bind(func, "BigInt64", 8) : function () {
    var a = this[3]()
      , b = this[3]();
    return isBedrock ? { high: b, low: a } : { high: a, low: b }
  }.bind(func);
  // Single precision float.
  func[5] = primitive.bind(func, "Float32", 4);
  // Double precision float.
  func[6] = primitive.bind(func, "Float64", 8);

  // Array of 8 bit signed integer.
  func[7] = function () {
    var length = this[3]()
      , result, i;

    if (options.asTypedArray) {
      result = new (toTypedArray(1))(length);
      result.set(u8a.slice(offset, offset += length));
    } else {
      result = new Array(length);
      for (i = 0; i < length; i++)
        result[i] = this[1]();
    }

    return result;
  }.bind(func);

  // String.
  func[8] = function () {
    var l = this["Uint16"]();
    return new TextDecoder().decode(u8a.slice(offset, offset += l))
  }.bind(func);

  // List tag.
  func[9] = function () {
    var subType, length, result, i;

    // Type of elements in the list. Only used by the compound tag.
    subType = this[1]();
    // The length of the list, 32-bit signed integer.
    length = this[3]();
    // The result.
    result = (options.asTypedArray && toTypedArray(subType))
      ? new (toTypedArray(subType))(length)
      : new Array(length);

    if (this[subType]) {
      for (i = 0; i < length; i++)
        result[i] = this[subType]();
      Array.isArray(result) && result.unshift(TYPE_DEF[subType]);
    } else if (!subType)
      // Null type list, always with empty items.
      ;
    else
      error(offset - 1, u8a[offset - 1]);

    return result;
  }.bind(func);

  // Compound tag.
  func[10] = function () {
    var result = NBT.create(options.asProxy)
      , obj = result[PROXIED_NBT] || result
      , type, keyName, value;

    while ((type = u8a[offset]) > 0x00) {
      if (!this[type])
        error(offset, u8a[offset]);

      offset++;

      keyName = this[8]();
      value = this[type]();

      obj[TYPE_DEF[type] + ">" + keyName] = value;
    }

    offset++;

    return result;
  }.bind(func);

  // Array of 32 bit signed integer.
  func[11] = function () {
    var length = this[3]()
      , result;

    result = options.asTypedArray
      ? new Int32Array(length)
      : new Array(length);

    for (var i = 0; i < length; i++)
      result[i] = this[3]();

    return result;
  }.bind(func);

  // Array of 64 bit signed integer.
  func[12] = function () {
    var length = this[3]()
      , result;

    result = (options.asTypedArray && options.asBigInt)
      ? new BigInt64Array(length)
      : new Array(length);

    for (var i = 0; i < length; i++)
      result[i] = this[4]();

    return result;
  }.bind(func);

  func["root"] = function () {
    var r = NBT.create(options.asProxy)
      , c = u8a[offset]
      , o = r[PROXIED_NBT] || r
      , d;

    if (this[c]) {
      offset++;
      d = this[8]();
      o[TYPE_DEF[c] + ">" + d] = this[c]();
    } else
      error(offset, u8a[offset]);

    return r
  }.bind(func);

  var result = [];
  if (isSerial)
    while (1) {
      if (func[u8a[offset]])
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

const NBTWriterProto = {

};

function detectCircular(obj) {
  var stack = [obj]
    , cache = new Set();

  cache.add(obj);

  while (stack.length) {
    var o = stack.pop()
      , propKeys = Object.getOwnPropertyNames(o);

    for (var i = 0, im = propKeys.length; i < im; i++) {
      var key = propKeys[i]
        , tk = expandTypedKey(key);

      if (!tk || typeof TYPE_DEF[tk[0]] !== "number")
        continue;

      var v = o[key];
      if (typeof v === "object" && v !== null && !ArrayBuffer.isView(v)) {
        if (cache.has(v))
          throw new Error("Cannot serialize circular reference to NBT.");
        cache.add(v);

        if (Array.isArray(v)) {
          for (var j = 0, jm = v.length; j < jm; j++) {
            var elem = v[j];
            if (typeof elem === "object" && elem !== null)
              stack.push(elem);
          }
        } else {
          stack.push(v);
        }
      }
    }
  }

  return obj;
}

function baseWriter(obj, option) {
  // Write a primitive value.
  function g(a, b, c) {
    if (offset + b > abuf.byteLength) {
      var l = abuf.byteLength;
      while (l < offset + b) l *= 2;
      var t1 = new ArrayBuffer(l)
        , t2 = new DataView(t1)
        , t3 = new Uint8Array(t1);
      t3.set(port);
      abuf = t1, dtv = t2, port = t3;
    }
    dtv["set" + a](offset, (offset += b, c), isBedrock);
  }

  // Write a typed array (bulk copy for byte arrays).
  function h(a) {
    var t = fromTypedArray(a);
    if (!t) return;

    if (offset + a.byteLength > abuf.byteLength) {
      var l = abuf.byteLength;
      while (l < offset + a.byteLength) l *= 2;
      var t1 = new ArrayBuffer(l)
        , t2 = new DataView(t1)
        , t3 = new Uint8Array(t1);
      t3.set(port);
      abuf = t1, dtv = t2, port = t3;
    }

    if (t === 1)
      port.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), offset),
      offset += a.byteLength;
    else
      for (var i = 0, im = a.length; i < im; i++)
        func[t](a[i]);
  }

  option = typeof option === "object" ? option : {};

  var c = option.noCheck ? obj : detectCircular(obj)
    , isBedrock = !!option.littleEndian
    , func = {}
    , abuf = new ArrayBuffer(128)
    , dtv = new DataView(abuf)
    , port = new Uint8Array(abuf)
    , offset = 0;

  // Unsigned 16 bit integer (used for string/array lengths).
  func["Uint16"] = g.bind(func, "Uint16", 2);
  // 64 bit signed integer (used for bigint i64).
  func["BigInt64"] = g.bind(func, "BigInt64", 8);
  // 8 bit signed integer.
  func[1] = g.bind(func, "Int8", 1);
  // 16 bit signed integer.
  func[2] = g.bind(func, "Int16", 2);
  // 32 bit signed integer.
  func[3] = g.bind(func, "Int32", 4);
  // 64 bit signed integer.
  func[4] = function (v) {
    if (typeof v === "bigint")
      func["BigInt64"](v);
    else if (typeof v === "object")
      isBedrock
        ? (func[3](v.low | 0), func[3](v.high | 0))
        : (func[3](v.high | 0), func[3](v.low | 0));
    else
      func[3](0), func[3](0);
  }.bind(func);
  // Single precision float.
  func[5] = g.bind(func, "Float32", 4);
  // Double precision float.
  func[6] = g.bind(func, "Float64", 8);

  // Array of 8 bit signed integer (a08).
  func[7] = function (o) {
    func[3](o.length);
    if (fromTypedArray(o) === 1)
      h(o);
    else
      for (var i = 0, im = o.length; i < im; i++)
        func[1](o[i]);
  }.bind(func);

  // String (str).
  func[8] = function (s) {
    var a = new TextEncoder().encode(s + "");
    func["Uint16"](a.length);
    h(a);
  }.bind(func);

  // List (lst).
  func[9] = function (l) {
    var t, m = l, n;

    if (l.type && typeof TYPE_DEF[l.type] === "number")
      // Specified type via .type property.
      t = TYPE_DEF[l.type], n = l.type;
    else if (ArrayBuffer.isView(l))
      // TypedArray — infer type.
      t = fromTypedArray(l), typeof t !== "number" && (n = "Invalid TypedArray");
    else if (typeof l[0] === "string" && typeof TYPE_DEF[l[0]] === "number") {
      // Legacy list format: first element is the type string.
      t = TYPE_DEF[l[0]], m = Array.prototype.slice.call(l, 1), n = l[0];
    }

    // Empty list or null type (nul).
    if (t === 0 || !t && !(m && m.length)) {
      func[1](0);
      func[3](0);
    } else if (t) {
      func[1](t);
      func[3](m.length);
      for (var i = 0, im = m.length; i < im; i++)
        func[t](m[i]);
    } else
      throw new Error("Invalid type: " + (n || typeof l));
  }.bind(func);

  // Compound (obj).
  func[10] = function (o, root) {
    o = o[PROXIED_NBT] || o;

    for (var k of Object.getOwnPropertyNames(o)) {
      var tk = expandTypedKey(k)
        , g = TYPE_DEF[tk[0]];

      if (typeof g !== "number")
        continue;

      func[1](g);       // Type byte.
      func[8](tk[1]);   // Key name.
      func[g](o[k]);    // Value.
    }

    // TAG_End for non-root compounds.
    root || func[1](0);
  }.bind(func);

  // Array of 32 bit signed integer (a32).
  func[11] = function (o) {
    func[3](o.length);
    for (var i = 0, im = o.length; i < im; i++)
      func[3](o[i]);
  }.bind(func);

  // Array of 64 bit signed integer (a64).
  func[12] = function (o) {
    func[3](o.length);
    for (var i = 0, im = o.length; i < im; i++)
      func[4](o[i]);
  }.bind(func);

  // Root writer: wraps the object in a root compound tag.
  func["root"] = function (o) {
    o = o[PROXIED_NBT] || o;

    var keys = NBT.keys(o);
    if (keys.length !== 1 || keys[0] !== "comp>")
      o = { "comp>": o };

    func[10](o, true);
  }.bind(func);

  func["root"](c);
  return abuf.slice(0, offset);
}

class NBTPending {
  constructor() {
    this.data = null;
  }
}

// To reduce the cost of allocating functions, we use prototype to share
// functions.
// This optimization reduces the memory consumption for creating NBT objects
// to ~30% of the original amount.
const NBTProxyProto = {
  __proto__: null,
  get: function (target, property) {
    if (property === PROXIED_NBT)
      return target;
    if (typeof property === "symbol")
      return void 0;

    if (expandTypedKey(property))
      // Keys with a valid type.
      return target[property];

    // Keys without a type.
    var t = this.keyTypes[property];
    if (!t)
      // No existing key matches.
      return void 0;

    return target[t + ">" + property];
  },
  set: function (target, property, value) {
    if (typeof property === "symbol")
      return false;

    var tk = expandTypedKey(property)
      , t;

    if (tk) {
      // Key with a valid type. Directly set existing properties.
      if (typeof target[property] !== "undefined") {
        target[property] = validateType(value, tk[0]);
        return true;
      }

      // Type override if the type mismatches exsisting key.
      if (t = this.keyTypes[tk[1]])
        delete target[t + ">" + tk[1]];

      // Record the new type of the key.
      this.keyTypes[tk[1]] = tk[0];
      target[property] = validateType(value, tk[0]);

      return true;
    }

    // Keys without a type.
    if (!(t = this.keyTypes[property]))
      // No existing key matches.
      return false;

    // Set the new value.
    target[t + ">" + property] = validateType(value, t);

    return true;
  },
  deleteProperty: function (target, property) {
    if (typeof property === "symbol")
      return true;

    if (expandTypedKey(property))
      // Keys with a valid type. Directly delete existing properties.
      return delete target[property];

    // Keys without a type.
    var t = this.keyTypes[property];
    if (t)
      return delete target[t + ">" + property];

    return true;
  },
  setPrototypeOf: function () {
    return false;
  },
  defineProperty: function () {
    return false;
  },
  preventExtensions: function () {
    return false;
  },
  getOwnPropertyDescriptor: function () {
    return void 0;
  },
  ownKeys: function (target) {
    return NBT.keys(target);
  },
  has(target, property) {
    if (expandTypedKey(property))
      return property in target;
    return property in this.keyTypes;
  }
};

class NBT {
  static create(isProxy) {
    var result = { __proto__: NBTObjectProto }
      , keyTypes;

    if (!isProxy)
      return result;

    keyTypes = { __proto__: null };
    result[KEY_TYPES] = keyTypes;

    return new Proxy(result, {
      __proto__: NBTProxyProto,
      keyTypes: keyTypes
    });
  }

  static isNBT(obj) {
    function $() { }
    $.prototype = NBTObjectProto;
    return obj instanceof $;
  }

  static keys(obj) {
    if (obj[PROXIED_NBT])
      obj = obj[PROXIED_NBT];

    return Object.getOwnPropertyNames(obj).filter(
      key => {
        var tk = expandTypedKey(key);
        return tk && typeof TYPE_DEF[tk[0]] === "number";
      }
    );
  }

  static assign(target, ...source) {
    var t = target[PROXIED_NBT] || target
      , validKeys = {}
      , kt = t[KEY_TYPES];

    if (!source.length || typeof target !== "object" || target === null)
      return target;

    // Storage all valid NBT keys of target object.
    for (var k of Object.getOwnPropertyNames(t)) {
      var tk = expandTypedKey(k);
      if (typeof TYPE_DEF[tk[0]] === "number")
        validKeys[tk[1]] = k;
    }

    // Do assign.
    for (var s of source) {
      if (typeof s !== "object" || s === null)
        continue;

      s = s[PROXIED_NBT] || s;
      for (var k of Object.getOwnPropertyNames(s)) {
        var tk = expandTypedKey(k);

        if (typeof TYPE_DEF[tk[0]] === "number") {
          // Type override.
          if (validKeys[tk[1]]) {
            delete t[validKeys[tk[1]]];
            if (kt) delete kt[tk[1]];
          }

          t[k] = s[k];
          if (kt) kt[tk[1]] = tk[0];
        }
      }
    }

    return target
  }

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
      if (typeof a !== "object")
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
        if (fromTypedArray(a) !== fromTypedArray(b))
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

  static clone(obj) {

  }

  static Reader(buf, option, serial) {
    var r = NBT.deserialize(buf, option, serial);
    return serial ? r : r.value;
  }

  static Writer(obj, option) {
    return NBT.serialize(obj, option);
  }

  static deserialize(buf, option, serial) {
    return baseReader(buf, option, serial);
  }

  static serialize(obj, option) {
    return baseWriter(obj, option);
  }

  static stringify(obj) {
    throw new Error("unsupported method");
  }

  static parse(str) {
    throw new Error("unsupported method");
  }

  /**
   * Creates a stream reader from a buffer, or an NBT object from a plain object.
   * @param {ArrayBuffer|Object} buf - Input buffer for stream reading, or a plain object to convert to NBT.
   * @param {Object} [option] - Read options (only used when buf is a buffer).
   */
  constructor(buf, option) {
    // Stream reader mode: first argument is a buffer.
    if (buf instanceof ArrayBuffer || ArrayBuffer.isView(buf)) {
      this.buf = buf;
      this.offset = 0;
      this.option = option || {};
      return;
    }
    // NBT object creation mode: first argument is a plain object.
    return NBT.assign(NBT.create(true), buf);
  }

  /**
   * Get input buffer.
   * @returns {ArrayBuffer}
   */
  getBuffer() {
    return this.buf;
  }

  /**
   * Get current offset.
   * @returns {Number}
   */
  getOffset() {
    return this.offset;
  }

  /**
   * Check whether more data can be read.
   * @returns {Boolean}
   */
  canRead() {
    return this.offset < this.buf.byteLength;
  }

  /**
   * Read a single NBT root tag.
   * Returns null when the buffer is exhausted.
   * @returns {Object|null}
   */
  read() {
    if (!this.canRead())
      return null;
    var t = baseReader(this.buf.slice(this.offset), this.option);
    this.offset += t.length;
    return t.value;
  }

  [Symbol.iterator]() {
    var t = new NBT(this.buf, this.option);
    return {
      next: function () {
        var s = !t.canRead();
        return {
          done: s,
          value: t.read()
        };
      }
    };
  }
}

module.exports = NBT;
