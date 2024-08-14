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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: './.env' });
//console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// Add this line to increase the timeout
app.use((req, res, next) => {
  res.setTimeout(300000); // 5 minutes
  next();
});

const PINECONE_API_URL = process.env.PINECONE_API_URL;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const ProfileSchema = new mongoose.Schema({
  name: String,
  goal: String,
  content: {
    plannedContent: String,
    reactiveContent: String,
    companyContent: String
  }
});

const Profile = mongoose.model('Profile', ProfileSchema);

app.post('/api/profile', async (req, res) => {
  try {
    const { name, goal, content } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { name },
      { name, goal, content },
      { upsert: true, new: true }
    );
    res.json(profile);
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ error: 'Error saving profile' });
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const profile = await Profile.findOne();
    res.json(profile);
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

// Define the schema for the response
const SuggestionsResponseSchema = z.object({
  plannedContent: z.array(LinkedInPostSchema),
  reactiveContent: z.array(LinkedInPostSchema),
  companyContent: z.array(LinkedInPostSchema)
});

app.get('/api/gpt/suggestions/:userId/:category/:index', async (req, res) => {
  try {
    const { userId, category, index } = req.params;
    const user = await Profile.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userContent = user.content;
    const userGoal = user.goal;

    const prompt = generatePromptForCategory(category, userGoal, userContent[category]);
    const post = await generateSinglePost(prompt);

    res.json({ category, index, post });
  } catch (error) {
    console.error('Error generating suggestion:', error);
    res.status(500).json({ error: 'Error generating suggestion' });
  }
});

function generatePromptForCategory(category, userGoal, categoryContent) {
  return `Generate a LinkedIn post based on the following user input, goal, and guidelines:

User Goal: ${userGoal}

${formatCategoryTitle(category)}:
${categoryContent || ''}

Generate a single post that includes content, 2-3 relevant hashtags, and a call to action. Format the response as follows:

Content: [post content]
Hashtags: [hashtag1, hashtag2, hashtag3]
Call to Action: [call to action]`;
}

async function generateSinglePost(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a professional LinkedIn content creator." },
        { role: "user", content: prompt }
      ],
    });

    const response = completion.choices[0].message.content;
    return processPostResponse(response);
  } catch (error) {
    console.error('Error generating single post:', error);
    return null;
  }
}

function processPostResponse(response) {
  const contentMatch = response.match(/Content:\s*(.*?)(?=\n\s*Hashtags:)/s);
  const hashtagsMatch = response.match(/Hashtags:\s*(.*?)(?=\n\s*Call to Action:)/);
  const ctaMatch = response.match(/Call to Action:\s*(.*?)(?=\n|$)/);

  return {
    content: contentMatch ? contentMatch[1].trim() : '',
    hashtags: hashtagsMatch ? hashtagsMatch[1].split(',').map(tag => tag.trim().replace('#', '')) : [],
    callToAction: ctaMatch ? ctaMatch[1].trim() : ''
  };
}

function formatCategoryTitle(category) {
  return category
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
}

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
    const users = await Profile.find({}, '_id name');
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
    const profile = await Profile.findById(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    res.json(profile);
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

export default app;