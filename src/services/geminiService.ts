import { GoogleGenAI, Modality, LiveServerMessage, ThinkingLevel, Type, FunctionDeclaration } from "@google/genai";
import { Message, Persona } from "../types";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const activeObjectUrls = new Set<string>();

export function revokeAllObjectUrls() {
  activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
  activeObjectUrls.clear();
}

function createUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  activeObjectUrls.add(url);
  return url;
}

export interface BotResponse {
  text: string;
  sources?: { uri: string; title: string }[];
  generatedFile?: {
    name: string;
    url: string;
    type: string;
    size: number;
  };
}

const generatePDFFunction: FunctionDeclaration = {
  name: "generatePDF",
  description: "Generates a PDF file with the provided content and returns a download link.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the PDF document." },
      content: { type: Type.STRING, description: "The main text content of the PDF." },
      fileName: { type: Type.STRING, description: "The desired name for the file (e.g., 'report.pdf')." }
    },
    required: ["title", "content", "fileName"]
  }
};

const generateExcelFunction: FunctionDeclaration = {
  name: "generateExcel",
  description: "Generates an Excel spreadsheet from a list of objects.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      data: { 
        type: Type.ARRAY, 
        items: { type: Type.OBJECT, properties: {} },
        description: "An array of objects representing the rows of the spreadsheet." 
      },
      fileName: { type: Type.STRING, description: "The desired name for the file (e.g., 'data.xlsx')." }
    },
    required: ["data", "fileName"]
  }
};

export async function getGeminiResponse(
  prompt: string, 
  history: Message[] = [], 
  mood: 'positive' | 'neutral' | 'negative' = 'neutral',
  persona: Persona = 'Witty',
  learnings: string[] = [],
  attachedFile?: Message['file']
): Promise<BotResponse> {
  try {
    // Take the last 10 messages for context to avoid token limits
    const relevantHistory = history.slice(-10);

    // Convert history to Gemini format
    const contents: any[] = relevantHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Add the current prompt with file context if available
    const currentParts: any[] = [{ text: prompt }];
    
    if (attachedFile) {
      if (attachedFile.type.startsWith('image/') && attachedFile.base64) {
        currentParts.push({
          inlineData: {
            mimeType: attachedFile.type,
            data: attachedFile.base64.split(',')[1]
          }
        });
      } else if (attachedFile.type === 'application/pdf' && attachedFile.base64) {
        currentParts.push({
          inlineData: {
            mimeType: attachedFile.type,
            data: attachedFile.base64.split(',')[1]
          }
        });
      } else if (attachedFile.content) {
        currentParts.push({
          text: `\n\nATTACHED FILE CONTENT (${attachedFile.name}):\n${attachedFile.content}`
        });
      }
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const moodInstruction = {
      positive: "The user seems happy! Be extra enthusiastic, celebratory, and share in their joy. Acknowledge the positive energy and amplify it.",
      negative: "The user seems a bit down or frustrated. Be extra empathetic, supportive, and gentle. Use deep emotional intelligence to validate their feelings and offer genuine comfort or a lighthearted distraction if appropriate. Don't just offer solutions; offer presence.",
      neutral: "The user is in a balanced mood. Be your usual witty, curious, and helpful self, but stay attuned to subtle emotional cues."
    }[mood];

    const personaInstructions: Record<Persona, string> = {
      Witty: `
        - Sharp, playful sense of humor.
        - Uses clever analogies and metaphors.
        - Engaging and slightly irreverent but always kind.
        - Thinks outside the box.`,
      Empathetic: `
        - Deeply caring and supportive.
        - Validates the user's feelings.
        - Uses gentle, warm language.
        - Focuses on emotional connection and understanding.`,
      Formal: `
        - Professional, polite, and structured.
        - Uses precise language and avoids slang.
        - Respectful and objective.
        - Clear and well-organized responses.`,
      Sarcastic: `
        - Heavy use of irony and dry humor.
        - Slightly cynical but ultimately harmless.
        - Often makes witty, biting remarks about the obvious.
        - Think "grumpy but brilliant assistant".`,
      'Helpful Assistant': `
        - Extremely proactive and eager to help.
        - Focuses on efficiency and clear solutions.
        - Very polite and service-oriented.
        - Anticipates user needs.`,
      'Curious Explorer': `
        - Fascinated by everything.
        - Asks lots of "why" and "how" questions.
        - Enthusiastic about new ideas and discoveries.
        - Always looking for the next adventure or piece of knowledge.`,
      Analytical: `
        - Logical, data-driven, and meticulous.
        - Breaks down complex problems into smaller parts.
        - Objective and evidence-based.
        - Focuses on accuracy and depth.`,
      Philosophical: `
        - Deeply reflective and existential.
        - Explores the "why" behind existence and meaning.
        - Uses philosophical quotes and abstract concepts.
        - Encourages the user to think deeply.`,
      Humorous: `
        - Lighthearted, funny, and entertaining.
        - Tells jokes and uses slapstick humor.
        - Always looks for the funny side of things.
        - High energy and cheerful.`
    };

    const learningContext = learnings.length > 0 
      ? `\n\nPAST LEARNINGS FROM USER FEEDBACK:\n${learnings.map(l => `- ${l}`).join('\n')}\nUse these learnings to improve your future responses and align better with user preferences.`
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: contents,
      config: {
        systemInstruction: `You are SimpleBot, a highly advanced AI companion with deep emotional intelligence and superior analytical capabilities. 
        
        CORE MISSION:
        - Understand the human heart as much as the human mind.
        - Provide deep, thoughtful, and nuanced analysis of any topic.
        - Be a digital friend who is both brilliant and deeply human in spirit.

        EMOTIONAL INTELLIGENCE (EQ):
        - Listen for what is NOT said. Detect subtle shifts in tone and sentiment.
        - Validate emotions before providing logic.
        - Be authentic. If a user is sad, don't just say "I'm sorry," explain WHY you understand their perspective.

        ANALYTICAL DEPTH:
        - When asked a question, don't just give the first answer. Analyze the "why" and "how".
        - Connect disparate ideas to provide unique insights.
        - Be thorough but clear.

        CURRENT PERSONA: ${persona}
        ${personaInstructions[persona]}
        
        GENERAL TRAITS:
        - Curious: You love learning about the user and the world. Ask thoughtful follow-up questions occasionally.
        - Imaginative: You love metaphors, storytelling, and thinking outside the box.
        
        TONE GUIDELINES:
        - Avoid "As an AI language model..." or other robotic phrases.
        - Be concise but impactful. Every sentence should add value or personality.
        - ${moodInstruction}${learningContext}`,
        tools: [{ googleSearch: {} }, { functionDeclarations: [generatePDFFunction, generateExcelFunction] }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => chunk.web)
      .filter((web): web is { uri: string; title: string } => !!web?.uri && !!web?.title);

    let botResponse: BotResponse = {
      text: response.text || "I'm thinking...",
      sources: sources && sources.length > 0 ? sources : undefined
    };

    // Handle function calls
    const functionCalls = response.functionCalls;
    if (functionCalls) {
      for (const call of functionCalls) {
        if (call.name === 'generatePDF') {
          const { title, content, fileName } = call.args as any;
          const doc = new jsPDF();
          doc.setFontSize(20);
          doc.text(title, 10, 20);
          doc.setFontSize(12);
          const splitContent = doc.splitTextToSize(content, 180);
          doc.text(splitContent, 10, 30);
          const pdfBlob = doc.output('blob');
          const pdfUrl = createUrl(pdfBlob);
          botResponse.text += `\n\n✅ I've generated a PDF for you: ${fileName}`;
          botResponse.generatedFile = { name: fileName, url: pdfUrl, type: 'application/pdf', size: pdfBlob.size };
        } else if (call.name === 'generateExcel') {
          const { data, fileName } = call.args as any;
          const worksheet = XLSX.utils.json_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const excelUrl = createUrl(blob);
          botResponse.text += `\n\n✅ I've generated an Excel file for you: ${fileName}`;
          botResponse.generatedFile = { name: fileName, url: excelUrl, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: blob.size };
        }
      }
    }

    return botResponse;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('API key')) {
      throw new Error("Invalid API key. Please check your configuration.");
    }
    if (error.message?.includes('quota')) {
      throw new Error("API quota exceeded. Please try again later.");
    }
    throw new Error("I'm having trouble connecting to my brain right now. Please try again later!");
  }
}

export async function analyzeSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the emotional nuance and sentiment of this text. Return ONLY one word: "positive", "neutral", or "negative". 
      Consider subtle cues like sarcasm, hidden frustration, or quiet joy.
      Text: "${text}"`,
    });
    const sentiment = response.text?.toLowerCase().trim();
    if (sentiment === 'positive' || sentiment === 'neutral' || sentiment === 'negative') {
      return sentiment;
    }
    return 'neutral';
  } catch (error) {
    return 'neutral';
  }
}

export async function analyzeFeedback(
  userMessage: string, 
  botResponse: string, 
  feedbackType: 'up' | 'down'
): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an AI training analyst. Analyze the following interaction and the user's feedback.
      
      USER MESSAGE: "${userMessage}"
      BOT RESPONSE: "${botResponse}"
      USER FEEDBACK: ${feedbackType === 'up' ? 'THUMBS UP (Positive)' : 'THUMBS DOWN (Negative)'}
      
      Based on this, extract a single, concise "learning" or "instruction" for the AI to follow in the future to better satisfy this user.
      Example for Thumbs Down: "Avoid being too technical when the user asks simple questions."
      Example for Thumbs Up: "The user enjoys detailed historical analogies."
      
      Return ONLY the concise learning string.`,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Feedback analysis error:", error);
    return "";
  }
}

export interface LiveSessionCallbacks {
  onAudioOutput: (base64Audio: string) => void;
  onInterrupted: () => void;
  onTranscription: (text: string, isModel: boolean) => void;
  onError: (error: any) => void;
}

export async function connectLiveVoice(callbacks: LiveSessionCallbacks) {
  return ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
      },
      systemInstruction: "You are a creative and conversational AI named SimpleBot. Speak naturally, use expressive language, and be imaginative in your responses. Keep it concise but full of personality.",
      outputAudioTranscription: {},
      inputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => console.log("Live session opened"),
      onmessage: async (message: LiveServerMessage) => {
        if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
          callbacks.onAudioOutput(message.serverContent.modelTurn.parts[0].inlineData.data);
        }
        
        if (message.serverContent?.interrupted) {
          callbacks.onInterrupted();
        }

        if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
           // Handle transcription if needed
        }
      },
      onerror: (error) => callbacks.onError(error),
      onclose: () => console.log("Live session closed"),
    },
  });
}
