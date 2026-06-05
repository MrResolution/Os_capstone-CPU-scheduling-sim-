import os
from PIL import Image

def generate_icons():
    logo_path = 'logo.png'
    output_dir = os.path.join('build', 'icons')
    
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found in the root directory.")
        return
        
    os.makedirs(output_dir, exist_ok=True)
    
    sizes = [16, 32, 48, 64, 128, 256, 512]
    
    try:
        img = Image.open(logo_path)
        print(f"Loaded logo.png successfully. Original size: {img.size}")
        
        # Convert to RGBA to preserve transparency if applicable
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
            
        for size in sizes:
            resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
            output_path = os.path.join(output_dir, f"{size}x{size}.png")
            resized_img.save(output_path, 'PNG')
            print(f"Generated {size}x{size} icon at {output_path}")
            
        # Generate the standard fallback build/icon.png at 512x512
        icon_png_path = os.path.join('build', 'icon.png')
        img.resize((512, 512), Image.Resampling.LANCZOS).save(icon_png_path, 'PNG')
        print(f"Generated standard fallback icon at {icon_png_path}")
        
        # Update/create build/icon.ico for Windows packaging just in case
        icon_ico_path = os.path.join('build', 'icon.ico')
        # Create an .ico using the sizes
        img.save(icon_ico_path, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
        print(f"Generated Windows fallback icon at {icon_ico_path}")
        
    except Exception as e:
        print(f"An error occurred during icon generation: {e}")

if __name__ == '__main__':
    generate_icons()
