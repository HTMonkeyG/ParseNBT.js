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
  , PROXIED_NBT = Symbol("PROXIED_NBT");

// Initialize type names.
!function (t) {
  t[t.nul = 0] = "nul";
  t[t.i08 = 1] = "i08";
  t[t.i16 = 2] = "i16";
  t[t.i32 = 3] = "i32";
  t[t.i64 = 4] = "i64";
  t[t.f32 = 5] = "f32";
  t[t.f64 = 6] = "f64";
  t[t.a08 = 7] = "a08";
  t[t.str = 8] = "str";
  t[t.lst = 9] = "lst";
  t[t.obj = 10] = "obj";
  t[t.a32 = 11] = "a32";
  t[t.a64 = 12] = "a64";

  // Deprecated. Reserved for backward-compatibility.
  t.i8 = 1;
  t.a8 = 7;
  t.list = 9;
  t.comp = 10;
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
      return typeof v == "number" ? (v & 0xFF) << 24 >> 24 : 0;
    case "i16":
      return typeof v == "number" ? (v & 0xFFFF) << 16 >> 16 : 0;
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
    result = (options.typedArray && toTypedArray(subType))
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
      ? new Int32Array(l)
      : new Array(l);

    for (var i = 0; i < length; i++)
      result[i] = this[4]();

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

function baseWriter() {

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
      return result;
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
      key => typeof TYPE_DEF[expandTypedKey(key)[0]] === "number"
    );
  }

  static assign(target, ...source) {
    var t = target[PROXIED_NBT] || target
      , validKeys = {};

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
          if (validKeys[tk[1]])
            delete t[validKeys[tk[1]]];

          t[k] = s[k];
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
    return NBT.deserialize(buf, option, serial);
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

  constructor(obj) {
    return NBT.assign(NBT.create(true), obj);
  }
}

module.exports = NBT;
