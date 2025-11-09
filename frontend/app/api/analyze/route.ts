import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    const { transactions } = await request.json()
    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid transactions data' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `
You are an expert financial analyst and gamification designer.
A user has provided their recent spending data (from their bill payments).

Here is their transaction data as JSON:
${JSON.stringify(transactions)}

1 Analyze their spending and provide:
- "summary": 2–3 sentences summarizing their spending behavior.
- "topCategories": Top 3 spending categories (array).
- "tip": One short, actionable advice to improve or maintain good habits.

2 Based on your analysis, generate a "mission" — a simple challenge to motivate improvement or consistency.
Examples:
- "Reduce food delivery spending by 10% next week to earn +50 credits."
- "Maintain your on-time payments streak for 7 days to earn a bonus."
- "Avoid unpaid bills this month for an extra reward."

Return a JSON object inside a \`\`\`json\`\`\` code block:
{
  "summary": "...",
  "topCategories": ["...", "...", "..."],
  "tip": "...",
  "mission": {
    "title": "...",
    "description": "...",
    "reward": "..." £ credits
  }
}
Respond with only that JSON object.
`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Find and extract JSON
    const jsonMatch = text.match(/```json([\s\S]*?)```|({[\s\S]*})/)
    if (!jsonMatch) {
      console.error("Gemini response did not contain valid JSON:", text)
      throw new Error("Could not find valid JSON in Gemini response.")
    }

    const jsonString = (jsonMatch[1] || jsonMatch[2]).trim()
    const insightData = JSON.parse(jsonString)

    return NextResponse.json(insightData)
  } catch (error: any) {
    console.error("Error in /api/analyze route:", error)
    return NextResponse.json({ error: error.message || 'Failed to analyze spending' }, { status: 500 })
  }
}
