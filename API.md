# ParseNBT.js v3.1.0 documentation

<a name="NBT"></a>

- Table of Contents
  * [ParseNBT.js object format](#NBT_Format)
  * [Class: NBT](#NBT)
    * [new NBT(buf[, option])](#new_NBT_new)
    * _instance_
      * [nbt\[Symbol.iterator\]()](#NBT+iterator) ⇒ [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
      * [nbt.getBuffer()](#NBT+getBuffer) ⇒ [``<ArrayBuffer>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)
      * [nbt.getOffset()](#NBT+getOffset) ⇒ [``<Number>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type)
      * [nbt.canRead()](#NBT+canRead) ⇒ [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)
      * [nbt.read()](#NBT+read) ⇒ [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) \| [``<null>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#null_type)
    * _static_
      * [NBT.PROXIED_NBT](#NBT.PROXIED_NBT) ⇒ [``<Symbol>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)
      * [NBT.create([isProxy])](#NBT.create) ⇒ [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) | [``<Proxy>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
      * [NBT.isNBT()](#NBT.isNBT) ⇒ [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)
      * [NBT.keys(obj)](#NBT.keys) ⇒ [``<String[]>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)
      * [NBT.assign(target, ...source)](#NBT.assign) ⇒ [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
      * [NBT.equal(a, b)](#NBT.equal) ⇒ [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)
      * [NBT.Reader(buf[, option])](#NBT.Reader) ⇒ [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) | [``<Proxy>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
      * [NBT.ReadSerial(buf[, option])](#NBT.ReadSerial) ⇒ [``<Object[]>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) | [``<Proxy[]>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
      * [NBT.Writer(obj[, option])](#NBT.Writer) ⇒ [``<ArrayBuffer>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)

<a name="NBT_Format"></a>

## ParseNBT.js object format
ParseNBT.js' output uses a special data structure for keys of the object.

For example:
```json
{
  "comp>": { 
    "i32>count": 100,
    "list>pos": [ "i32", 0, 0, 0 ],
    "i64>ticks": { "low": 114514, "high": 1919810 }
  }
}
```

In the object, keys are separated into two parts with character ``>``.

In the left-hand-side is the tag type, and the right-hand-side is the tag name. Tag name can be an empty string like above.

The comparison table between the type string and the actual type is as follows:

| Tag ID | Tag Type | Tag Type String |
|  ----  | ---- | ---- |
| 0  | TAG_End | null |
| 1  | TAG_Byte | i8 |
| 2  | TAG_Short | i16 |
| 3  | TAG_Int | i32 |
| 4  | TAG_Long | i64 |
| 5  | TAG_Float | f32 |
| 6  | TAG_Double | f64 |
| 7  | TAG_Byte_Array | a8 |
| 8  | TAG_String | str |
| 9  | TAG_List | list |
| 10 | TAG_Compound | comp |
| 11 | TAG_Int_Array | a32 |
| 12 | TAG_Long_Array | a64 |

For TAG_Long, it'll be formatted into an object  has two values named ```low``` and ```high```, 
which produces the high 32 bits and the low 32 bits separately. 

BigInt also can be used in Tag_Long input when allowBigint is true.

<a name="new_NBT_new"></a>

## new NBT(buf, option)

* ``buf`` [``<ArrayBuffer>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) Input buffer
* ``option`` ``Object`` Options
  * ``littleEndian`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Read as little endian if true
  * ``asBigInt`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Read i64 as BigInt if true
  * ``asTypedArray`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Read array and list as TypedArray if true
  * ``Proxy`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Create proxied NBT object.
* Returns: [``<NBT>``](#NBT)

Creates a reader.

The reader will treat the input as a concatenated root label sequence, which means there are multiple independent NBTs connected together.

Everytime [``<NBT.read()>``](#NBT+read) is called, the reader will read a single NBT, until the end of file or no valid NBT root tag.

Example:
```js
const NBT = require("parsenbt-js")
    , fs = require("fs");

function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length)
    , view = new Uint8Array(ab);
  view.set(buf)
  return ab;
}

var reader = new NBT(
  toArrayBuffer(fs.readFileSync("./test.mcstructure")),
  {
    littleEndian: true
  }
);

console.log(reader.read());
```

<a name="NBT+iterator"></a>

## nbt[Symbol.iterator]()

* Returns: [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)

Returns an iterator for NBT root tag sequence included in the input.

<a name="NBT+getBuffer"></a>

## nbt.getBuffer()

* Returns: [``<ArrayBuffer>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)

Get input buffer.

<a name="NBT+getOffset"></a>

## nbt.getOffset()

* Returns: [``<Number>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type)

Get offset.

<a name="NBT+canRead"></a>

## nbt.canRead()

* Returns: [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)

Detect whether reached the end.

<a name="NBT+read"></a>

## nbt.read()

* Returns: [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) \| [``<null>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#null_type)

Returns null when read to the end.

See [new NBT(buf, option)](#new_NBT_new).

<a name="NBT.PROXIED_NBT"></a>

## NBT.PROXIED_NBT

A symbol to get the original object of a proxied NBT object.
  
Only for debug use. Do not directly modify the original object.

Example:
```js
const NBT = require("parsenbt-js");

var empty = NBT.createProxy();

empty["str>foo"] = "";
empty.foo = "bar_";

console.log(empty[NBT.PROXEID_NBT]);
// {
//   "str>foo": "bar_"
// }
```

<a name="NBT.create"></a>

## NBT.create([isProxy])

* ``isProxy`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)

* Returns: [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) | [``<Proxy>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) Create a new empty NBT object with proxy if true.

Create a new empty NBT object.

The proxied NBT object can be accessed as normal JS Object with ``.`` operator. And when initial a property with existing key and different type, the type will be overrided to the new one.

No proxy example:
```js
const NBT = require("parsenbt-js");

var empty = NBT.create();

console.log(NBT.isNBT(empty));
// true

console.log(NBT.isNBT({ "comp>":{ } }))
// false
```

With proxy example:

```js
const NBT = require("parsenbt-js");

var empty = NBT.create(true);

// Initialize type of the key
empty["i8>foo"] = 0;

console.log(empty.foo);
// 0

empty.foo = 90;

console.log(empty.foo);
// 90

// Type override
empty["str>foo"] = "bar";

console.log(empty["i8>foo"]);
// undefined
```

Besides, the input data will be converted to the type corresponding to the key value. Integers will be clamped to the valid range.

```js
const NBT = require("parsenbt-js");

var empty = NBT.create(true);

// Initialize type of the key
empty["i8>foo"] = 0;

console.log(empty.foo);
// 0

empty.foo = 114514;

console.log(empty.foo);
// 255
```

<a name="NBT.isNBT"></a>

## NBT.isNBT()

* Returns: [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)

Returns a boolean value that indicates whether a value is a object created by NBT.create().

See [NBT.create()](#NBT.create).

Example:
```js
const NBT = require("parsenbt-js");

console.log(NBT.isNBT(NBT.create()));
// true

console.log({"comp":{ }});
// false
```

<a name="NBT.keys"></a>

## NBT.keys(obj)
Returns the names with valid type-value pair of an NBT object.

* ``obj`` [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Input object.
* Returns: [``<String[]>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)

<a name="NBT.assign"></a>

## NBT.assign(target, ...source)

* ``target`` [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) The target object to copy to.
* ``...source`` [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) The source object from which to copy properties.
* Returns: [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)

Copy the values of all of the NBT properties from one or more source objects to a target object.

Returns the target object.

Example:
```js
const NBT = require("parsenbt-js");

var r = NBT.create()
  , s = NBT.create()
  , t;

r["str>awa"] = "qwq";
r["i8>k"] = 42;

s["i16>awa"] = 1145;

t = NBT.assign(r, s);

console.log(t);
// {
//   "i8>k": 42,
//   "i16>awa": 1145
// }
```

<a name="NBT.equal"></a>

## NBT.equal(a, b)

* ``a`` [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Input object.
* ``b`` [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Input object.
* Returns: [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)

Recursively detect whether objects are compvarely equal.

<a name="NBT.Reader"></a>

## NBT.Reader(buf, option)

* ``buf`` [``<ArrayBuffer>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) Input buffer.
* ``option`` ``Object`` Options.
  * ``littleEndian`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Read as little endian if true.
  * ``asBigInt`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Read i64 as BigInt if true.
  * ``asTypedArray`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Read array and list as TypedArray if true.
  * ``asProxy`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Create proxied NBT object. See [NBT.createProxy()](#NBT.createProxy)
* Returns: [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)

Read NBT data in buffer.

If there are multiple root tags in the input, the reader will only deserialize the first one.

In addition, if configured as littieEndian, the reader will try to check the [MCBE level.dat header](https://wiki.bedrock.dev/nbt/nbt-in-depth.html#bedrock-nbt-file-header).

Example:
```js
const NBT = require("parsenbt-js")
    , fs = require("fs");

function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length)
    , view = new Uint8Array(ab);
  view.set(buf)
  return ab;
}

var r = NBT.Reader(
  toArrayBuffer(fs.readFileSync("./level.dat")),
  {
    littleEndian: true
  }
);

console.log(r);
```

<a name="NBT.ReadSerial"></a>

## NBT.ReadSerial(buf, option)

* ``buf`` [``<ArrayBuffer>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) Input buffer.
* ``option`` ``Object`` Options.
  * ``littleEndian`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Read as little endian if true.
  * ``asBigInt`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Read i64 as BigInt if true.
  * ``asTypedArray`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Read array and list as TypedArray if true.
  * ``asProxy`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Create proxied NBT object.
* Returns: [``<Object[]>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)

Read concatenated root label sequence, and put all of the vaild NBT objects in an array.

Example:
```js
const NBT = require("parsenbt-js")
    , fs = require("fs");

function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length)
    , view = new Uint8Array(ab);
  view.set(buf)
  return ab;
}

var r = NBT.ReadSerial(
  toArrayBuffer(fs.readFileSync("./chunk.dump.nbt")),
  {
    littleEndian: true
  }
);

console.log(r);
```

<a name="NBT.Writer"></a>

## NBT.Writer(obj, option)

* ``obj`` [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Input object.
* ``option`` [``<Object>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) Options.
  * ``littleEndian`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Write as little endian if true.
  * ``noCheck`` [``<Boolean>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) Disable circular reference detect for faster operation.
* Returns: [``<ArrayBuffer>``](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)

Serialize NBT object.

For the type of the payload of a List Tag, the Writer will firstly check its ``.type`` property, and try to use it as payload type. Next, the prototype chain will be tested to determine whether the object is a typed array. Then, the Writer will check the first element of the list.

Example:
```js
const NBT = require("parsenbt-js");

var r = NBT.create();
r["str>name"] = "minecraft:creeper";

console.log(NBT.Writer(r, { littleEndian: true }));
```
