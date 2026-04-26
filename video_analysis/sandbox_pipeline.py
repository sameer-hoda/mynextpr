
import os
import sys
import time
import logging
import json
import cv2
import google.generativeai as genai
from PIL import Image

# Add parent directory to path to import run_pipeline
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)
sys.path.append(os.path.join(ROOT_DIR, 'backend')) # database.py is here
import run_pipeline

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Constants
BASE_PROMPT_PATH = os.path.join(ROOT_DIR, "base_prompt.txt")
LOGO_PATH = os.path.join(ROOT_DIR, "mynextpr_logo.png")
MODEL_STEP_1 = "gemini-3-pro-preview"
MODEL_STEP_2 = "gemini-3-pro-image-preview"

MODEL_TIMESTAMP_EXTRACTION = "gemini-3-flash-preview"
TIMESTAMP_MODEL = "gemini-3-flash-preview" 

def get_api_key():
    return run_pipeline.get_api_key()

try:
    from PIL import ImageFont, ImageDraw 
except ImportError:
    import ImageFont, ImageDraw

def add_watermark(image):
    """Adds logo and 'MyNextPR.com' text to the image. Copied from run_pipeline.py"""
    logger.info("Adding watermark...")
    try:
        margin = 40
        padding = 10 
        
        logo = None
        logo_width = 0
        logo_height = 0
        
        if os.path.exists(LOGO_PATH):
            logo = Image.open(LOGO_PATH).convert("RGBA")
            target_width = int(image.width * 0.04)
            aspect_ratio = logo.height / logo.width
            target_height = int(target_width * aspect_ratio)
            logo = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)
            logo_width = target_width
            logo_height = target_height

        draw = ImageDraw.Draw(image)
        try:
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
        
        text_x = image.width - margin - text_width
        text_y = image.height - margin - text_height
        
        if logo:
            logo_x = image.width - margin - logo_width
            logo_y = text_y - padding - logo_height
            image.paste(logo, (logo_x, logo_y), logo)
        
        shadow_offset = int(image.width * 0.003) + 1
        shadow_color = (0, 0, 0)
        text_color = (255, 255, 255)
        
        for off_x in range(-shadow_offset, shadow_offset + 1):
            for off_y in range(-shadow_offset, shadow_offset + 1):
                 draw.text((text_x + off_x, text_y + off_y), text, font=font, fill=shadow_color)

        draw.text((text_x, text_y), text, font=font, fill=text_color)
        
    except Exception as e:
        logger.error(f"Error adding watermark: {e}")
    
    return image

def process_frame_locally(frame_path, base_prompt):
    """
    Runs Step 1 and Step 2 locally to capture intermediate text.
    Returns: (generated_image_bytes, analysis_text)
    """
    logger.info(f"Processing frame locally: {frame_path}")
    
    with open(frame_path, "rb") as f:
        input_image = Image.open(f)
        input_image.load()
        
    # Step 1: Analysis
    logger.info("--- Step 1: Analysis ---")
    model_1 = genai.GenerativeModel(MODEL_STEP_1)
    step1_prompt = base_prompt + "\n\nCRITICAL INSTRUCTION: First, determine if the image contains a person running or in a running pose. If NO runner is detected, or if the image is of an object, animal, or non-running scene, output EXACTLY the string 'ERROR: NO_RUNNER_DETECTED'. Otherwise, proceed with the detailed analysis prompt generation."
    
    response_1 = model_1.generate_content([step1_prompt, input_image])
    analysis_text = response_1.text
    
    if "ERROR: NO_RUNNER_DETECTED" in analysis_text:
        raise ValueError("NO_RUNNER_DETECTED")
        
    logger.info("Step 1 Analysis Complete.")

    # Step 2: Generation
    logger.info("--- Step 2: Generation ---")
    model_2 = genai.GenerativeModel(MODEL_STEP_2)
    final_prompt = analysis_text + "\n\nIMPORTANT: The output image MUST be a full rectangular frame. DO NOT create an oval, circular, or vignette effect. The blueprint background must fill the entire rectangular canvas."
    
    response_2 = model_2.generate_content([final_prompt, input_image])
    
    generated_image = None
    if hasattr(response_2, 'parts'):
        for part in response_2.parts:
             if hasattr(part, 'inline_data') and part.inline_data:
                 img_data = part.inline_data.data
                 generated_image = Image.open(io.BytesIO(img_data))
                 break
    
    if not generated_image:
        raise RuntimeError("No image generated in Step 2.")

    # Post-processing (Background composite & Watermark)
    blueprint_bg_color = (30, 58, 104) 
    background = Image.new("RGBA", generated_image.size, blueprint_bg_color + (255,))
    generated_image = generated_image.convert("RGBA")
    background.alpha_composite(generated_image)
    generated_image = background.convert("RGB")
    generated_image = add_watermark(generated_image)
    
    output_buffer = io.BytesIO()
    generated_image.save(output_buffer, format="PNG")
    
    return output_buffer.getvalue(), analysis_text

def synthesize_final_report(all_analyses, sample_frame_path):
    """
    Step 3: Synthesizes multiple analysis reports into one final blueprint.
    """
    logger.info("--- Step 3: Synthesis ---")
    
    combined_text = "\n\n=== NEXT REPORT ===\n\n".join(all_analyses)
    
    synthesis_prompt = f"""
    You are the Chief Biomechanics Auditor. You have received {len(all_analyses)} forensic reports from different phases of a single runner's gait cycle.
    
    Here are the reports:
    {combined_text}
    
    YOUR TASK:
    Synthesize these reports into ONE single, holistic Master Blueprint Prompt for this runner.
    
    1. Identify the most critical, recurring faults across the reports (e.g. if 'Heel Strike' appears in 2 reports, it's a confirmed issue).
    2. Ignore minor transient issues that only appeared once unless severe.
    3. create a final image generation prompt following the EXACT same format as the input reports (Vintage Engineering Blueprint).
    4. The annotations should be simple instructions on what to fix.
    
    OUTPUT FORMAT:
    Produce ONLY the raw prompt text for the image generator. Start with "[Beginning of Prompt]" as usual.
    """
    
    # Use one of the frames as reference for the visual style/pose context if needed, 
    # but the prompt asks for a synthesis. We'll pass the sample frame to guide the visual style 
    # of the runner (so the generated runner looks like the user).
    
    model_synth = genai.GenerativeModel(MODEL_STEP_1) # Use Pro for text synthesis logic
    logger.info("Generating synthesis prompt...")
    response_synth = model_synth.generate_content([synthesis_prompt])
    final_prompt_text = response_synth.text
    logger.info("Synthesis Prompt Generated.")
    
    # Generate Final Image
    logger.info("Generating Final Synthesized Blueprint...")
    model_image = genai.GenerativeModel(MODEL_STEP_2)
    
    # We use the sample frame as the image input so the generated blueprint looks like the runner,
    # even though the prompts are synthesized from multiple angles.
    with open(sample_frame_path, "rb") as f:
        sample_image = Image.open(f)
        
    response_final = model_image.generate_content([final_prompt_text, sample_image])
    
    generated_image = None
    if hasattr(response_final, 'parts'):
        for part in response_final.parts:
             if hasattr(part, 'inline_data') and part.inline_data:
                 img_data = part.inline_data.data
                 generated_image = Image.open(io.BytesIO(img_data))
                 break
                 
    if not generated_image:
        raise RuntimeError("No synthesized image generated.")
        
    # Post-process
    blueprint_bg_color = (30, 58, 104)
    background = Image.new("RGBA", generated_image.size, blueprint_bg_color + (255,))
    generated_image = generated_image.convert("RGBA")
    background.alpha_composite(generated_image)
    generated_image = background.convert("RGB")
    generated_image = add_watermark(generated_image)
    
    return generated_image

import io # Add io import which was missing in original snippet/scope if not careful

def main():
    api_key = get_api_key()
    if not api_key:
        logger.error("No API Key found.")
        return
    genai.configure(api_key=api_key) # Ensure configured

    # Read Base Prompt
    try:
        with open(BASE_PROMPT_PATH, "r") as f:
            base_prompt = f.read()
    except Exception as e:
        logger.error(f"Could not read base prompt at {BASE_PROMPT_PATH}: {e}")
        return

    # 1. Find a video to process
    videos = [f for f in os.listdir(VIDEO_ANALYSIS_DIR) if f.endswith(('.mp4', '.mov'))]
    if not videos:
        logger.error("No videos found in video_analysis folder.")
        return
        
    input_video = os.path.join(VIDEO_ANALYSIS_DIR, videos[0])
    logger.info(f"Processing video: {input_video}")
    
    # 2. Step 0: Downscale
    downscaled_video = os.path.join(OUTPUT_DIR, "temp_downscaled.mp4")
    try:
        downscale_video(input_video, downscaled_video)
    except Exception as e:
        logger.error(f"Downscaling failed: {e}")
        downscaled_video = input_video 

    # 3. Step 0: Get Timestamps
    try:
        timestamps = extract_timestamps(downscaled_video, api_key)
        logger.info(f"Target Timestamps: {timestamps}")
    except Exception as e:
        logger.error(f"Timestamp extraction failed: {e}")
        return

    # 4. Extract Frames
    frames = extract_frames(input_video, timestamps, OUTPUT_DIR)
    
    # 5. Process Frames & Collect Text
    all_analyses_text = []
    
    for frame_path in frames:
        logger.info(f"Processing frame: {frame_path}")
        try:
            image_bytes, analysis_text = process_frame_locally(frame_path, base_prompt)
            all_analyses_text.append(analysis_text)
            
            # Save result
            output_filename = f"analyzed_{os.path.basename(frame_path)}.png"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            with open(output_path, "wb") as f:
                f.write(image_bytes)
            logger.info(f"Saved analysis to {output_path}")
            
        except Exception as e:
            logger.error(f"Error processing frame {frame_path}: {e}")

    # 6. Step 3: Synthesis
    if all_analyses_text:
        try:
            # Use the first frame as the visual reference for the final synthesis
            final_image = synthesize_final_report(all_analyses_text, frames[0])
            
            final_output_path = os.path.join(OUTPUT_DIR, "final_summary_blueprint.png")
            final_image.save(final_output_path)
            logger.info(f"SUCCESS: Final synthesis saved to {final_output_path}")
            
        except Exception as e:
             logger.error(f"Step 3 Synthesis failed: {e}")
    else:
        logger.warning("No analyses collected, skipping synthesis.")

if __name__ == "__main__":
    main()
