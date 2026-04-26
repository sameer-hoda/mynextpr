from PIL import Image
import os
import glob

CAROUSEL_DIR = "mynextpr-544b6987/public/carousel"
MAX_WIDTH = 800
QUALITY = 75

def optimize_images():
    print(f"Optimizing images in {CAROUSEL_DIR}...")
    
    # Process both jpg and png
    files = glob.glob(os.path.join(CAROUSEL_DIR, "*.jpg")) + glob.glob(os.path.join(CAROUSEL_DIR, "*.png"))
    
    for file_path in files:
        try:
            img = Image.open(file_path)
            
            # Resize if too big
            if img.width > MAX_WIDTH:
                ratio = MAX_WIDTH / img.width
                new_height = int(img.height * ratio)
                img = img.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)
                print(f"Resized {os.path.basename(file_path)} to {MAX_WIDTH}x{new_height}")
            
            # Save with compression
            # Overwrite the file
            if file_path.lower().endswith(".jpg") or file_path.lower().endswith(".jpeg"):
                img.save(file_path, "JPEG", quality=QUALITY, optimize=True)
            elif file_path.lower().endswith(".png"):
                # For PNG, we can't set quality directly like JPEG, but optimize=True helps
                # Or convert to P mode (palette) to save space if transparency allows, 
                # but let's stick to RGB/RGBA with optimize for safety.
                img.save(file_path, "PNG", optimize=True)
                
            print(f"Optimized {os.path.basename(file_path)}")
            
        except Exception as e:
            print(f"Failed to process {file_path}: {e}")

if __name__ == "__main__":
    optimize_images()
