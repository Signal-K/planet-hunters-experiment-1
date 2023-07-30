extends PanelContainer

var res: PlantResource

func setup(new_res: PlantResource):
	res = new_res
	$HBoxContainer/VBoxContainer/NameLabel.text = res.name
	$HBoxContainer/IconTexture.texture = res.icon_texture
