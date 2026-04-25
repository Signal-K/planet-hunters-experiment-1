import os
import re

def audit_tscn(root_dir):
    res_root = os.path.join(root_dir, 'scene')
    tscn_files = []
    for root, dirs, files in os.walk(res_root):
        for file in files:
            if file.endswith('.tscn'):
                tscn_files.append(os.path.join(root, file))

    print(f"Auditing {len(tscn_files)} .tscn files...")
    
    missing_ext_resources = {}
    broken_sub_resources = {}

    for tscn_path in tscn_files:
        relative_path = os.path.relpath(tscn_path, root_dir)
        with open(tscn_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Check ext_resource
        ext_res_matches = re.findall(r'\[ext_resource .* path="res://([^"]+)"', content)
        for res_path in ext_res_matches:
            abs_res_path = os.path.join(res_root, res_path)
            if not os.path.exists(abs_res_path):
                if relative_path not in missing_ext_resources:
                    missing_ext_resources[relative_path] = []
                missing_ext_resources[relative_path].append(res_path)

        # Check sub_resource
        # Defined sub_resources: [sub_resource type="..." id="1_abcde"]
        defined_sub_res = set(re.findall(r'\[sub_resource .* id="([^"]+)"', content))
        
        # Used sub_resources: SubResource("1_abcde") or @sub_resource("1_abcde") etc.
        # Actually in .tscn it's usually: material = SubResource("1_abcde")
        used_sub_res = set(re.findall(r'SubResource\("([^"]+)"\)', content))
        
        for sub_id in used_sub_res:
            if sub_id not in defined_sub_res:
                if relative_path not in broken_sub_resources:
                    broken_sub_resources[relative_path] = []
                broken_sub_resources[relative_path].append(sub_id)

    if not missing_ext_resources and not broken_sub_resources:
        print("No issues found.")
    else:
        if missing_ext_resources:
            print("\nMissing external resources:")
            for tscn, missing in missing_ext_resources.items():
                print(f"  {tscn}:")
                for m in missing:
                    print(f"    - res://{m}")
        
        if broken_sub_resources:
            print("\nBroken sub-resource references:")
            for tscn, broken in broken_sub_resources.items():
                print(f"  {tscn}:")
                for b in broken:
                    print(f"    - SubResource(\"{b}\")")

if __name__ == "__main__":
    audit_tscn('/Users/scroobz/Navigation/Native/planet-hunters-experiment-1')
