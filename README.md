# ParseNBT.js
ParseNBT.js is JavaScript-based minecraft NBT parser and serializer.
## Usage
**Reader**
```js
const fs = require('fs'), NBT = require('main.js');

var binData = fs.readFileSync('./path/of/nbt.nbt');
console.log(NBT.Reader(binData).buffer);
```

## Data Structure
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
In the object, keys are separated into two parts with character ```>```.
In the left-hand-side is the tag type, and the right-hand-side is the tag name.
Tag name can be an empty string like above.
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

Especially, the type of elements in TAG_List is at the first element of the list array.
And for any TAG_Long, it'll be formatted into an object which has two values named ```low``` and ```high```, 
that produces the high 32 bits and the low 32 bits separately.
