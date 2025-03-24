import express from 'express';
import dotenv from 'dotenv';
import OpenAI from "openai";
import fs from 'fs';

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
//   test calls
//   getBlockContent("1.1.1.1","intent");
//   updateBlockContent("1.1.1.2","content","This is a test content");
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
function getBlockValue(blockId, key) {
    const [secId, subsecId=0, parId=0, senId=0] = blockId.split('.').map(Number);

    const data = fs.readFileSync('./data/testContent.json');
    const obj= JSON.parse(data);

    // let data = JSON.stringify(punishments);
    // fs.writeFileSync('punishmenthistory.json', data);

    let toGet = returnTargetBlock(obj, secId, subsecId, parId, senId);
    return toGet[key];
}

function updateBlockValue(blockId, key, valueToUpdate) {
    const [secId, subsecId=0, parId=0, senId=0] = blockId.split('.').map(Number);

    const data = fs.readFileSync('./data/testContent.json');
    const obj= JSON.parse(data);

    let toUpdate = returnTargetBlock(obj, secId, subsecId, parId, senId);
    toUpdate[key] = valueToUpdate;
    
    let updatedData = JSON.stringify(obj);
    fs.writeFileSync('./data/testContent.json', updatedData);

    return;
}

function returnTargetBlock(obj, secId, subsecId, parId, senId) {
    let toGet = obj;
    // return toGet;
    if (secId == 0) {
        return toGet;
    }
    toGet = toGet["content"][secId - 1];
    if (subsecId == 0) {
        return toGet;
    }
    toGet = toGet["content"][subsecId - 1];
    if (parId == 0) {
        return toGet;
    }
    toGet = toGet["content"][parId - 1];
    if (senId == 0) {
        return toGet;
    }
    toGet = toGet["content"][senId - 1];
    return toGet;
}

// getBlockContent("1.1.1.1","intent");


