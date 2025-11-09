import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize the Gemini client.
// (Make sure GEMINI_API_KEY is in your .env.local file!)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    // 1. Get the transactions data from the request body
    const { transactions } = await request.json()

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid transactions data' }, { status: 400 })
    }

    // 2. Set up the model and the improved prompt
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    const prompt = `
      You are an expert financial analyst. A user has provided their recent
      spending data (from their bill payments). Analyze it and provide actionable insights.
      The "category" is the title of the bill they paid.

      Here is the user's transaction data as a JSON array:
      ${JSON.stringify(transactions)}

      Based on this data, please provide:
      1. A brief 2-3 sentence summary of their spending habits.
      2. Their top 3 spending categories.
      3. One simple, actionable tip to help them save money based on these specific payments.

      Format your response as a JSON object with the keys:
      "summary" (string), "topCategories" (an array of strings), and "tip" (string).

      Important: Respond ONLY with the raw JSON object inside a \`\`\`json code block.
      Do not include any introductory or explanatory text like "Here are your insights...".
    `
    
    // 3. Call the Gemini API
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // 4. Robust JSON parsing
    // This regex finds the JSON block, whether it's in a markdown block or not.
    const jsonMatch = text.match(/```json([\s\S]*?)```|({[\s\S]*})/)

    if (!jsonMatch) {
      // Log what Gemini sent if it's not JSON
      console.error("Gemini response did not contain valid JSON:", text)
      throw new Error("Could not find valid JSON in Gemini response.")
    }

    // Extract the actual JSON string (it's in group 1 or 2)
    const jsonString = (jsonMatch[1] || jsonMatch[2]).trim()
    
    // Parse the extracted string
    const insightData = JSON.parse(jsonString)

    // 5. Send the successful response
    return NextResponse.json(insightData)

  } catch (error: any) {
    // 6. Handle any errors
    console.error("Error in /api/analyze route:", error)
    return NextResponse.json({ error: error.message || 'Failed to analyze spending' }, { status: 500 })
  }
}