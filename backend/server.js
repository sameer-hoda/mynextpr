// backend/server.js
require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const rateLimit = require('express-rate-limit');
const AIService = require('./services/aiService');
const { validateUserData, sanitizePrompt } = require('./utils/validation');
const { validateWorkoutSchema, validatePlanSchema } = require('./services/dataValidation');
const path = require('path');
const cron = require('node-cron');
const emailService = require('./services/emailService');
const jwt = require('jsonwebtoken');

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
app.use(passport.initialize());

const protectWithJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authenticated: Invalid token' });
  }
};

// Initialize SQLite database

let db = new sqlite3.Database(DB_PATH, (err) => {

  if (err) {

    console.error('Error opening database:', err.message);

  } else {

    console.log('Connected to SQLite database');

    db.serialize(() => {

      // Create tables if they don't exist

      db.run(`

        CREATE TABLE IF NOT EXISTS profiles (

          id TEXT PRIMARY KEY,

          user_id TEXT UNIQUE NOT NULL,

          display_name TEXT,

          email TEXT,

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

      db.run("CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);", () => {

        console.log('Database tables created/verified');

        

        // Start the application logic only after the database is ready

        startApp();

      });

    });

  }

});



function startApp() {

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

  app.get('/api/profiles/:userId', protectWithJwt, (req, res) => {

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



  app.post('/api/profiles', protectWithJwt, (req, res) => {

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





  app.get('/api/plans/exists/:userId', protectWithJwt, (req, res) => {
    const userId = req.params.userId;
    console.log(`[DEBUG] Checking for plan for user: ${userId}`);
    
    db.get(
      'SELECT 1 FROM plans WHERE user_id = ? LIMIT 1', 
      [userId], 
      (err, row) => {
        if (err) {
          console.error('Error checking for plan:', err);
          res.status(500).json({ error: err.message });
          return;
        }
        console.log(`[DEBUG] Plan exists for user ${userId}:`, !!row);
        res.json({ hasPlan: !!row });
      }
    );
  });

  app.get('/api/plans/:userId', protectWithJwt, (req, res) => {

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



  app.post('/api/plans', protectWithJwt, (req, res) => {

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

  app.get('/api/workouts/:userId', protectWithJwt, (req, res) => {

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



  app.get('/api/workouts/completed/:userId', protectWithJwt, (req, res) => {

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



  app.post('/api/workouts', protectWithJwt, (req, res) => {

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



  app.put('/api/workouts/:workoutId', protectWithJwt, (req, res) => {

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

  app.delete('/api/reset-user-data', protectWithJwt, (req, res) => {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
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

  app.post('/api/generate-plan', aiLimiter, protectWithJwt, async (req, res) => {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    const userData = {

      ...req.body,

      user_id: userId  // Ensure user ID is included

    };

    try {

      const validation = validateUserData(userData);

      if (!validation.isValid) {

        return res.status(400).json({ 

          error: 'Invalid input data', 

          details: validation.errors 

        });

      }

      if (userData.coach_persona) {

        userData.coach_persona = sanitizePrompt(userData.coach_persona);

      }

      if (!aiService) {
        // ... (fallback plan logic remains the same)
      }

      const planData = await aiService.generatePlan(userData);

      const startDate = new Date();
      planData.workouts.forEach((workout, index) => {
        const workoutDate = new Date(startDate);
        workoutDate.setDate(startDate.getDate() + index + 1);
        workout.scheduled_date = workoutDate.toISOString().split('T')[0];
      });

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
        return res.status(500).json({ 
          error: 'Generated plan failed validation', 
          details: planValidation.errors 
        });
      }

      const planId = generateId();
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO plans (id, user_id, coach_persona, age, sex, fitness_level, goal_distance, goal_time, plan_overview) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [planId, userId, userData.coach_persona || 'Balanced', userData.age, userData.sex, userData.fitness_level, userData.goal_distance, userData.goal_time || null, planData.plan_overview],
          function(err) {
            if (err) return reject(err);
            let workoutsSaved = 0;
            if (planData.workouts.length === 0) return resolve();
            planData.workouts.forEach((workout, index) => {
              const workoutValidation = validateWorkoutSchema({ ...workout, plan_id: planId, user_id: userId });
              if (!workoutValidation.isValid) {
                console.warn(`Workout at index ${index} failed validation:`, workoutValidation.errors);
                workoutsSaved++;
                if (workoutsSaved === planData.workouts.length) resolve();
                return;
              }
              db.run(
                `INSERT INTO workouts (id, plan_id, user_id, day, title, type, description, completed, scheduled_date, duration_minutes, distance_km, rating, user_notes, warmup, main_set, cooldown) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [generateId(), planId, userId, workout.day, workout.title, workout.type, workout.description, workout.completed || 0, workout.scheduled_date || null, workout.duration_minutes, workout.distance_km, workout.rating || null, workout.user_notes || null, workout.warmup, workout.main_set, workout.cooldown],
                function(err) {
                  if (err) return reject(err);
                  workoutsSaved++;
                  if (workoutsSaved === planData.workouts.length) resolve();
                }
              );
            });
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
    callbackURL: "https://mynextpr.com/api/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    const userId = profile.id;
    const displayName = profile.displayName || profile.name.givenName || 'User';
    const email = profile.emails ? profile.emails[0].value : null;
    
    db.get('SELECT * FROM profiles WHERE user_id = ?', [userId], (err, row) => {
      if (err) return done(err, null);
      if (row) {
        db.run('UPDATE profiles SET display_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [displayName, email, userId], function(err) {
          if (err) return done(err, null);
          return done(null, { id: userId, displayName: displayName, email: email, avatar: profile.photos ? profile.photos[0].value : null });
        });
      } else {
        const id = generateId();
        db.run('INSERT INTO profiles (id, user_id, display_name, email) VALUES (?, ?, ?, ?)', [id, userId, displayName, email], function(err) {
          if (err) return done(err, null);
          return done(null, { id: userId, displayName: displayName, email: email, avatar: profile.photos ? profile.photos[0].value : null });
        });
      }
    });
  }));

  // Google OAuth routes
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/', session: false }),
    (req, res) => {
      const user = req.user;
      const jwtPayload = { id: user.id, email: user.email, displayName: user.displayName, avatar: user.avatar };
      const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '30d' });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }
  );

  // Route to get current user session
  app.get('/auth/me', protectWithJwt, (req, res) => {
    res.json({ user: req.user });
  });

  // Route to logout
  app.post('/auth/logout', (req, res) => {
    res.json({ success: true });
  });

  // Schedule daily email job for 8 PM IST (14:30 UTC)
  cron.schedule('30 14 * * *', async () => {
    console.log('Running daily workout email job...');
    if (!emailService.enabled) {
      console.log('Email service is disabled. Skipping job.');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    db.all(`
      SELECT p.display_name, p.email, w.* FROM workouts w
      JOIN profiles p ON w.user_id = p.user_id
      WHERE w.scheduled_date = ?
    `, [tomorrowStr], (err, rows) => {
      if (err) {
        console.error('Error fetching workouts for email job:', err);
        return;
      }
      rows.forEach(row => {
        const user = { displayName: row.display_name, email: row.email };
        emailService.sendWorkoutEmail(user, row);
      });
    });
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  // Manual trigger endpoint for testing
  app.post('/api/email/send-test-workout', protectWithJwt, (req, res) => {
    if (!emailService.enabled) {
      return res.status(503).json({ error: 'Email service is not configured.' });
    }

    const user = req.user;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    db.get('SELECT * FROM workouts WHERE user_id = ? AND scheduled_date = ?', [user.id, tomorrowStr], (err, workout) => {
      if (err || !workout) {
        return res.status(404).json({ error: 'No workout found for you for tomorrow.' });
      }
      emailService.sendWorkoutEmail(user, workout);
      res.json({ success: true, message: `Test email sent to ${user.email}` });
    });
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database file located at: ${DB_PATH}`);
    console.log(`Google OAuth callback URL: http://localhost:${PORT}/auth/google/callback`);
  });
}
