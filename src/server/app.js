import express from 'express';
import dotenv from 'dotenv';
import OpenAI from "openai";
import fs from 'fs';

const TITLE = 1;
const BLOCK_ID = 2;
const summary = 3;
const INTENT = 4;
const TYPE = 5;
const CONTENT = 6;

// Basic express server setup

const app = express();
const port = 3001;
app.use(express.json());

// Set path to .env file 
dotenv.config({ path: '../../.env' }); 

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Express routes

app.get('/test', (req, res) => {
    const testResponse = getTestResponse();
    res.send(testResponse);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  getBlockContent("1.1.1.1","intent");
});

// Handles request body


// Calls OpenAI API to get a response
async function getTestResponse() {
    const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "developer",
                content: "Write a one-sentence bedtime story about a unicorn.",
            },
        ],
    });
    return completion.choices[0].message.content;
}

// Formats the response

// Operates on block contents
function getBlockContent(blockId, key) {
    const [secId, subsecId=0, parId=0, senId=0] = blockId.split('.').map(Number);

    fs.openSync(`./data/testContent.json`, {'utf8'})

    const obj = JSON.parse();
    let toGet = returnTargetBlock(obj, secId, subsecId, parId, senId);
    return toGet[key];
}

function returnTargetBlock(obj, secId, subsecId, parId, senId) {
    let toGet = obj;
    if (secId == 0) {
        return toGet;
    }
    toGet = toGet["contents"][secId - 1];
    if (subsecId == 0) {
        return toGet;
    }
    toGet = toGet["contents"][subsecId - 1];
    if (parId == 0) {
        return toGet;
    }
    toGet = toGet["contents"][parId - 1];
    if (senId == 0) {
        return toGet;
    }
    toGet = toGet["contents"][senId - 1];
    return toGet;
}

// getBlockContent("1.1.1.1","intent");


