# EarthBaseConstants.gd
# Constants and enums for the earth base scene
class_name EarthBaseConstants

# Ground level system constants
const GROUND_LEVEL: float = 800.0
const SOIL_TOP: float = 750.0
const SOIL_BOTTOM: float = 950.0
const SKY_LEVEL: float = 400.0
const UI_LEVEL: float = 1000.0

# Scene list for navigation
const SCENE_LIST: Array[String] = [
	"res://Scenes/Earth/earth_base_1.tscn"
]

# UI Panel types
enum PanelType {
	MENU,
	MARKET,
	SPACE_MAP,
	NEW_MISSION
}