import argparse
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# --- Running Philosophies ---
RUNNING_PHILOSOPHIES = {
    "The Gentle Start": "This philosophy is for those new to running. It focuses on building a consistent habit and enjoying the process. The plan will gradually increase in duration and intensity, with a mix of running and walking to ease you into it. The key is to listen to your body and not push too hard too soon.",
    "The Balanced & Motivational": "This philosophy is for runners who want to improve but also maintain a healthy balance with other aspects of life. The plan will include a variety of runs to keep things interesting, with a focus on positive reinforcement and celebrating small wins. It's about making running a sustainable and enjoyable part of your lifestyle.",
    "Train Smarter Not Harder": "This philosophy is for the data-driven runner who wants to maximize their performance efficiently. The plan will focus on quality over quantity, with specific workouts designed to improve your pace and endurance. It will incorporate principles of polarized training, with a mix of high-intensity and low-intensity sessions.",
    "The Performance Push": "This philosophy is for the experienced runner who is ready to push their limits and achieve a new personal best. The plan will be challenging and demanding, with a high volume of running and intense workouts. It's designed to get you to the starting line feeling strong, confident, and ready to race."
}

def call_gemini_api(prompt):
    """
    Calls the Gemini API to generate a training plan.
    """
    print("\n--- CALLING GEMINI API ---")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-pro-latest')
    response = model.generate_content(prompt)
    return response.text

def format_running_workout(day_data):
    print(f"    Intensity: {day_data.get('intensity', 'N/A')}")
    print(f"    RPE Target: {day_data.get('rpe_target', 'N/A')}")
    print(f"    Pace Guidance: {day_data.get('pace_guidance', 'N/A')}")
    if 'warm_up' in day_data and isinstance(day_data['warm_up'], dict):
        print(f"    Warm-up: {day_data['warm_up'].get('duration_mins', 'N/A')} mins - {day_data['warm_up'].get('description', 'N/A')}")
    if 'main_workout' in day_data and isinstance(day_data['main_workout'], dict):
        print(f"    Main Workout: {day_data['main_workout'].get('structure', 'N/A')}")
        if 'key_points' in day_data['main_workout']:
            for point in day_data['main_workout']['key_points']:
                print(f"      - {point}")
    if 'cool_down' in day_data and isinstance(day_data['cool_down'], dict):
        print(f"    Cool-down: {day_data['cool_down'].get('duration_mins', 'N/A')} mins - {day_data['cool_down'].get('description', 'N/A')}")

def format_strength_workout(day_data):
    print(f"    Total Duration: {day_data.get('total_duration', 'N/A')}")
    if 'warm_up' in day_data and isinstance(day_data['warm_up'], dict):
        print(f"    Warm-up: {day_data['warm_up'].get('duration', 'N/A')}")
        for exercise in day_data['warm_up'].get('exercises', []):
            print(f"      - {exercise.get('name', 'N/A')}: {exercise.get('duration', 'N/A')}")
    if 'main_circuit' in day_data and isinstance(day_data['main_circuit'], dict):
        print(f"    Main Circuit: {day_data['main_circuit'].get('rounds', 'N/A')} rounds")
        for exercise in day_data['main_circuit'].get('exercises', []):
            print(f"      - {exercise.get('name', 'N/A')}: {exercise.get('sets', 'N/A')} sets of {exercise.get('reps', 'N/A')}")

def main():
    parser = argparse.ArgumentParser(description="Runna - Your personalized running plan generator.")

    # User Inputs
    parser.add_argument("--sex", type=str, choices=["Male", "Female", "Prefer not to say"], required=True)
    parser.add_argument("--age", type=str, choices=["18-24", "25-34", "35-44", "45-54", "55+"], required=True)
    parser.add_argument("--fitness", type=str, choices=["Just Starting", "Beginner Runner", "Intermediate Runner", "Advanced Runner"], required=True)
    parser.add_argument("--goal", type=str, choices=["Run Faster", "Run Longer", "Stay Fit"], required=True)
    parser.add_argument("--motivation", type=str, help="What's motivating you?")
    parser.add_argument("--target_outcome", type=str, help="Target outcome for 'Run Faster' goal.")
    parser.add_argument("--philosophy", type=str, choices=RUNNING_PHILOSOPHIES.keys(), required=True)
    parser.add_argument("--commitment", type=int, choices=[3, 4, 5], default=4)
    

    args = parser.parse_args()

    # Get the full text of the selected running philosophy
    philosophy_text = RUNNING_PHILOSOPHIES[args.philosophy]

    # Construct the prompt
    prompt = f"""You are an expert running coach generating a personalized, day-by-day training plan for an Indian runner for 2 weeks. Adhere strictly to all principles and rules provided. Use the detailed JSON structures provided.

    **1. User Data:**
    - Age: {args.age}, Sex: {args.sex}
    - Level: {args.fitness}
    - Goal: {args.goal}
    - Motivation: "{args.motivation}" 
    - Target: {args.target_outcome} (if applicable)
    - Commitment: {args.commitment} days/week for 2 weeks.
"""

    **2. Core Philosophy:**
    Your plan MUST be based on the following running philosophy:
    '''
    {philosophy_text}
    '''

    **3. Training Principles to Adhere To:**
    - **Progressive Overload:** Gradually increase the demands on the body over time.
    - **Specificity:** The training should be specific to the user's goal.
    - **Recovery:** Adequate rest is crucial for adaptation and injury prevention.
    - **Pace Zones:** Use the provided pace zones to guide the intensity of the runs.

    **4. Pace Zone Definitions:**
    Use the following pace zones to define the intensity of each run. You can use the user's target outcome to estimate their 5k pace.
    ```json
    {{
      "pace_zones": {{
        "zone_1_recovery": {{
          "description": "Very easy, conversational",
          "pace_calculation": "5K_pace + 90-120 seconds",
          "hr_percentage": "65-75% max HR",
          "rpe": "2-3/10"
        }},
        "zone_2_aerobic": {{
          "description": "Easy, build aerobic base",
          "pace_calculation": "5K_pace + 60-90 seconds", 
          "hr_percentage": "75-85% max HR",
          "rpe": "4-5/10"
        }},
        "zone_3_tempo": {{
          "description": "Comfortably hard, tempo pace",
          "pace_calculation": "5K_pace + 15-30 seconds",
          "hr_percentage": "85-90% max HR", 
          "rpe": "6-7/10"
        }},
        "zone_4_threshold": {{
          "description": "Hard, lactate threshold",
          "pace_calculation": "5K_pace + 0-15 seconds",
          "hr_percentage": "90-95% max HR",
          "rpe": "7-8/10"
        }},
        "zone_5_vo2max": {{
          "description": "Very hard, VO2 max pace",
          "pace_calculation": "5K_pace - 5-10 seconds",
          "hr_percentage": "95-100% max HR",
          "rpe": "9-10/10"
        }}
      }}
    }}
    ```

    **5. Output Format & Structure:**
    Provide the output as a day-by-day schedule in a single JSON object. For each day, provide a JSON object with the specified structure.

    - **Running Day Structure:**
    ```json
    {{
      "workout_type": "Easy Run | Tempo Run | VO2 Max Intervals | Hill Repeats",
      "purpose": "<string>",
      "intensity": "<string>",
      "rpe_target": "<string>",
      "pace_guidance": "<string>",
      "warm_up": {{"duration_mins": <number>, "description": "<string>"}},
      "main_workout": {{"structure": "<string>", "key_points": ["<string>"]}},
      "cool_down": {{"duration_mins": <number>, "description": "<string>"}}
    }}
    ```

    - **Strength Day Structure:**
    ```json
    {{
      "workout_type": "Strength",
      "purpose": "<string>",
      "routine_name": "<string>",
      "total_duration": "<string>",
      "warm_up": {{"duration": "<string>", "exercises": [{{"name": "<string>", "duration": "<string>"}}]}},
      "main_circuit": {{"rounds": <number>, "exercises": [{{"name": "<string>", "sets": "<string>", "reps": "<string>"}}]}}
    }}
    ```

    - **Rest Day Structure:**
    ```json
    {{
      "workout_type": "Rest",
      "purpose": "<string>",
      "optional_activity": "<string>"
    }}
    ```
    """.strip()

    # Call the Gemini API
    api_response = call_gemini_api(prompt)

    # Clean up the response
    if api_response.startswith("```json"):
        api_response = api_response[7:]
    if api_response.endswith("```"):
        api_response = api_response[:-3]

    try:
        training_plan = json.loads(api_response)
    except json.JSONDecodeError as e:
        print("Error decoding JSON from API response:", e)
        print("Raw response:", api_response)
        return

    # Display the training plan
    print("\n--- YOUR PERSONALIZED TRAINING PLAN ---")
    for week, week_data in training_plan.items():
        if week.startswith("week"):
            print(f"\n{week.replace('_', ' ').upper()}:")
            if isinstance(week_data, dict):
                for day, day_data in week_data.items():
                    if day == "weekly_gear_tip":
                        print(f"\n  Weekly Gear Tip: {day_data}")
                        continue
                    print(f"\n  {day.replace('_', ' ').upper()}: {day_data.get('workout_type', 'N/A')} - {day_data.get('purpose', 'N/A')}")
                    if day_data.get('workout_type') == "Strength":
                        format_strength_workout(day_data)
                    elif day_data.get('workout_type') != "Rest":
                        format_running_workout(day_data)
                    else:
                        print(f"    Optional Activity: {day_data.get('optional_activity', 'N/A')}")

if __name__ == "__main__":
    main()