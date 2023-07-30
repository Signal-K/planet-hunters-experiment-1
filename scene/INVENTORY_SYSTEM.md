# Inventory System Documentation

## Overview
This is a reusable, modular inventory/hotbar system built in Godot 4.x. The system uses a resource-based architecture that separates data from presentation, making it highly portable and adaptable to different projects.

## Architecture

### Core Components

#### 1. **Inventory UI (`inventory.tscn` / `inventory.gd`)**
- Main container that displays the inventory grid
- Manages slot instantiation and selection
- Handles visual feedback with selector texture
- **Exports:**
  - `slotScene: PackedScene` - Template for individual slots
  - `inventoryResource: InventoryResource` - Data source for inventory items (can be named based on your item type)

#### 2. **Slot Container (`slot_container.tscn` / `slot_container.gd`)**
- Individual inventory slot component
- Handles click events and selection
- Manages item data updates
- **Signals:**
  - `slot_selected(slot_pos)` - Emitted when slot is clicked

#### 3. **Item Info (`item_info.tscn` / `item_info.gd`)**
- Visual representation of item within slot
- Displays item texture and quantity
- Includes flash animation for feedback
- **Methods:**
  - `set_item_info(texture, quantity)` - Initialize item display
  - `set_label(value)` - Update quantity display
  - `play_flash_animation()` - Visual feedback

### Data Layer

The system uses a three-tier resource hierarchy that can be adapted to any item type:

#### Resource Classes
```gdscript
ItemName (Resource)
├── itemName: String

ItemData (extends Resource)
├── itemNameResource: ItemName
├── texture: Texture
├── quantity: int
└── get_item_name() -> String

ItemSlotData (extends Resource)
├── itemDataResource: ItemData
├── itemScene: PackedScene (optional - for spawnable items)
└── Methods:
    ├── has_items() -> bool
    ├── add_quantity(value)
    ├── subtract_quantity()
    ├── get_texture() -> Texture
    ├── get_quantity() -> int
    └── get_item_name() -> String

InventoryResource (extends Resource)
├── itemList: Array[ItemSlotData]
└── Methods:
    ├── get_item_data(name) -> ItemSlotData
    ├── get_size() -> int
    └── get_item_list() -> Array[ItemSlotData]
```

**Example Implementation Names:**
- Game items: `ItemName`, `ItemData`, `ItemSlotData`
- Weapons: `WeaponName`, `WeaponData`, `WeaponSlotData`
- Consumables: `ConsumableName`, `ConsumableData`, `ConsumableSlotData`
- Current project: `PlantName`, `PlantData`, `SeedData` (seeds in inventory)

## How to Reuse in Other Projects

### 1. Copy Required Files
```
Scenes/UI/
├── inventory.tscn
├── slot_container.tscn
├── item_info.tscn
└── background.tscn (optional)

Scripts/
├── inventory.gd
├── slot_container.gd
└── item_info.gd

Resources/
├── item_name.gd       (or your custom name)
├── item_data.gd       (or your custom name)
├── item_slot_data.gd  (or your custom name)
└── inventory_resource.gd
```

### 2. Create Your Data Resources
1. Create individual `ItemName` resources for each item (e.g., "Sword", "Potion", "Seed")
2. Create `ItemData` resources linking names to textures and quantities
3. Create `ItemSlotData` resources for items with additional functionality (scenes, behaviors)
4. Create an `InventoryResource` containing all your items

### 3. Integration Steps
1. Instance `inventory.tscn` in your scene
2. Create your inventory resource (`.tres` file) with your items
3. Assign your inventory resource to the inventory's exported property
4. Connect to signals as needed (e.g., `slot_selected`)
5. Optional: Customize visuals (background, selector, slot textures)

### 4. Customization Points
- **Grid columns:** Controlled by `inventoryResource.get_size()`
- **Slot appearance:** Modify `item_info.tscn` textures
- **Selection visual:** Change selector texture in inventory
- **Item display:** Adjust margins/sizes in `item_info.tscn`
- **Item types:** Rename resource classes to match your game (weapons, consumables, etc.)

## React Native Integration

### Local Storage Strategy

#### Godot Side
```gdscript
# Save inventory state
func save_inventory_state() -> Dictionary:
    var state = {}
    for item in inventoryResource.get_item_list():
        state[item.get_item_name()] = item.get_quantity()
    return state

# Load inventory state
func load_inventory_state(state: Dictionary) -> void:
    for item_name in state.keys():
        var item_data = inventoryResource.get_item_data(item_name)
        if item_data:
            var diff = state[item_name] - item_data.get_quantity()
            if diff > 0:
                item_data.add_quantity(diff)
```

#### JavaScript Bridge
```javascript
// In React Native
import { GodotModule } from './GodotBridge';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save to local storage
const saveInventory = async (inventoryData) => {
  try {
    await AsyncStorage.setItem(
      '@inventory_state',
      JSON.stringify(inventoryData)
    );
  } catch (e) {
    console.error('Failed to save inventory:', e);
  }
};

// Load from local storage
const loadInventory = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem('@inventory_state');
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Failed to load inventory:', e);
  }
};

// Initialize Godot with saved data
GodotModule.onReady(() => {
  loadInventory().then(state => {
    if (state) {
      GodotModule.callGodotFunction('load_inventory_state', [state]);
    }
  });
});
```

#### Godot JavaScript Interface
```gdscript
# In your main script
extends Node

func _ready():
    # Register JavaScript callable functions
    if OS.has_feature("web"):
        JavaScriptBridge.eval("""
            window.godotSaveInventory = function(data) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SAVE_INVENTORY',
                    data: data
                }));
            }
        """)

func save_to_react_native():
    var state = $Inventory.save_inventory_state()
    if OS.has_feature("web"):
        JavaScriptBridge.eval("godotSaveInventory(" + JSON.stringify(state) + ")")
```

#### React Native WebView Setup
```javascript
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: 'path/to/godot/build.html' }}
  onMessage={(event) => {
    const message = JSON.parse(event.nativeEvent.data);
    
    if (message.type === 'SAVE_INVENTORY') {
      saveInventory(message.data);
    }
  }}
  injectedJavaScript={`
    // Listen for inventory updates from Godot
    window.addEventListener('message', (event) => {
      if (event.data.type === 'LOAD_INVENTORY') {
        // Send saved state back to Godot
        const state = ${JSON.stringify(await loadInventory())};
        // Call Godot function to load state
      }
    });
  `}
/>
```

### Best Practices for React Native Integration

1. **Auto-save:** Trigger saves on inventory changes via signals
2. **Debouncing:** Batch rapid changes to reduce storage writes
3. **Versioning:** Include schema version in saved data for migrations
4. **Validation:** Validate loaded data before applying to prevent corruption
5. **Offline-first:** Store locally and sync to backend when online

### Data Persistence Flow
```
User Action (Godot)
    ↓
Inventory Update (signal emitted)
    ↓
Save State Serialization
    ↓
JavaScript Bridge
    ↓
React Native Handler
    ↓
AsyncStorage.setItem()
    ↓
Optional: Backend Sync
```

## Benefits of This Design

- **Separation of Concerns:** Data, logic, and presentation are cleanly separated
- **Reusability:** Drop-in compatible with any Godot project
- **Extensibility:** Easy to add new item types or modify behavior
- **Performance:** Resource-based system is memory efficient
- **Type Safety:** Strongly typed resources prevent errors
- **Platform Agnostic:** Works seamlessly in native and web builds

## Future Enhancements

- Drag-and-drop reordering
- Item tooltips with descriptions
- Stack splitting/merging
- Filter/search functionality
- Multi-grid support (separate inventories)
- Cloud save synchronization
