import { NextResponse } from 'next/server';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const model = "gpt-3.5-turbo";

async function generateContent(parents: any[], contentType: string) {
  const parentFormat = Object.keys(parents[0]).map(key => `${key}: ${parents[0][key]}`).join('\n');
  
  const prompt = `
${parents.map(parent => Object.entries(parent).map(([key, value]) => `${key}: ${value}`).join('\n')).join('\n\n')}

# Task
Generate a new ${contentType} based on the provided examples. Get inspiration from the given content, but make sure to clearly state your novelty and contributions.

Return the response in the following format:
${parentFormat}
`;

  const response = await openai.createChatCompletion({
    model: model,
    messages: [{ role: "user", content: prompt }],
  });

  const generatedText = response.data.choices[0].message.content;
  const generatedContent = Object.fromEntries(generatedText.split('\n').map(line => line.split(': ')));
  console.log(generatedText);
  return generatedContent;
}

async function evaluateContent(content: any, criteria: string) {
  const contentFormat = Object.entries(content).map(([key, value]) => `${key}: ${value}`).join('\n');
  
  const prompt = `
# Given Content
${contentFormat}

# Task
As a harsh reviewer, evaluate the generated content based on the following criteria:
${criteria}

Provide a critical, harsh yet valid evaluation comment and an evaluation score (0-100).

Return the response in the following JSON format:
{
  "comments": "...",
  "score": int from 0 to 100. Make 50 the default average score.
}
`;

  const response = await openai.createChatCompletion({
    model: model,
    messages: [{ role: "user", content: prompt }],
    response_format: { "type": "json_object" },
  });

  const generatedText = response.data.choices[0].message.content;
  console.log(generatedText);
  return JSON.parse(generatedText);
}

export async function POST(request: Request) {
  const { parents, criteria, contentType } = await request.json();

  try {
    const generatedContent = await generateContent(parents, contentType);
    const evaluation = await evaluateContent(generatedContent, criteria);

    return NextResponse.json({
      ...generatedContent,
      score: (evaluation.score / 100.0) || 0.5,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: `Failed to generate and evaluate ${contentType}` }, { status: 500 });
  }
}