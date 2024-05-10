# .mcstructure文件格式
[原文](https://wiki.bedrock.dev/nbt/mcstructure.html#saving-and-loading)  

&emsp;&emsp;mcstructure是未压缩的NBT文件。与基岩版的其他NBT文件格式相同，mcstructure为小端序的NBT格式，其数据结构如下：  

```<Integer> format_version```: 始终为1。

```<List> size```: 由3个决定结构各轴尺寸的数字组成的列表  
&emsp;```Integer [0]``` X轴尺寸  
&emsp;```Integer [1]``` Y轴尺寸  
&emsp;```Integer [2]``` Z轴尺寸  

```<Compound> structure```: 结构数据复合标签  
&emsp;```<List> block_indices```: 包含两个List的List。 其储存了结构中相应位置的方块在调色盘中的索引。方块以ZYX的顺序被遍历存放至列表内。例如，对于大小为[2,3,4]的结构，则列表中的24项分别对应相对于原点的坐标 [(0,0,0), (0,0,1), (0,0,2), (0,0,3), (0,1,0), (0,1,1), (0,1,2), (0,1,3), (0,2,0), (0,2,1), (0,2,2), (0,2,3), (1,0,0), (1,0,1), (1,0,2), (1,0,3), (1,1,0), (1,1,1), (1,1,2), (1,1,3), (1,2,0), (1,2,1), (1,2,2), (1,2,3)]。当对应位置无方块时索引被设为-1，表示对应位置的方块不会在加载时被替换。结构空位会被存储为-1。两个层共用一个调色盘。  

&emsp;```<List of Integer> [0]``` 外显层方块索引  

&emsp;```<List of Integer> [1]``` 内含层方块索引。这一层一般仅用于储存含水方块所含的水。  

&emsp;```<List of Compound> entities```: 实体NBT数据列表。保存时直接从世界数据库的NBT数据复制过来，而在加载时像UUID及坐标等标签会被替换。  

&emsp;```<Compound> palette```: 包含多个名字不同的调色盘用于支持结构变种，但目前仅default会被使用。  

&emsp;&emsp;```<Compound>```: 一个调色盘(目前仅命名为default)  

&emsp;&emsp;&emsp;```<List> block_palette```: 方块状态列表。  
  
&emsp;&emsp;&emsp;&emsp;```<Compound>```: 一个方块状态  
  
&emsp;&emsp;&emsp;&emsp;&emsp;```<String> name```: 方块ID，如minecraft:planks。
&emsp;&emsp;&emsp;&emsp;&emsp;```<Compound> states```: 方块状态键值对。例如: wood_type:"acacia", bite_counter:3, open_bit:1b. 其数据值均为对应的NBT类型：枚举值为String，整数标量为Integer，布尔值为Byte。  
&emsp;&emsp;&emsp;&emsp;&emsp;```Integer version```: 方块的兼容版本 (在1.19为17959425)。  

```Compound block_position_data```: Contains additional data for individual blocks in the structure. Each key is an integer index into the flattened list of blocks inside of block_indices. Layer is unspecified as it is irrelevant.

```Compound <index>```: A single piece of additional block data, applied to the block at its index position.

```Compound block_entity_data```: Block entity data as NBT, stored the same as block entities in the world file itself. Position tags are saved, but replaced upon loading. No other objects seem to exist adjacent to this one at this time.

```List structure_world_origin```: List of three integers describing where in the world the structure was initially saved. Equal to the position of the saving structure block, plus its offset settings. This is used to determine where entities should be placed when loading. An entity's new absolute position is equal to its old position, minus these values, plus the origin of the structure's loading position.

```Integer``` Structure origin X position. 
```Integer``` Structure origin Y position. 
```Integer``` Structure origin Z position.