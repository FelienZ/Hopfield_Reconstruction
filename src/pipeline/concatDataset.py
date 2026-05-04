import os
import shutil

base_path = 'A:/JST_UAS/dataset'
output_path = 'A:/JST_UAS/dataset_final'

if not os.path.exists(output_path):
    os.makedirs(output_path)

folders = {
    '.': 'db1',         
    'dataset2': 'db2',  
    'dataset3': 'db3'   
}

for folder, prefix in folders.items():
    current_path = os.path.join(base_path, folder)
    
    files = [f for f in os.listdir(current_path) if f.endswith('.tif')]
    
    for filename in files:
        new_name = f"{prefix}_{filename}"
        src = os.path.join(current_path, filename)
        dst = os.path.join(output_path, new_name)
        shutil.copy2(src, dst)

print(f"Selesai! Semua dataset kini ada di {output_path} dengan nama unik.")