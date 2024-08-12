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

dotenv.config({ path: '../.env' });

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

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

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

app.get('/api/gpt/suggestions/:userId', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const user = await Profile.findById(req.params.userId);
    if (!user) {
      res.write(`data: ${JSON.stringify({ error: 'User profile not found' })}\n\n`);
      res.end();
      return;
    }

    const userContent = user.content;
    const userGoal = user.goal;
    const categories = ['plannedContent', 'reactiveContent', 'companyContent'];

    for (const category of categories) {
      const categoryContent = userContent[category] || '';
      if (!categoryContent.trim()) {
        res.write(`data: ${JSON.stringify({ warning: `Skipping ${category} due to empty content` })}\n\n`);
        continue;
      }

      const queryVector = await getEmbedding(categoryContent);
      if (queryVector) {
        const relevantDocs = await queryPinecone(queryVector);
        const prompt = createPrompt(category, relevantDocs, userContent, userGoal);
        
        for (let i = 0; i < 1; i++) {
          try {
            const stream = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are a professional LinkedIn content creator." },
                { role: "user", content: prompt }
              ],
              functions: [
                {
                  name: "generate_linkedin_post",
                  description: "Generate a LinkedIn post based on the given category and guidelines",
                  parameters: {
                    type: "object",
                    properties: {
                      content: { type: "string" },
                      hashtags: { type: "array", items: { type: "string" } },
                      callToAction: { type: "string" }
                    },
                    required: ["content", "hashtags", "callToAction"]
                  }
                }
              ],
              function_call: { name: "generate_linkedin_post" },
              stream: true,
            });

            let postData = '';

            for await (const chunk of stream) {
              if (chunk.choices[0]?.delta?.function_call?.arguments) {
                postData += chunk.choices[0].delta.function_call.arguments;
              }
            }

            if (postData) {
              try {
                const post = JSON.parse(postData);
                res.write(`data: ${JSON.stringify({ [category]: post })}\n\n`);
              } catch (jsonError) {
                console.error('Error parsing JSON:', jsonError);
                console.error('Raw postData:', postData);
                res.write(`data: ${JSON.stringify({ error: 'Error parsing response', category })}\n\n`);
              }
            }
          } catch (streamError) {
            console.error('Error in stream processing:', streamError);
            res.write(`data: ${JSON.stringify({ error: 'Error processing stream', category })}\n\n`);
          }
        }
      } else {
        res.write(`data: ${JSON.stringify({ warning: `Skipping ${category} due to embedding error` })}\n\n`);
        continue;
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.write(`data: ${JSON.stringify({ error: 'Error generating suggestions' })}\n\n`);
    res.end();
  }
});

async function getEmbedding(text) {
  if (!text || text.trim() === '') {
    console.warn('Empty or undefined text passed to getEmbedding');
    return null;
  }
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data[0].embedding;
}

async function queryPinecone(vector) {
  const response = await axios.post(`${PINECONE_API_URL}/query`, {
    vector,
    topK: 3,
    includeMetadata: true
  }, {
    headers: {
      'Api-Key': PINECONE_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  return response.data.matches.map(match => match.metadata.text);
}

function createPrompt(category, docs, userContent, userGoal) {
  let categoryContent = '';
  if (category === 'plannedContent') {
    categoryContent = userContent.plannedContent;
  } else if (category === 'reactiveContent') {
    categoryContent = userContent.reactiveContent;
  } else if (category === 'companyContent') {
    categoryContent = userContent.companyContent;
  }

  return `Generate a LinkedIn post for the category "${category}" based on the following user input, goal, and guidelines:

User Input:
${categoryContent}

User Goal:
${userGoal}

Guidelines:
${docs.join('\n\n')}

The post should be engaging, professional, and follow LinkedIn best practices. Include relevant hashtags and a call to action. Incorporate the user's input and goal where appropriate.`;
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
    const users = await Profile.find({}, '_id name');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
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

export default app;