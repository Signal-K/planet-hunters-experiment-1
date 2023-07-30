extends Node

const PLAYER_SKINS = {
	Enums.Style.BASIC: preload("res://assets/Growth/graphics/characters/main/main_basic.png"),
	Enums.Style.BASEBALL: preload("res://assets/Growth/graphics/characters/main/main_blue.png"),
	Enums.Style.COWBOY: preload("res://assets/Growth/graphics/characters/main/main_cowboy.png"),
	Enums.Style.ENGLISH: preload("res://assets/Growth/graphics/characters/main/main_grey.png"),
	Enums.Style.STRAW: preload("res://assets/Growth/graphics/characters/main/main_straw.png"),
	Enums.Style.BEANIE: preload("res://assets/Growth/graphics/characters/main/main_red.png")}
const TILE_SIZE = 16
const PLANT_DATA = {
	Enums.Seed.TOMATO: {
		'texture': "res://assets/Growth/graphics/plants/tomato.png",
		'icon_texture': "res://assets/Growth/graphics/icons/tomato.png",
		'name':'Tomato',
		'h_frames': 4,
		'grow_speed': 0.6,
		'death_max': 3,
		'reward': Enums.Item.TOMATO},
	Enums.Seed.CORN: {
		'texture': "res://assets/Growth/graphics/plants/corn.png",
		'icon_texture': "res://assets/Growth/graphics/icons/corn.png",
		'name':'Corn',
		'h_frames': 4,
		'grow_speed': 1.0,
		'death_max': 2,
		'reward': Enums.Item.CORN},
	Enums.Seed.PUMPKIN: {
		'texture': "res://assets/Growth/graphics/plants/tomato.png",
		'icon_texture': "res://assets/Growth/graphics/icons/pumpkin.png",
		'name':'Pumpkin',
		'h_frames': 4,
		'grow_speed': 0.3,
		'death_max': 3,
		'reward': Enums.Item.PUMPKIN},
	Enums.Seed.WHEAT: {
		'texture': "res://assets/Growth/graphics/plants/tomato.png",
		'icon_texture': "res://assets/Growth/graphics/icons/wheat.png",
		'name':'Wheat',
		'h_frames': 4,
		'grow_speed': 1.0,
		'death_max': 3,
		'reward': Enums.Item.WHEAT}}
const MACHINE_UPGRADE_COST = {
	Enums.Machine.SPRINKLER: {
		'name': 'Sprinkler',
		'cost' :{Enums.Item.TOMATO: 30, Enums.Item.WHEAT: 20},
		'icon': preload("res://assets/Growth/graphics/icons/sprinkler.png")},
	Enums.Machine.FISHER: {
		'name': 'Sprinkler',
		'cost' :{Enums.Item.WOOD: 25, Enums.Item.FISH: 15},
		'icon': preload("res://assets/Growth/graphics/icons/fisher.png")},
	Enums.Machine.SCARECROW: {
		'name': 'Sprinkler',
		'cost' : {Enums.Item.PUMPKIN: 15, Enums.Item.CORN: 15},
		'icon': preload("res://assets/Growth/graphics/icons/scarecrow.png")}}
const HOUSE_COST = {
	1: {Enums.Item.WOOD: 30, Enums.Item.APPLE: 20},
	2: {Enums.Item.WOOD: 40, Enums.Item.APPLE: 30}}
const STYLE_UPGRADES = {
	Enums.Style.COWBOY: {
		'name': 'Cowboy',
		'cost':{Enums.Item.WOOD: 8, Enums.Item.WHEAT: 6},
		'icon': preload("res://assets/Growth/graphics/icons/cowboy.png")},
	Enums.Style.ENGLISH: {
		'name': 'Oldie',
		'cost':{Enums.Item.WOOD: 8, Enums.Item.WHEAT: 6},
		'icon': preload("res://assets/Growth/graphics/icons/english.png")},
	Enums.Style.BASEBALL: {
		'name': 'Baseball',
		'cost':{Enums.Item.WOOD: 8, Enums.Item.WHEAT: 6},
		'icon': preload("res://assets/Growth/graphics/icons/blue.png")},
	Enums.Style.BEANIE: {
		'name': 'Beanie',
		'cost':{Enums.Item.WOOD: 8, Enums.Item.WHEAT: 6},
		'icon': preload("res://assets/Growth/graphics/icons/beanie.png")},
	Enums.Style.STRAW: {
		'name': 'Straw',
		'cost':{Enums.Item.WOOD: 8, Enums.Item.WHEAT: 6},
		'icon': preload("res://assets/Growth/graphics/icons/straw.png")}}
const TOOL_STATE_ANIMATIONS = {
	Enums.Tool.HOE: 'Hoe',
	Enums.Tool.AXE: 'Axe',
	Enums.Tool.WATER: 'Water',
	Enums.Tool.SWORD: 'Sword',
	Enums.Tool.FISH: 'Fish',
	Enums.Tool.SEED: 'Seed',
	}

var forecast_rain: bool
