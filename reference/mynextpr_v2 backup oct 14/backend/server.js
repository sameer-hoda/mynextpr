// backend/server.js
require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const rateLimit = require('express-rate-limit');
const AIService = require('./services/aiService');
const { validateUserData, sanitizePrompt } = require('./utils/validation');
const { validateWorkoutSchema, validatePlanSchema } = require('./services/dataValidation');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'runna.db');

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 AI generation requests per hour
  message: 'Too many AI generation requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Add debug logging for rate limiting
  skip: (req, res) => {
    console.log('[RATE LIMIT DEBUG] Request received for path:', req.path);
    console.log('[RATE LIMIT DEBUG] Request IP:', req.ip);
    return false; // Don't skip, apply rate limiting
  }
});

// Middleware
app.use(cors({
  origin: true, // Allow all origins for development, specify for production
  credentials: true
}));
app.use(limiter); // Apply general rate limiting
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Initialize SQLite database
let db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    
    // Create tables if they don't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        display_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        coach_persona TEXT NOT NULL,
        age TEXT NOT NULL,
        sex TEXT NOT NULL,
        fitness_level TEXT NOT NULL,
        goal_distance TEXT NOT NULL,
        goal_time TEXT,
        plan_overview TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        day INTEGER NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0,
        scheduled_date TEXT,
        duration_minutes REAL,
        distance_km REAL,
        rating INTEGER,
        user_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        warmup TEXT,
        main_set TEXT,
        cooldown TEXT
      )
    `);

    // Create indexes for better performance
    db.run("CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);");
    db.run("CREATE INDEX IF NOT EXISTS idx_workouts_completed ON workouts(completed);");
    db.run("CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);");
    
    console.log('Database tables created/verified');
  }
});

// Initialize AI Service
let aiService = null;
try {
  aiService = new AIService();
  console.log('AI Service initialized successfully');
} catch (error) {
  console.error('Failed to initialize AI Service:', error.message);
  console.error('AI features will be disabled. The app will still work with fallback data.');
}

// API Routes

// Profiles
app.get('/api/profiles/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.get(
    'SELECT * FROM profiles WHERE user_id = ?', 
    [userId], 
    (err, row) => {
      if (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row);
    }
  );
});

app.post('/api/profiles', (req, res) => {
  const { user_id, display_name } = req.body;
  
  db.get(
    'SELECT * FROM profiles WHERE user_id = ?', 
    [user_id], 
    (err, row) => {
      if (err) {
        console.error('Error checking profile:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (row) {
        // Update existing profile
        db.run(
          'UPDATE profiles SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [display_name, user_id],
          function(err) {
            if (err) {
              console.error('Error updating profile:', err);
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({ id: row.id, user_id, display_name, updated: this.changes > 0 });
          }
        );
      } else {
        // Create new profile
        const id = generateId();
        db.run(
          'INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)',
          [id, user_id, display_name],
          function(err) {
            if (err) {
              console.error('Error creating profile:', err);
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({ id, user_id, display_name, created: true });
          }
        );
      }
    }
  );
});

// Plans
app.get('/api/plans/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all(
    'SELECT * FROM plans WHERE user_id = ? ORDER BY created_at DESC', 
    [userId], 
    (err, rows) => {
      if (err) {
        console.error('Error fetching plans:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.post('/api/plans', (req, res) => {
  const { user_id, coach_persona, age, sex, fitness_level, goal_distance, goal_time, plan_overview } = req.body;
  const id = generateId();
  
  db.run(
    `INSERT INTO plans (id, user_id, coach_persona, age, sex, fitness_level, goal_distance, goal_time, plan_overview) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, user_id, coach_persona, age, sex, fitness_level, goal_distance, goal_time, plan_overview],
    function(err) {
      if (err) {
        console.error('Error creating plan:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        id, user_id, coach_persona, age, sex, fitness_level, goal_distance, goal_time, plan_overview,
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      });
    }
  );
});

// Workouts
app.get('/api/workouts/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all(
    'SELECT * FROM workouts WHERE user_id = ? ORDER BY day ASC', 
    [userId], 
    (err, rows) => {
      if (err) {
        console.error('Error fetching workouts:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.get('/api/workouts/completed/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all(
    'SELECT * FROM workouts WHERE user_id = ? AND completed = 1 ORDER BY scheduled_date DESC', 
    [userId], 
    (err, rows) => {
      if (err) {
        console.error('Error fetching completed workouts:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.post('/api/workouts', (req, res) => {
  const { 
    plan_id, user_id, day, title, type, description, completed, scheduled_date,
    duration_minutes, distance_km, rating, user_notes, warmup, main_set, cooldown
  } = req.body;
  
  const id = generateId();
  
  db.run(
    `INSERT INTO workouts (
      id, plan_id, user_id, day, title, type, description, completed, 
      scheduled_date, duration_minutes, distance_km, rating, user_notes, 
      warmup, main_set, cooldown
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, plan_id, user_id, day, title, type, description, completed || 0, 
      scheduled_date, duration_minutes, distance_km, rating, user_notes, 
      warmup, main_set, cooldown
    ],
    function(err) {
      if (err) {
        console.error('Error creating workout:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        id, plan_id, user_id, day, title, type, description, completed: completed || 0, 
        scheduled_date, duration_minutes, distance_km, rating, user_notes, 
        warmup, main_set, cooldown,
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      });
    }
  );
});

app.put('/api/workouts/:workoutId', (req, res) => {
  const workoutId = req.params.workoutId;
  const updates = req.body;
  
  // Build dynamic update query
  const updateFields = Object.keys(updates).filter(key => 
    !['id', 'created_at', 'updated_at'].includes(key)
  );
  const updateValues = updateFields.map(key => updates[key]);
  const updateClause = updateFields.map(key => `${key} = ?`).join(', ');
  
  updateValues.push(new Date().toISOString()); // updated_at
  updateValues.push(workoutId); // id for WHERE clause
  
  db.run(
    `UPDATE workouts SET ${updateClause}, updated_at = ? WHERE id = ?`,
    updateValues,
    function(err) {
      if (err) {
        console.error('Error updating workout:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ updated: this.changes > 0, workoutId });
    }
  );
});

// API endpoint to reset user data
app.delete('/api/reset-user-data', (req, res) => {
  // Check if user is authenticated
  if (!req.isAuthenticated || !req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  
  const userId = req.user.id;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID not found in session' });
  }
  
  // Delete all user data from profiles, plans, and workouts tables
  db.serialize(() => {
    // First, delete workouts for the user
    db.run('DELETE FROM workouts WHERE user_id = ?', [userId], function(err) {
      if (err) {
        console.error('Error deleting workouts:', err);
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`Deleted ${this.changes} workouts for user ${userId}`);
      
      // Then, delete plans for the user
      db.run('DELETE FROM plans WHERE user_id = ?', [userId], function(err) {
        if (err) {
          console.error('Error deleting plans:', err);
          return res.status(500).json({ error: err.message });
        }
        
        console.log(`Deleted ${this.changes} plans for user ${userId}`);
        
        // Finally, update the profile (but don't delete it to maintain user record)
        db.run('UPDATE profiles SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', 
          [req.user.displayName || 'User', userId], 
          function(err) {
            if (err) {
              console.error('Error updating profile:', err);
              return res.status(500).json({ error: err.message });
            }
            
            console.log(`Updated profile for user ${userId}`);
            
            res.json({ 
              success: true, 
              message: 'User data reset successfully',
              deletedWorkouts: this.changes,
              userId: userId
            });
          }
        );
      });
    });
  });
});

// API endpoint to generate plan using AI
app.post('/api/generate-plan', aiLimiter, async (req, res) => {
  console.log('[DEBUG] Generate-plan endpoint called');
  
  // Check if user is authenticated
  if (!req.isAuthenticated || !req.user) {
    console.log('[DEBUG] User not authenticated');
    return res.status(401).json({ error: 'User not authenticated' });
  }
  console.log('[DEBUG] User authenticated successfully');
  
  const userId = req.user.id;
  
  if (!userId) {
    console.log('[DEBUG] User ID not found in session');
    return res.status(400).json({ error: 'User ID not found in session' });
  }
  console.log(`[DEBUG] User ID: ${userId}`);
  
  const userData = {
    ...req.body,
    user_id: userId  // Ensure user ID is included
  };
  console.log('[DEBUG] Raw request body:', req.body);
  console.log('[DEBUG] Final userData:', userData);
  
  try {
    console.log('[DEBUG] Starting user data validation');
    // Validate user data
    const validation = validateUserData(userData);
    console.log('[DEBUG] Validation result:', validation);
    
    if (!validation.isValid) {
      console.log('[DEBUG] Validation failed with errors:', validation.errors);
      return res.status(400).json({ 
        error: 'Invalid input data', 
        details: validation.errors 
      });
    }
    console.log('[DEBUG] User data validation passed');
    
    // Sanitize any text inputs
    if (userData.coach_persona) {
      console.log('[DEBUG] Sanitizing coach persona:', userData.coach_persona);
      userData.coach_persona = sanitizePrompt(userData.coach_persona);
      console.log('[DEBUG] Sanitized coach persona:', userData.coach_persona);
    }
    
    console.log(`[DEBUG] Generating plan for user ${userId} with goal: ${userData.goal_distance}`);
    
    // Check if AI service is available
    console.log(`[DEBUG] AI service status: ${aiService ? 'available' : 'not available'}`);
    
    if (!aiService) {
      console.warn('[DEBUG] AI service not available, using fallback plan');
      // Generate a basic fallback plan
      const fallbackPlan = {
        plan_overview: `Your personalized ${userData.goal_distance} training plan`,
        workouts: [
          {
            day: 1,
            title: "Easy Recovery Run",
            type: "easy_run",
            description: "Gentle pace to recover from weekend long run. Focus on form and breathing.",
            warmup: "5 min easy jog",
            main_set: "20 min easy pace",
            cooldown: "5 min easy jog",
            duration_minutes: 30,
            distance_km: 5,
            user_id: userId,
            plan_id: generateId(),
            completed: false,
            scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0]
          },
          {
            day: 2,
            title: "Speed Intervals",
            type: "intervals",
            description: "8x400m at 5K pace with 90s recovery. Warm up 10 min, cool down 10 min.",
            warmup: "10 min easy jog",
            main_set: "8x400m at 5K pace with 90s recovery",
            cooldown: "10 min easy jog",
            duration_minutes: 45,
            distance_km: 8,
            user_id: userId,
            plan_id: generateId(),
            completed: false,
            scheduled_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
          }
          // Add more fallback workouts as needed
        ]
      };
      
      // Save the plan to the database
      const planId = generateId();
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO plans (id, user_id, coach_persona, age, sex, fitness_level, goal_distance, goal_time, plan_overview) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            planId, 
            userId, 
            userData.coach_persona || 'Balanced', 
            userData.age, 
            userData.sex, 
            userData.fitness_level, 
            userData.goal_distance, 
            userData.goal_time || null, 
            fallbackPlan.plan_overview
          ],
          function(err) {
            if (err) {
              console.error('Error creating plan:', err);
              reject(err);
              return;
            }
            
            // Save workouts to the database
            let workoutsSaved = 0;
            fallbackPlan.workouts.forEach((workout, index) => {
              db.run(
                `INSERT INTO workouts (
                  id, plan_id, user_id, day, title, type, description, completed, 
                  scheduled_date, duration_minutes, distance_km, rating, user_notes, 
                  warmup, main_set, cooldown
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  generateId(), // id
                  planId, // plan_id
                  workout.user_id, // user_id
                  workout.day, // day
                  workout.title, // title
                  workout.type, // type
                  workout.description, // description
                  workout.completed || 0, // completed
                  workout.scheduled_date, // scheduled_date
                  workout.duration_minutes, // duration_minutes
                  workout.distance_km, // distance_km
                  workout.rating || null, // rating
                  workout.user_notes || null, // user_notes
                  workout.warmup, // warmup
                  workout.main_set, // main_set
                  workout.cooldown // cooldown
                ],
                function(err) {
                  if (err) {
                    console.error('Error creating workout:', err);
                    reject(err);
                    return;
                  }
                  
                  workoutsSaved++;
                  if (workoutsSaved === fallbackPlan.workouts.length) {
                    console.log(`[DEBUG] Saved ${workoutsSaved} fallback workouts for user ${userId}`);
                    resolve();
                  }
                }
              );
            });
          }
        );
      });
      
      return res.json({
        success: true,
        plan: fallbackPlan,
        message: 'Plan generated successfully using fallback data'
      });
    }
    
    // Use AI service to generate the plan
    console.log("[DEBUG] Calling AI service with user data:", userData);
    const planData = await aiService.generatePlan(userData);
    console.log("[DEBUG] AI service returned plan data successfully");
    
    // Validate the generated plan against our schema
    const planValidation = validatePlanSchema({
      user_id: userId,
      coach_persona: userData.coach_persona,
      age: userData.age,
      sex: userData.sex,
      fitness_level: userData.fitness_level,
      goal_distance: userData.goal_distance,
      goal_time: userData.goal_time,
      plan_overview: planData.plan_overview
    });
    
    if (!planValidation.isValid) {
      console.error('Generated plan failed validation:', planValidation.errors);
      return res.status(500).json({ 
        error: 'Generated plan failed validation', 
        details: planValidation.errors 
      });
    }
    
    // Save the plan to the database
    const planId = generateId();
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO plans (id, user_id, coach_persona, age, sex, fitness_level, goal_distance, goal_time, plan_overview) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          planId, 
          userId, 
          userData.coach_persona || 'Balanced', 
          userData.age, 
          userData.sex, 
          userData.fitness_level, 
          userData.goal_distance, 
          userData.goal_time || null, 
          planData.plan_overview
        ],
        function(err) {
          if (err) {
            console.error('Error creating plan:', err);
            reject(err);
            return;
          }
          
          console.log(`Created plan with ID: ${planId} for user: ${userId}`);
          
          // Save workouts to the database
          let workoutsSaved = 0;
          planData.workouts.forEach((workout, index) => {
            // Validate each workout
            const workoutValidation = validateWorkoutSchema({
              ...workout,
              plan_id: planId,
              user_id: userId
            });
            
            if (!workoutValidation.isValid) {
              console.warn(`Workout at index ${index} failed validation:`, workoutValidation.errors);
              // Skip invalid workouts but continue with others
              workoutsSaved++;
              if (workoutsSaved === planData.workouts.length) {
                resolve();
              }
              return;
            }
            
            db.run(
              `INSERT INTO workouts (
                id, plan_id, user_id, day, title, type, description, completed, 
                scheduled_date, duration_minutes, distance_km, rating, user_notes, 
                warmup, main_set, cooldown
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateId(), // id
                planId, // plan_id
                workout.user_id, // user_id
                workout.day, // day
                workout.title, // title
                workout.type, // type
                workout.description, // description
                workout.completed || 0, // completed
                workout.scheduled_date || null, // scheduled_date
                workout.duration_minutes, // duration_minutes
                workout.distance_km, // distance_km
                workout.rating || null, // rating
                workout.user_notes || null, // user_notes
                workout.warmup, // warmup
                workout.main_set, // main_set
                workout.cooldown // cooldown
              ],
              function(err) {
                if (err) {
                  console.error('Error creating workout:', err);
                  reject(err);
                  return;
                }
                
                workoutsSaved++;
                if (workoutsSaved === planData.workouts.length) {
                  console.log(`Saved ${workoutsSaved} workouts for user ${userId}`);
                  resolve();
                }
              }
            );
          });
          
          // Handle case where no workouts needed saving
          if (planData.workouts.length === 0) {
            resolve();
          }
        }
      );
    });
    
    res.json({
      success: true,
      plan: planData,
      message: 'Plan generated and saved successfully'
    });
    
  } catch (error) {
    console.error('Error generating plan:', error);
    
    // Log more detailed error information
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userData: userData
    });
    
    res.status(500).json({ 
      error: 'Failed to generate plan', 
      details: error.message 
    });
  }
});

// Helper function to generate unique IDs
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Check for required environment variables
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.error('ERROR: Missing Google OAuth environment variables.');
  console.error('Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.');
  process.exit(1);
}

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: googleClientId,
  clientSecret: googleClientSecret,
  callbackURL: "/auth/google/callback"
},
function(accessToken, refreshToken, profile, done) {
  // Create or update user in database
  const userId = profile.id; // Google's user ID
  const displayName = profile.displayName || profile.name.givenName || 'User';
  
  // Check if user already exists in profiles table
  db.get(
    'SELECT * FROM profiles WHERE user_id = ?', 
    [userId], 
    (err, row) => {
      if (err) {
        console.error('Error checking profile:', err);
        return done(err, null);
      }
      
      if (row) {
        // User exists, update their profile if needed
        db.run(
          'UPDATE profiles SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [displayName, userId],
          function(err) {
            if (err) {
              console.error('Error updating profile:', err);
              return done(err, null);
            }
            return done(null, { 
              id: userId, 
              displayName: displayName,
              email: profile.emails ? profile.emails[0].value : null,
              avatar: profile.photos ? profile.photos[0].value : null
            });
          }
        );
      } else {
        // Create new user profile
        const id = generateId();
        db.run(
          'INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)',
          [id, userId, displayName],
          function(err) {
            if (err) {
              console.error('Error creating profile:', err);
              return done(err, null);
            }
            return done(null, { 
              id: userId, 
              displayName: displayName,
              email: profile.emails ? profile.emails[0].value : null,
              avatar: profile.photos ? profile.photos[0].value : null
            });
          }
        );
      }
    }
  );
}
));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Google OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to frontend
    // Since the frontend is running on 8080, we'll redirect there directly
    res.redirect('http://localhost:8080/coach-selection');
  }
);

// Route to get current user session
app.get('/auth/me', (req, res) => {
  if (req.isAuthenticated && req.user) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Route to logout
app.post('/auth/logout', (req, res) => {
  if (req.logout) {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Could not log out' });
      }
      res.json({ success: true });
    });
  } else {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Could not log out' });
      }
      res.clearCookie('connect.sid'); // Clear session cookie
      res.json({ success: true });
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database file located at: ${DB_PATH}`);
  console.log(`Google OAuth callback URL: http://localhost:${PORT}/auth/google/callback`);
});