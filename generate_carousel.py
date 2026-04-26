import os
import glob
from run_pipeline import process_image

# Mapping of original files to target carousel names
# We use the files we know exist in input_images
IMAGE_MAPPING = [
    ("input_images/3e1ed02a-61dd-40f6-9bab-2d18ea2a83c9_915971d7.jpg", "image1"),
    ("input_images/WhatsApp Image 2026-01-17 at 18.02.05.jpeg", "image2"),
    ("input_images/WhatsApp Image 2026-01-17 at 18.02.06 (2).jpeg", "image3"),
    ("input_images/mumk8134-original-2.jpeg", "image4"),
    ("input_images/nupur-1.jpeg", "image5")
]

OUTPUT_DIR = "mynextpr-544b6987/public/carousel"

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    for input_path, base_name in IMAGE_MAPPING:
        print(f"Processing {input_path} -> {base_name}_blueprint.png...")
        
        if not os.path.exists(input_path):
            print(f"Error: Input file {input_path} not found.")
            continue

        try:
            with open(input_path, "rb") as f:
                input_bytes = f.read()
            
            # Generate blueprint
            output_bytes = process_image(input_bytes)
            
            # Save blueprint
            output_path = os.path.join(OUTPUT_DIR, f"{base_name}_blueprint.png")
            with open(output_path, "wb") as f:
                f.write(output_bytes)
            
            print(f"Successfully saved {output_path}")
            
        except Exception as e:
            print(f"Failed to process {input_path}: {e}")

if __name__ == "__main__":
    main()
