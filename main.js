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
  , TYPER = { 0: "nul", 1: "i08", 2: "i16", 3: "i32", 4: "i64", 5: "f32", 6: "f64", 7: "a08", 8: "str", 9: "lst", 10: "obj", 11: "a32", 12: "a64" }
  , TYPEW = { "nul": 0, "i08": 1, "i16": 2, "i32": 3, "i64": 4, "f32": 5, "f64": 6, "a08": 7, "str": 8, "lst": 9, "obj": 10, "a32": 11, "a64": 12 }
  , PROXIED_NBT = Symbol("NBT_PROXIED")
  // Every valid type name, ordered by tag ID. Probing all of them is constant
  // time, and replaces the key scans used to resolve a name without its type
  , TYPE_NAMES = Object.keys(TYPEW).filter(function (k) { return TYPEW[k] })
  // Payload size of the fixed width types, used to validate lengths while reading
  , FIXED_SIZE = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 4, 6: 8 }
  // Reused instances: building these per call is measurably slower on NBT data
  // with many keys or strings
  , TEXT_ENCODER = new TextEncoder()
  , TEXT_DECODER = new TextDecoder()
  , ARRAY_TYPES = new Map()
  , TYPED_ARRAYS = {}
  , hasOwn = Object.prototype.hasOwnProperty;

// Register the typed array constructors this runtime provides. The typeof guards
// keep a runtime without e.g. BigUint64Array from throwing a ReferenceError here
typeof Int8Array != "undefined" && (ARRAY_TYPES.set(Int8Array, 1), TYPED_ARRAYS[1] = Int8Array);
typeof Uint8Array != "undefined" && ARRAY_TYPES.set(Uint8Array, 1);
typeof Uint8ClampedArray != "undefined" && ARRAY_TYPES.set(Uint8ClampedArray, 1);
typeof Int16Array != "undefined" && (ARRAY_TYPES.set(Int16Array, 2), TYPED_ARRAYS[2] = Int16Array);
typeof Uint16Array != "undefined" && ARRAY_TYPES.set(Uint16Array, 2);
typeof Int32Array != "undefined" && (ARRAY_TYPES.set(Int32Array, 3), TYPED_ARRAYS[3] = Int32Array);
typeof Uint32Array != "undefined" && ARRAY_TYPES.set(Uint32Array, 3);
typeof BigInt64Array != "undefined" && (ARRAY_TYPES.set(BigInt64Array, 4), TYPED_ARRAYS[4] = BigInt64Array);
typeof BigUint64Array != "undefined" && ARRAY_TYPES.set(BigUint64Array, 4);
typeof Float32Array != "undefined" && (ARRAY_TYPES.set(Float32Array, 5), TYPED_ARRAYS[5] = Float32Array);
typeof Float64Array != "undefined" && (ARRAY_TYPES.set(Float64Array, 6), TYPED_ARRAYS[6] = Float64Array);

Object.freeze(NBTObjectProto);

function detectCircularReference(obj) {
  // path holds the nodes on the current branch, done the ones already proven
  // acyclic. Keeping them apart lets a value be referenced twice without being
  // reported as a cycle, and still visits every node only once
  var path = new WeakSet()
    , done = new WeakSet();

  function fail() {
    throw new Error("Cannot serialize circular reference to NBT.")
  }

  function recurse(obj) {
    if (typeof obj != "object" || obj === null)
      throw new Error("Invalid compound: " + obj);
    obj = obj[PROXIED_NBT] || obj;
    if (done.has(obj))
      return obj;
    if (path.has(obj))
      fail();
    path.add(obj);

    for (var k of Object.getOwnPropertyNames(obj)) {
      // Write values
      var f = splitTK(k)
        , g = TYPEW[f[0]];
      if (!g)
        continue;
      var value = obj[k];
      if (typeof value == 'object' && value !== null && !ArrayBuffer.isView(value))
        Array.isArray(value) ? walk(value) : recurse(value);
    }

    return path.delete(obj), done.add(obj), obj
  }

  function walk(list) {
    if (done.has(list))
      return;
    if (path.has(list))
      fail();
    path.add(list);

    for (var im = list.length, i = 0, v; i < im; i++) {
      v = list[i];
      if (typeof v == "object" && v !== null && !ArrayBuffer.isView(v))
        Array.isArray(v) ? walk(v) : recurse(v);
    }

    path.delete(list), done.add(list);
  }

  return recurse(obj);
}

function getTypeOfArray(l) {
  if (!ArrayBuffer.isView(l))
    return false;

  var t = ARRAY_TYPES.get(l.constructor);
  if (typeof t != "undefined")
    return t;

  // Subclasses of the typed arrays
  for (var c of ARRAY_TYPES)
    if (l instanceof c[0])
      return c[1];

  return false
}

function toTypedArray(t) {
  return TYPED_ARRAYS[t];
}

// Accept an ArrayBuffer or any view of one, so a Node Buffer or a TypedArray
// does not have to be unwrapped by hand. Returns [buffer, byteOffset, byteLength]
function bufferOf(b) {
  if (ArrayBuffer.isView(b))
    return [b.buffer, b.byteOffset, b.byteLength];
  if (b && typeof b.byteLength == "number")
    return [b, 0, b.byteLength];
  throw new TypeError("Input must be an ArrayBuffer or a view of one.")
}

function typeCheck(v, t) {
  switch (t) {
    case "i08":
      return typeof v == "number" ? v < -128 ? -128 : v > 127 ? 127 : v : 0;
    case "i16":
      return typeof v == "number" ? v < -32768 ? -32768 : v > 32767 ? 32767 : v : 0;
    case "i32":
      return typeof v == "number" ? v < -2147483648 ? -2147483648 : v > 2147483647 ? 2147483647 : v : 0;
    case "i64":
      if (typeof v == "bigint")
        return v < -0x8000000000000000n ? -0x8000000000000000n : v > 0x7FFFFFFFFFFFFFFFn ? 0x7FFFFFFFFFFFFFFFn : v;
      else if (typeof v == "object" && v !== null) {
        typeof v.high != "number" && (v.high = 0);
        typeof v.low != "number" && (v.low = 0);
        return v
      } else
        // Split the number into two 32 bit halves, keeping the sign
        return {
          high: typeof v == "number" ? Math.floor(v / 4294967296) | 0 : 0,
          low: typeof v == "number" ? v | 0 : 0
        };
    case "f32": case "f64":
      return typeof v == "number" ? v : 0
    case "str":
      return typeof v == "undefined" || v === null ? "" : v + "";
    case "obj":
      return typeof v == "object" && v !== null ? v : NBT.create(true);
    case "lst": case "a08": case "a32": case "a64":
      return typeof v == "object" && v !== null ? v : [];
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

// Java writes NBT strings as modified UTF-8, where U+0000 becomes 0xC0 0x80 and
// a character outside the BMP is written as its two surrogates, three bytes
// each. MCBE uses standard UTF-8, so this only applies to big endian data
function encodeMUTF8(s) {
  var i, im = s.length, c, n, r;

  // Both encodings agree on everything else, so let the native encoder do the
  // work unless the string really needs the difference
  for (i = 0; i < im; i++)
    if (!(c = s.charCodeAt(i)) || (c >= 0xD800 && c <= 0xDFFF))
      break;
  if (i == im)
    return TEXT_ENCODER.encode(s);

  // Measure first, so the result is allocated exactly once
  for (i = 0, n = 0; i < im; i++)
    c = s.charCodeAt(i), n += (c > 0 && c < 0x80) ? 1 : c < 0x800 ? 2 : 3;

  r = new Uint8Array(n);
  for (i = 0, n = 0; i < im; i++) {
    c = s.charCodeAt(i);
    if (c > 0 && c < 0x80)
      r[n++] = c;
    else if (c < 0x800)
      r[n++] = 0xC0 | (c >> 6), r[n++] = 0x80 | (c & 0x3F);
    else
      r[n++] = 0xE0 | (c >> 12), r[n++] = 0x80 | ((c >> 6) & 0x3F), r[n++] = 0x80 | (c & 0x3F);
  }

  return r
}

function decodeMUTF8(a) {
  var i, im = a.length, c, s;

  // 0xC0 and a lead byte of 0xED followed by a surrogate are the only sequences
  // the native decoder cannot read. Anything else, including the plain UTF-8
  // written by earlier versions of this library, decodes correctly and faster
  for (i = 0; i < im; i++)
    if ((c = a[i]) == 0xC0 || (c == 0xED && (a[i + 1] & 0xE0) == 0xA0))
      break;
  if (i == im)
    return TEXT_DECODER.decode(a);

  // Surrogates written one by one join back into a single character on their own,
  // because a JavaScript string is a sequence of UTF-16 code units
  for (i = 0, s = ""; i < im;) {
    c = a[i++];
    if (c < 0x80)
      s += String.fromCharCode(c);
    else if ((c & 0xE0) == 0xC0)
      s += String.fromCharCode(((c & 0x1F) << 6) | (a[i++] & 0x3F));
    else
      s += String.fromCharCode(((c & 0x0F) << 12) | ((a[i++] & 0x3F) << 6) | (a[i++] & 0x3F));
  }

  return s
}

// Find the key holding the given name, whatever its type. Probing the 12 valid
// prefixes costs a constant number of lookups, where scanning every key of the
// object made each type override O(n), and filling an object through the proxy
// O(n^2)
function findTypedKey(obj, name) {
  for (var i = 0, k; i < TYPE_NAMES.length; i++)
    if (hasOwn.call(obj, k = TYPE_NAMES[i] + ">" + name))
      return k;
  return null
}

// Remove every value stored under the given name, whatever its type
function deleteTypedKeys(obj, name) {
  for (var i = 0, k; i < TYPE_NAMES.length; i++)
    if (hasOwn.call(obj, k = TYPE_NAMES[i] + ">" + name))
      delete obj[k];
}

// Shared by every proxied object: creating the handler inside NBT.create()
// allocated ten closures for each compound of a file read with asProxy
const NBTHandler = {
  get: function (target, property) {
    if (property === PROXIED_NBT)
      return target;
    if (typeof property == "symbol")
      return target[property];

    var tk = splitTK(property);
    if (TYPEW[tk[0]])
      // Key with type
      return target[property];

    // Key without type
    var k = findTypedKey(target, property);
    // Fall back to the target, so inherited members stay reachable and the
    // object can still be converted to a primitive
    return k === null ? target[property] : target[k]
  },
  set: function (target, property, value) {
    if (property === PROXIED_NBT)
      return false;
    if (typeof property == "symbol")
      return target[property] = value, true;

    var tk = splitTK(property)
      , k;

    if (TYPEW[tk[0]]) {
      // Key with type
      // Directly overwrite an existing property
      if (hasOwn.call(target, property))
        return target[property] = typeCheck(value, tk[0]), true;
      // Type override
      deleteTypedKeys(target, tk[1]);
      return target[property] = typeCheck(value, tk[0]), true
    }

    // Key without type
    k = findTypedKey(target, property);
    if (k === null)
      return false;
    return target[k] = typeCheck(value, splitTK(k)[0]), true
  },
  deleteProperty: function (target, property) {
    if (property === PROXIED_NBT)
      return false;
    if (typeof property == "symbol")
      return delete target[property];

    var tk = splitTK(property)
      , t = TYPEW[tk[0]];

    // Key with type
    if (t && hasOwn.call(target, property))
      return delete target[property];

    // Type override, or a key without type. Deleting a name that is not there
    // is not a failure: returning false makes strict mode throw
    return deleteTypedKeys(target, t ? tk[1] : property), true
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
  getOwnPropertyDescriptor: function (target, property) {
    if (typeof property == "symbol")
      return void 0;
    // ownKeys reports these keys, so they need a matching descriptor. Without
    // one, Object.keys(), JSON.stringify() and object spread all see nothing
    return TYPEW[splitTK(property)[0]]
      ? Object.getOwnPropertyDescriptor(target, property)
      : void 0
  },
  ownKeys: function (target) {
    return NBT.keys(target)
  },
  has: function (target, property) {
    if (typeof property == "symbol")
      return property === PROXIED_NBT || property in target;
    var tk = splitTK(property);
    if (TYPEW[tk[0]])
      return hasOwn.call(target, property);
    return findTypedKey(target, property) !== null
  }
};

function ReaderProto(buf, option, isSerial, start) {
  function g(b, c) {
    return dtv["get" + b](offset, (offset += c, isBedrock))
  }

  // Reject a length that runs past the end of the buffer, instead of letting it
  // allocate a huge array or fail later with an opaque DataView RangeError
  function need(n) {
    if (n < 0 || offset + n > u8a.byteLength)
      throw new Error("Unexpected end of buffer at Byte" + offset + " : needs " + n + " more byte(s)");
  }

  option = typeof option == "object" && option !== null ? option : {};

  var b = bufferOf(buf)
    , offset = start > 0 ? start : 0
    , begin = offset
    , dtv = new DataView(b[0], b[1], b[2])
    , u8a = new Uint8Array(b[0], b[1], b[2])
    , isBedrock = false
    , func = {};

  if (option.littleEndian) {
    // Detect MCBE NBT header: a 4 byte version followed by the payload length,
    // then the root compound. Only meaningful at the very start of the buffer
    !begin && u8a.byteLength >= 8 && dtv.getUint32(4, true) == u8a.byteLength - 8
      && u8a[8] == 0x0A && (offset = 8);
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
    return isBedrock ? { high: b, low: a } : { high: a, low: b }
  }.bind(func);
  // Single precision float
  func[5] = g.bind(func, "Float32", 4);
  // Double precision float
  func[6] = g.bind(func, "Float64", 8);

  // Array of 8 bit signed integer
  func[7] = function () {
    var a = this[3]()
      , r, i;

    need(a);

    if (option.asTypedArray)
      // Reinterpret the copied bytes rather than converting element by element
      r = new Int8Array(u8a.slice(offset, offset += a).buffer);
    else {
      r = new Array(a);
      for (i = 0; i < a; i++)
        r[i] = this[1]();
    }

    return r
  }.bind(func);

  // String
  func[8] = function () {
    var l = this["Uint16"]();
    need(l);
    var a = u8a.subarray(offset, offset += l);
    return isBedrock ? TEXT_DECODER.decode(a) : decodeMUTF8(a)
  }.bind(func);

  // List tag
  func[9] = function () {
    var p = offset
      , r, c, l, i, e, A;

    // Type of elements in the list
    c = this[1]();
    // Length of the list
    l = this[3]();

    if (c == 0)
      // Null type list, always empty
      return new Array(l > 0 ? l : 0);

    if (!this[c])
      throw new Error(`Invalid tag ID at Byte${p} : ${u8a[p]}`);

    // Reject a length the remaining buffer cannot hold. Variable width elements
    // still take at least one byte each
    e = FIXED_SIZE[c];
    need(e ? l * e : l);

    A = option.asTypedArray ? toTypedArray(c) : void 0;
    r = A ? new A(l) : new Array(l);

    for (i = 0; i < l; i++)
      r[i] = this[c]();
    Array.isArray(r) && r.unshift(TYPER[c]);

    return r;
  }.bind(func);

  // Compound tag
  func[10] = function () {
    var r = NBT.create(option.asProxy)
      , o = r[PROXIED_NBT] || r
      , c, d;

    while (1) {
      // Running out of data is an error: it used to end the loop silently and
      // return a truncated compound
      if (offset >= u8a.byteLength)
        throw new Error("Unexpected end of buffer at Byte" + offset + " : missing TAG_End");
      if (!(c = u8a[offset]))
        break;
      if (!this[c])
        throw new Error('Invalid tag ID at Byte' + offset + ' : ' + c);
      offset++;
      d = this[8]();
      o[TYPER[c] + ">" + d] = this[c]();
    }
    return offset++, r;
  }.bind(func);

  // Array of 32 bit signed integer
  func[11] = function () {
    var l = this[3]()
      , r, i;

    need(l * 4);
    r = option.asTypedArray ? new Int32Array(l) : new Array(l);

    for (i = 0; i < l; i++)
      r[i] = this[3]();

    return r
  }.bind(func);

  // Array of 64 bit signed integer
  func[12] = function () {
    var l = this[3]()
      , r, i;

    need(l * 8);
    r = (option.asTypedArray && option.asBigInt) ? new BigInt64Array(l) : new Array(l);

    for (i = 0; i < l; i++)
      r[i] = this[4]();

    return r
  }.bind(func);

  func["root"] = function () {
    var r = NBT.create(option.asProxy)
      , c = u8a[offset]
      , o = r[PROXIED_NBT] || r
      , d;

    if (!this[c])
      throw new Error('Invalid tag ID at Byte' + offset + ' : ' + u8a[offset]);

    offset++;
    d = this[8]();
    o[TYPER[c] + ">" + d] = this[c]();
    return r
  }.bind(func);

  var result = [];
  if (isSerial)
    while (1) {
      if (func[u8a[offset]])
        result.push(func["root"]());
      else if (offset < u8a.byteLength)
        offset++;
      else
        return result
    }
  else
    return {
      value: func["root"](),
      length: offset - begin
    }
}

function WriterProto(obj, option) {
  // Make room for n bytes in total
  function grow(n) {
    var l = abuf.byteLength;
    while (l < n)
      l *= 2;
    var t1 = new ArrayBuffer(l)
      , t3 = new Uint8Array(t1);
    t3.set(port);
    abuf = t1, dtv = new DataView(t1), port = t3;
  }

  // Write a single value
  function g(a, b, c) {
    offset + b > abuf.byteLength && grow(offset + b);
    dtv["set" + a](offset, (offset += b, c), isBedrock);
  }

  // Write an array of bytes
  function h(a) {
    offset + a.length > abuf.byteLength && grow(offset + a.length);
    port.set(a, offset), offset += a.length;
  }

  option = typeof option == "object" && option !== null ? option : {};

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
    var hi, lo;

    if (typeof o == "bigint")
      return func["BigInt64"](o);

    if (typeof o == "number")
      // Split the number into two 32 bit halves, keeping the sign. It used to be
      // written as zero, while typeCheck() kept the value
      hi = Math.floor(o / 4294967296), lo = o;
    else if (typeof o == "object" && o !== null)
      hi = 0 | (o.high || 0), lo = 0 | (o.low || 0);
    else
      hi = lo = 0;

    isBedrock ? (func[3](lo), func[3](hi)) : (func[3](hi), func[3](lo));
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
    var a = isBedrock ? TEXT_ENCODER.encode(s) : encodeMUTF8(s);
    // The length field is 16 bit: writing more silently wrapped it and produced
    // a buffer that cannot be read back
    if (a.length > 0xFFFF)
      throw new Error("String is too long to serialize: " + a.length + " bytes, at most 65535");
    this["Uint16"](a.length);
    h(a);
  }.bind(func);

  // List tag
  // Allows any object with type, length and integer keys
  func[9] = function (l) {
    var t, n, s = 0, c, i;

    if (typeof l != "object" || l === null)
      throw new Error("Invalid list: " + l);

    if (l.type && typeof TYPEW[l.type] != 'undefined')
      // Specified type
      t = TYPEW[l.type], n = l.type;
    else if (ArrayBuffer.isView(l))
      // Typed array
      t = getTypeOfArray(l), n = "Invalid TypedArray";
    else if (Array.isArray(l))
      // Legacy NBT list with type on the first element. Skipping it by index
      // avoids copying the whole list on every write
      t = TYPEW[l[0]], n = l[0], s = 1;
    else
      throw new Error("Invalid list: " + Object.prototype.toString.call(l));

    c = l.length - s;
    c > 0 || (c = 0);

    // Write as empty list when the list is empty or null type
    if (t === 0 || !c) {
      this[1](0);
      this[3](0);
    } else if (t) {
      // Write type of the list
      this[1](t);
      // Write length
      this[3](c);
      for (i = 0; i < c; i++)
        this[t](l[i + s])
    } else
      throw new Error("Invalid type: " + n);
  }.bind(func);

  // Compound tag
  func[10] = function (o, root) {
    if (typeof o != "object" || o === null)
      throw new Error("Invalid compound: " + o);
    o = o[PROXIED_NBT] || o;

    // Optimize performance
    // Reduce traversal times
    for (var k of Object.getOwnPropertyNames(o)) {
      // Write values
      var f = splitTK(k)
        , t = TYPEW[f[0]];
      // Ignore non-NBT keys
      if (!t)
        continue;

      this[1](t);
      this[8](f[1]);
      this[t](o[k]);
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
    if (typeof o != "object" || o === null)
      throw new Error("Invalid compound: " + o);
    o = o[PROXIED_NBT] || o;

    var keys = NBT.keys(o);
    if (keys.length != 1 || keys[0] != "obj>")
      o = { "obj>": o };

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
   * @param {Boolean} [isProxy] - Create a new empty NBT object with proxy if true.
   * @returns {Object}
   */
  static create(isProxy) {
    var result = {
      __proto__: NBTObjectProto
    };

    return isProxy ? new Proxy(result, NBTHandler) : result
  }

  /**
   * Returns a boolean value that indicates whether a value is a object created by NBT.create().
   * @returns {Boolean}
   */
  static isNBT(obj) {
    return Object.prototype.isPrototypeOf.call(NBTObjectProto, obj)
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
      var l = splitTK(k);
      if (TYPEW[l[0]])
        result.push(k)
    }
    return result
  }

  /**
   * Copy the values of all of the NBT properties from one or more source objects 
   * to a target object.
   * 
   * Returns the target object.
   * @param {Object} target - The target object to copy to.
   * @param {Object} source - The source object from which to copy properties.
   */
  static assign(target, ...source) {
    if (!source.length || typeof target != "object" || target === null)
      return target;

    var t = target[PROXIED_NBT] || target;

    for (var s of source) {
      if (typeof s != "object" || s === null)
        continue;
      s = s[PROXIED_NBT] || s;
      for (var k of Object.getOwnPropertyNames(s)) {
        var l = splitTK(k);
        if (!TYPEW[l[0]])
          continue;
        // Type override. Probing the name keeps this correct for values written
        // by an earlier source, which a prebuilt index of target missed
        hasOwn.call(t, k) || deleteTypedKeys(t, l[1]);
        t[k] = s[k]
      }
    }

    return target
  }

  /**
   * Recursively detect whether objects are compvarely equal.
   * @param {Object} a
   * @param {Object} b 
   * @returns {Boolean}
   */
  static equal(a, b) {
    var visiting = new WeakMap();

    // Remember the pair being compared, so a cyclic structure terminates
    function enter(a, b) {
      var s = visiting.get(a);
      s || visiting.set(a, s = new WeakSet());
      if (s.has(b))
        return true;
      return s.add(b), false
    }

    // Arrays, typed arrays and compounds are never equal to each other: without
    // this, NBT.keys() reports no key for an array and any array compared equal
    // to an empty compound
    function kind(v) {
      return Array.isArray(v) ? 1 : ArrayBuffer.isView(v) ? 2 : 3
    }

    function recursive(a, b) {
      var i;

      if (a === b)
        return true;
      // Both null or both undefined already matched above
      if (a === null || b === null || typeof a == "undefined" || typeof b == "undefined")
        return false;
      if (typeof a !== typeof b)
        return false;
      if (typeof a !== 'object')
        return a === b;

      a = a[PROXIED_NBT] || a;
      b = b[PROXIED_NBT] || b;

      if (a === b)
        return true;
      if (kind(a) !== kind(b))
        return false;
      if (enter(a, b))
        return true;

      if (Array.isArray(a)) {
        if (a.length !== b.length)
          return false;
        for (i = 0; i < a.length; i++)
          if (!recursive(a[i], b[i]))
            return false;
        return true;
      }

      if (ArrayBuffer.isView(a)) {
        if (getTypeOfArray(a) !== getTypeOfArray(b))
          return false;
        if (a.length !== b.length)
          return false;
        for (i = 0; i < a.length; i++)
          if (a[i] !== b[i])
            return false;
        return true;
      }

      var keys1 = NBT.keys(a)
        , keys2 = NBT.keys(b);

      if (keys1.length !== keys2.length)
        return false;

      // Equal counts plus every key of a present on b means equal key sets
      for (var key of keys1)
        if (!hasOwn.call(b, key) || !recursive(a[key], b[key]))
          return false;

      return true;
    }

    return recursive(a, b);
  }

  /**
   * Read NBT data in buffer.
   * @param {ArrayBuffer|ArrayBufferView} buf - Input buffer, or any view of one.
   * @param {Object} option - Options.
   * @param {Boolean} option.littleEndian - Read as little endian if true.
   * @param {Boolean} option.asBigInt - Read i64 as BigInt if true.
   * @param {Boolean} option.asTypedArray - Read array and list as TypedArray if true.
   * @param {Boolean} option.asProxy - Create proxied NBT object.
   * @returns {Object}
   */
  static Reader(buf, option) {
    return ReaderProto(buf, option, !1, 0).value
  }

  /**
   * Read concatenated root label sequence.
   * @param {ArrayBuffer|ArrayBufferView} buf - Input buffer, or any view of one.
   * @param {Object} option - Options.
   * @param {Boolean} option.littleEndian - Read as little endian if true.
   * @param {Boolean} option.asBigInt - Read i64 as BigInt if true.
   * @param {Boolean} option.asTypedArray - Read array and list as TypedArray if true.
   * @param {Boolean} option.asProxy - Create proxied NBT object.
   * @returns {Array} Array of NBT root tags.
   */
  static ReadSerial(buf, option) {
    return ReaderProto(buf, option, !0, 0)
  }

  /**
   * Serialize NBT object.
   * @param {Object} obj - Input object.
   * @param {Object} option - Options.
   * @param {Boolean} option.littleEndian - Write as little endian if true.
   * @param {Boolean} option.noCheck - Disable circular reference detect for faster operation.
   * @returns {ArrayBuffer}
   */
  static Writer(obj, option) {
    return WriterProto(obj, option)
  }

  /**
   * Creates a reader.
   * @param {ArrayBuffer|ArrayBufferView} buf - Input buffer, or any view of one.
   * @param {Object} option - Options.
   * @param {Boolean} option.littleEndian - Read as little endian if true.
   * @param {Boolean} option.asBigInt - Read i64 as BigInt if true.
   * @param {Boolean} option.asTypedArray - Read array and list as TypedArray if true.
   * @param {Boolean} option.asProxy - Create proxied NBT object.
   * @returns {Object}
   */
  constructor(buf, option) {
    this.buf = buf;
    this.offset = 0;
    this.option = option || {};
  }

  /**
   * Get input buffer.
   * @returns {ArrayBuffer|ArrayBufferView}
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
    // Pass the offset instead of slicing the buffer: slicing copied everything
    // still unread on every call, which made a full pass O(n^2)
    var t = ReaderProto(this.buf, this.option, !1, this.offset);
    this.offset += t.length;
    return t.value
  }

  [Symbol.iterator]() {
    var t = new NBT(this.buf, this.option);
    // Continue from where this reader stands, without consuming it
    t.offset = this.offset;
    return {
      next: function () {
        return t.canRead()
          ? { done: !1, value: t.read() }
          : { done: !0, value: void 0 }
      },
      [Symbol.iterator]: function () {
        return this
      }
    }
  }
}

module.exports = NBT;