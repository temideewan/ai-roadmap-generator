import { OpenAI } from "openai";
import { NextResponse } from "next/server"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const POST = async (req: Request, res: Response) => {
    try {
        const body = await req.json();
        const query = body.query;
        if (!query) {
            return NextResponse.json({ status: false, message: "Please send query." }, { status: 400 });
        }
        const text = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-1106",
            temperature: 1,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful AI assistant that can generate career/syllabus roadmap. you can arrange it in a way so that the order of the chapters is always from beginner to advanced. always generate a minimum of 4 modules inside a chapter, link to wikipedia if possible"
                },
                {
                    "role": "user",
                    // "content": `Generate a roadmap in JSON format related to the title: ${query} which has the JSON structure: {query: ${query}, chapters: {chapterName: string[]}}`
                    "content": `Generate a roadmap in JSON format related to the title: ${query} which has the JSON structure: {query: ${query}, chapters: {chapterName: [{moduleName: string, moduleDescription: string, link?: string}]}}`
                }
            ],
            response_format: { "type": "json_object" }
        })
        const content = text?.choices?.[0]?.message?.content;
        if (text) {
            let json: any = text?.choices?.[0]?.message?.content || '';
            try {
                json = JSON.parse(json);
            } catch (e) {
                console.log(e)
                json = {};
            }
            return NextResponse.json({ status: true, text: json }, { status: 200 })
        }


        return NextResponse.json({ status: true, data: content }, { status: 200 });
    } catch (e) {
        console.log(e)
        return NextResponse.json({ status: false, message: "Something went wrong." }, { status: 400 });
    }
}