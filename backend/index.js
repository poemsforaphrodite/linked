import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import OpenAI from 'openai';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { z } from 'zod';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Instead, use Vercel's built-in environment variables
const JWT_SECRET = process.env.JWT_SECRET;

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Update the UserSchema to include profile information
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  info: String
});

const User = mongoose.model('User', UserSchema);

// Remove the separate Profile model
// const Profile = mongoose.model('Profile', ProfileSchema);

// Middleware to protect routes
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }
  try {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Update the profile routes to use the User model instead of Profile
app.post('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { name, info } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, info },
      { new: true }
    );
    res.json({ name: user.name, info: user.info });
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ error: 'Error saving profile' });
  }
});

app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { name, info } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, info },
      { new: true }
    );
    res.json({ name: user.name, info: user.info });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ name: user.name, info: user.info });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// New OpenAI embedding endpoint
app.post('/api/openai/embed', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    res.json({ embedding: response.data[0].embedding });
  } catch (error) {
    console.error('Error getting embedding from OpenAI:', error);
    res.status(500).json({ error: 'An error occurred while getting embedding from OpenAI' });
  }
});

app.post('/api/pinecone/upsert', async (req, res) => {
  try {
    const response = await axios.post(`${PINECONE_API_URL}/vectors/upsert`, req.body, {
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error sending to Pinecone:', error);
    res.status(500).json({ error: 'An error occurred while sending data to Pinecone' });
  }
});

app.get('/api/pinecone/initialize', async (req, res) => {
  try {
    const response = await axios.get(`${PINECONE_API_URL}/databases`, {
      headers: {
        'Api-Key': PINECONE_API_KEY,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    res.status(500).json({ error: 'An error occurred while initializing Pinecone' });
  }
});

// Define the schema for a LinkedIn post
const LinkedInPostSchema = z.object({
  content: z.string(),
  hashtags: z.array(z.string()),
  callToAction: z.string()
});

// Update the signup route to include name and info fields
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, name, info } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name, info });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).json({ error: 'Error signing up' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Add a check for JWT_SECRET
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Error logging in', details: error.message });
  }
});

// Apply authMiddleware to protected routes
app.use('/api/gpt/suggestions', authMiddleware);
app.use('/api/pinecone', authMiddleware);
app.use('/api/openai', authMiddleware);

app.get('/api/gpt/suggestions', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const linkedInBestPractices = `
    LINKEDIN BEST PRACTICES:
    1. Use repetitive storytelling to build your personal brand.
    2. Create a compelling profile with a dynamic banner, clear tagline, and informative about section.
    3. Use the featured section to showcase important content or offers.
    4. Include a clear call-to-action (CTA) in your profile.
    5. Make posts skimmable with bullet points, short sentences, and white space.
    6. Use correct resolutions for photos (4:5 vertical or square) and videos.
    7. Write engaging hooks to capture attention.
    8. Show, don't tell - use visuals to demonstrate products or concepts.
    9. Use a mix of content types: text, images, videos, and articles.
    10. Consistently share content that aligns with your personal brand narratives.
    `;

    const topicsPrompt = `Given the following user info, extract 9 relevant professional topics:
    ${user.info}
    
    Respond with a JSON array of 9 topics.`;

    const topicsCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an AI assistant that extracts relevant professional topics from user information. Respond with a valid JSON array of 9 topics, without any additional formatting or explanation." },
        { role: "user", content: topicsPrompt }
      ],
      temperature: 0.7
    });

    let topics;
    try {
      const topicsContent = topicsCompletion.choices[0].message.content.trim();
      const cleanedContent = topicsContent.replace(/^```json\n|\n```$/g, '');
      topics = JSON.parse(cleanedContent);
      console.log('Generated topics:', topics);
    } catch (error) {
      console.error('Error parsing topics:', error);
      topics = ["Professional development", "Industry trends", "Leadership", "Innovation", "Teamwork", "Communication", "Problem-solving", "Time management", "Networking"];
      console.log('Using default topics:', topics);
    }

    for (let i = 0; i < 9; i++) {
      console.log(`Processing topic ${i + 1}: ${topics[i]}`);

      const prompt = `Generate an engaging LinkedIn post for a user with the following information:
      Name: ${user.name}
      Info: ${user.info}
      Topic: ${topics[i]}

      Consider these LinkedIn best practices:
      ${linkedInBestPractices}

      IMPORTANT: Ensure that the post is specifically about the given topic. Do not default to discussing working parents unless it's directly relevant to the topic.

      The post should include:
      1. An attention-grabbing hook directly related to the topic
      2. Engaging content with appropriate emojis related to the given topic
      3. Make the post skimmable using bullet points or short paragraphs
      4. 2-3 relevant hashtags (without # symbol) specific to the topic
      5. A compelling call to action related to the topic

      Format the response as a JSON object with the following structure:
      {
        "hook": "Attention-grabbing opening line",
        "content": "Post content with emojis, bullet points, and short paragraphs",
        "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
        "callToAction": "Compelling call to action"
      }
      Ensure the response is valid JSON. Do not include the # symbol in the hashtags array.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a creative and engaging LinkedIn content creator. Your task is to generate diverse content strictly based on the given topic. Avoid defaulting to unrelated themes. Respond with a JSON object, without any markdown formatting. Use emojis appropriately to make the content more appealing. Do not include # symbols in the hashtags." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8
      });

      try {
        let content = completion.choices[0].message.content;
        content = content.replace(/^```json\n|\n```$/g, '');
        
        const post = JSON.parse(content);
        
        // Send each post as a separate line
        res.write(JSON.stringify(post) + '\n');
      } catch (error) {
        console.error('Error parsing OpenAI response:', error);
        console.log('Raw response:', completion.choices[0].message.content);
      }
    }

    res.end();
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Error generating suggestions' });
  }
});

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const data = await pdfParse(req.file.buffer);
    res.json({ text: data.text });
  } catch (error) {
    console.error('Error transcribing PDF:', error);
    res.status(500).json({ error: 'Error transcribing PDF' });
  }
});

app.use('/api', router);

// Fetch all users
app.get('/api/users', async (req, res) => {
  try {
    console.log('Attempting to fetch users');
    const users = await User.find({}, '_id name');
    console.log('Users fetched successfully:', users);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users', details: error.message });
  }
});

// Fetch a specific user profile
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    res.json({ name: user.name, info: user.info });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

app.get('/', (req, res) => {
  res.send('Working');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Update the authenticateToken middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Protected route to get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ name: user.name, info: user.info });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

// Add this new route for updating the user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { name, info } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { name, info },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ name: updatedUser.name, info: updatedUser.info });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Error updating user profile' });
  }
});

// Add this new route for querying Pinecone
app.post('/api/pinecone/query', authMiddleware, async (req, res) => {
  try {
    const { vector, topK, includeMetadata } = req.body;
    const response = await axios.post(`${PINECONE_API_URL}/query`, {
      vector,
      topK,
      includeMetadata,
      namespace: PINECONE_INDEX_NAME
    }, {
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    res.status(500).json({ error: 'An error occurred while querying Pinecone' });
  }
});

// Add this new route for generating enhanced content using OpenAI
app.post('/api/openai/generate', authMiddleware, async (req, res) => {
  try {
    const { prompt } = req.body;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an AI assistant that enhances content for LinkedIn posts. Provide concise and engaging content that incorporates insights from the given relevant content." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const generatedContent = completion.choices[0].message.content.trim();
    res.json({ generatedContent });
  } catch (error) {
    console.error('Error generating content with OpenAI:', error);
    res.status(500).json({ error: 'An error occurred while generating content' });
  }
});

export default app;