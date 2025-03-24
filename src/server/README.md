# 🧩 Server-side API

## ```getBlockValue(blockId, key)```

### Description:
Retrieves the value associated with a given key (`"summary"`, `"intent"`, or `"content"`) from the block specified by `blockId`.

### Parameters:
- `blockId` (`String`): Dot-separated string path to the target block. Format: `"secId[.subsecId[.parId[.senId]]]"`  
  - Default value for unspecified parts is `0` (meaning "do not descend further").  
  - All indices are **1-based**.
- `key` (`String`): One of `"summary"`, `"intent"`, or `"content"`.

### Returns:
- The value associated with the specified key in the target block.

### Example:
```js
const summary = getBlockValue("1.2", "summary");
// Might return: "This subsection covers narrative devices."
```

---

## ```updateBlockValue(blockId, key, valueToUpdate)```

### Description:
Updates a specified key (`"summary"`, `"intent"`, or `"content"`) in the target block with a new value.

### Parameters:
- `blockId` (`String`): Path to the target block using the same format as in `getBlockValue`.
- `key` (`String`): The key to update (`"summary"`, `"intent"`, or `"content"`).
- `valueToUpdate` (`Any`): The new value to assign.

### Returns:
- `undefined`. The JSON file is updated in-place.

### Example:
```js
updateBlockValue("1.2.3", "intent", "To analyze the impact of setting.");
```

---

## ```returnTargetBlock(obj, secId, subsecId, parId, senId)```

### Description:
A helper function used internally to navigate to a specific block within the nested structure.

### Parameters:
- `obj` (`Object`): Parsed JSON object from the file.
- `secId`, `subsecId`, `parId`, `senId` (`Number`): Numeric indices to traverse into the nested `"content"` arrays.  
  - If any of these values are `0`, traversal halts at that level.

### Returns:
- The target block object at the specified location.
