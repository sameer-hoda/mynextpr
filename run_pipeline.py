import os
import time
import glob
import google.generativeai as genai
from PIL import Image
import logging
import datetime

# 1. Setup & Configuration
import io
import base64
from PIL import Image, ImageDraw, ImageFont

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# 1. Setup & Configuration
BASE_PROMPT_FILE = "base_prompt.txt"
LOGO_PATH = "mynextpr_logo.png"

# Models as specified by user
MODEL_STEP_1 = "gemini-3-pro-preview" # Upgraded for logic
MODEL_STEP_2 = "gemini-3-pro-image-preview"

# Helper to read API key
def get_api_key():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEY='):
                        api_key = line.strip().split('=', 1)[1].strip('"')
                        break
        except Exception:
            pass
    return api_key

def add_watermark(image):
    """Adds logo and 'MyNextPR.com' text to the image."""
    logger.info("Adding watermark...")
    try:
        margin = 40
        padding = 10 # Space between logo and text
        
        # 1. Load and Resize Logo
        logo = None
        logo_width = 0
        logo_height = 0
        
        if os.path.exists(LOGO_PATH):
            logo = Image.open(LOGO_PATH).convert("RGBA")
            # Resize logo to 4% of image width
            target_width = int(image.width * 0.04)
            aspect_ratio = logo.height / logo.width
            target_height = int(target_width * aspect_ratio)
            logo = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)
            logo_width = target_width
            logo_height = target_height
        else:
            logger.warning(f"Logo not found at {LOGO_PATH}")

        # 2. Prepare Text
        draw = ImageDraw.Draw(image)
        try:
            # Smaller font: 3% of image width
            font_size = int(image.width * 0.03) 
            try:
                font = ImageFont.truetype("/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf", font_size)
            except IOError:
                try:
                    font = ImageFont.truetype("Arial Bold.ttf", font_size)
                except IOError:
                     font = ImageFont.truetype("Arial.ttf", font_size)
        except IOError:
            font = ImageFont.load_default()
            
        text = "MyNextPR.com"
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        # 3. Calculate Positions (Stacked Bottom-Right)
        # Text at bottom-right
        text_x = image.width - margin - text_width
        text_y = image.height - margin - text_height
        
        # Logo above text
        if logo:
            # Right align logo to the margin
            logo_x = image.width - margin - logo_width
            logo_y = text_y - padding - logo_height
            
            image.paste(logo, (logo_x, logo_y), logo)
        
        # 4. Draw Text
        # Draw text with shadow
        shadow_offset = int(image.width * 0.003) + 1
        shadow_color = (0, 0, 0)
        text_color = (255, 255, 255)
        
        for off_x in range(-shadow_offset, shadow_offset + 1):
            for off_y in range(-shadow_offset, shadow_offset + 1):
                 draw.text((text_x + off_x, text_y + off_y), text, font=font, fill=shadow_color)

        draw.text((text_x, text_y), text, font=font, fill=text_color)
        logger.info("Watermark added successfully.")
        
    except Exception as e:
        logger.error(f"Error adding watermark: {e}")
    
    return image

import database

def process_image(input_image_bytes, request_id):
    """
    Processes the input image bytes through the 2-step pipeline.
    Returns the generated image as bytes (PNG).
    """
    start_time = time.time()
    logger.info(f"Starting image processing pipeline for {request_id}...")
    
    api_key = get_api_key()
    if not api_key:
        logger.error("GEMINI_API_KEY not found.")
        database.log_attempt_error(request_id, "INIT", "GEMINI_API_KEY not found")
        raise ValueError("GEMINI_API_KEY not found.")

    genai.configure(api_key=api_key)

    # Load Input Image
    try:
        input_image = Image.open(io.BytesIO(input_image_bytes))
        logger.info(f"Input image loaded. Size: {input_image.size}")
    except Exception as e:
        logger.error(f"Invalid image data: {e}")
        database.log_attempt_error(request_id, "IMAGE_LOAD", str(e))
        raise ValueError(f"Invalid image data: {e}")

    # Read Base Prompt
    try:
        with open(BASE_PROMPT_FILE, "r") as f:
            base_prompt_text = f.read()
    except Exception as e:
        logger.error(f"Error reading base prompt: {e}")
        database.log_attempt_error(request_id, "PROMPT_READ", str(e))
        raise ValueError(f"Error reading base prompt: {e}")

    # Step 1: Analysis
    logger.info(f"--- Step 1: Analysis with {MODEL_STEP_1} ---")
    step1_start = time.time()
    try:
        model_1 = genai.GenerativeModel(MODEL_STEP_1)
        # Add explicit instruction to detect if it's a runner
        step1_prompt = base_prompt_text + "\n\nCRITICAL INSTRUCTION: First, determine if the image contains a person running or in a running pose. If NO runner is detected, or if the image is of an object, animal, or non-running scene, output EXACTLY the string 'ERROR: NO_RUNNER_DETECTED'. Otherwise, proceed with the detailed analysis prompt generation."
        
        response_1 = model_1.generate_content([step1_prompt, input_image])
        generated_prompt = response_1.text
        
        if "ERROR: NO_RUNNER_DETECTED" in generated_prompt:
             logger.warning("Step 1: No runner detected.")
             database.log_attempt_error(request_id, "STEP_1", "NO_RUNNER_DETECTED")
             raise ValueError("NO_RUNNER_DETECTED")
             
        logger.info(f"Step 1 Prompt Generated. Duration: {time.time() - step1_start:.2f}s")
        database.update_attempt_status(request_id, "STEP1_COMPLETE")
        
    except ValueError as ve:
        raise ve # Re-raise known error
    except Exception as e:
        logger.error(f"Step 1 Failed: {e}")
        database.log_attempt_error(request_id, "STEP_1", str(e))
        raise RuntimeError(f"Step 1 Failed: {e}")

    # Step 2: Generation
    logger.info(f"--- Step 2: Generation with {MODEL_STEP_2} ---")
    step2_start = time.time()
    try:
        model_2 = genai.GenerativeModel(MODEL_STEP_2)
        # Force anti-oval constraint
        final_prompt = generated_prompt + "\n\nIMPORTANT: The output image MUST be a full rectangular frame. DO NOT create an oval, circular, or vignette effect. The blueprint background must fill the entire rectangular canvas."
        response_2 = model_2.generate_content([final_prompt, input_image])
        
        generated_image = None
        
        if hasattr(response_2, 'parts'):
            for part in response_2.parts:
                 if hasattr(part, 'inline_data') and part.inline_data:
                     img_data = part.inline_data.data
                     generated_image = Image.open(io.BytesIO(img_data))
                     break
        
        if not generated_image:
            logger.error("No image found in parts.")
            if hasattr(response_2, 'candidates') and response_2.candidates:
                logger.error(f"Finish Reason: {response_2.candidates[0].finish_reason}")
                logger.error(f"Safety Ratings: {response_2.candidates[0].safety_ratings}")
            database.log_attempt_error(request_id, "STEP_2", "No image generated")
            raise RuntimeError("No image generated in Step 2.")
            
        logger.info(f"Step 2 Image Generated. Duration: {time.time() - step2_start:.2f}s")
        database.update_attempt_status(request_id, "STEP2_COMPLETE")
            
        # Post-Processing: Composite onto solid background to fix oval cropping
        # Use a standard blueprint blue color
        blueprint_bg_color = (30, 58, 104) # #1E3A68
        
        # Create a solid background image of the same size
        background = Image.new("RGBA", generated_image.size, blueprint_bg_color + (255,))
        
        # Ensure generated image is RGBA
        generated_image = generated_image.convert("RGBA")
        
        # Composite: Paste generated image over background
        # This fills any transparent corners (the oval crop) with the blueprint color
        background.alpha_composite(generated_image)
        generated_image = background.convert("RGB") # Convert back to RGB for saving

        # Add Watermark
        generated_image = add_watermark(generated_image)
        
        # Convert back to bytes
        output_buffer = io.BytesIO()
        generated_image.save(output_buffer, format="PNG")
        
        total_duration = time.time() - start_time
        logger.info(f"Pipeline completed successfully. Total Duration: {total_duration:.2f}s")
        database.update_attempt_status(request_id, "SUCCESS")
        return output_buffer.getvalue()

    except Exception as e:
        logger.error(f"Step 2 Failed: {e}")
        database.log_attempt_error(request_id, "STEP_2", str(e))
        raise RuntimeError(f"Step 2 Failed: {e}")

if __name__ == "__main__":
    # For testing
    pass
