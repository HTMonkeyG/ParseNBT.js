# API Document
## NBT object format

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

&emsp;Especially, the type of elements in TAG_List is the first element of the list array.

&emsp;For TAG_Long, it'll be formatted into an object which has two values named ```low``` and ```high```, 
which produces the high 32 bits and the low 32 bits separately. BigInt type also can be used in Tag_Long input when allowBigint is true.

&emsp;Example:

```js
{
  "comp>": {
    "i32>format_version": 1,
    "list>size": [ "i32", 1, 1, 1 ],
    "comp>structure": {
      "list>block_indices": ["i32", 0],
      "list>entities": ["comp"],
      "comp>palette": {}
    },
    "list>structure_world_origin": [ "i32", -18, -60, -61 ]
  }
}
```

## Static methods
```js
/**
 * Read NBT data in buffer.
 * @param {ArrayBuffer} buf - Input buffer
 * @param {Boolean} littleEndian - Read as little endian if true
 * @param {Boolean} asBigInt - Read i64 as BigInt if true
 * @returns {*}
 */
NBT.Reader(buf: ArrayBuffer, littleEndian: Boolean, asBigInt: Boolean): any

/**
 * Serialize NBT object.
 * @param {*} obj - Input object
 * @param {Boolean} littleEndian - Write as little endian if true
 * @param {Boolean} allowBigInt - Allow BigInt in i64 input
 * @returns {ArrayBuffer}
 */
NBT.Writer(obj: any, littleEndian: Boolean, allowBigInt: Boolean): ArrayBuffer

/**
 * Read concatenated root label sequence.
 * @param {ArrayBuffer} buf - Input buffer
 * @param {Boolean} littleEndian - Read as little endian if true
 * @param {Boolean} asBigInt - Read i64 as BigInt if true
 * @returns {Array} Array of NBT root tags
 */
NBT.ReadSerial(buf: ArrayBuffer, littleEndian: Boolean, asBigInt: Boolean): any[]

/**
 * Create a new NBT object
 * @returns 
 */
create()

/**
 * Get attribute in NBT object.
 * @param {*} obj - NBT object
 * @param {String} type - Value type or "[type]>[key]" formatted key
 * @param {String|undefined} key - Key
 * @returns
 */
get(obj: any, type: String, key: String|undefined): any

/**
 * Set attribute in NBT object with validation.
 * @param {*} obj - Input buffer
 * @param {String} type - Value type
 * @param {String} key - Key
 * @param {*} value - Value
 * @returns
 */
set(obj: any, type: String, key: String, value: any)

/**
 * Returns the names with valid type-value pair of an NBT object.
 * @param {*} obj 
 * @returns {String[]}
 */
keys(obj: any): String[]
```

## Instance methods
```js
/**
 * Creates a reader.
 * @param {ArrayBuffer} buf - Input buffer
 * @param {Boolean} isLE - Read as little endian if true
 * @param {Boolean} asBigInt - Convert i64 to BigInt
 */
new NBT(buf: ArrayBuffer, isLE: Boolean, asBigInt: Boolean)

/**
 * Get input buffer.
 * @returns {ArrayBuffer}
 */
getBuffer(): ArrayBuffer

/**
 * Get offset.
 * @returns {Number}
 */
getOffset(): Number

/**
 * Get number endian.
 * 
 * True if little endian.
 * @returns {Boolean}
 */
getEndian(): Boolean

/**
 * Detect whether reached the end.
 * @returns {Boolean}
 */
canRead(): Boolean

/**
 * Read a single NBT root tag.
 * 
 * Returns null when read to the end.
 * @returns {*|null}
 */
read(): * | null

/**
 * Return an iterator of concatenated root label sequence.
 */
[Symbol.iterator]()
```