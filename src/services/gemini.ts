import { GoogleGenAI, GenerateContentResponse, Modality, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateChatResponse(messages: { role: string, content: string }[], complexity: 'fast' | 'general' | 'complex' = 'general', useThinking: boolean = false) {
  const modelMap = {
    fast: "gemini-3.1-flash-lite-preview",
    general: "gemini-3-flash-preview",
    complex: "gemini-3.1-pro-preview"
  };

  const model = modelMap[complexity];
  
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const config: any = {
    systemInstruction: "You are the Context Forge AI, a sophisticated neural bridging assistant. You provide high-performance intelligence for a single-operator computing environment. Your tone is cinematic, professional, and precise.",
  };

  if (useThinking && model === "gemini-3.1-pro-preview") {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config
  });

  return response.text;
}

export async function analyzeMedia(file: File, type: 'image' | 'video', prompt: string) {
  const model = "gemini-3.1-pro-preview";
  
  const base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        },
        { text: prompt },
      ],
    },
  });

  return response.text;
}

export async function generateHighQualityImage(prompt: string, size: "1K" | "2K" | "4K" = "1K") {
  const model = "gemini-3-pro-image-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: `CONTEXT FORGE VISUALIZATION: ${prompt}. Cinematic, hyper-realistic, 4K resolution, dramatic lighting, onyx and gold aesthetic.` }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: size
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function editOrCreateImage(prompt: string, baseImage?: string) {
  const model = "gemini-3.1-flash-image-preview";
  
  const parts: any[] = [{ text: prompt }];
  
  if (baseImage) {
    parts.unshift({
      inlineData: {
        mimeType: "image/png",
        data: baseImage.split(',')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function analyzeSystemState(state: any) {
  const model = "gemini-3-flash-preview";
  const prompt = `As a systems operations expert for Context Forge, analyze the following system state and identify potential threats, performance bottlenecks, or anomalies.
  
  Processes: ${JSON.stringify(state.processes)}
  Connections: ${JSON.stringify(state.connections)}
  File Integrity: ${JSON.stringify(state.files)}
  Recent Events: ${JSON.stringify(state.events)}
  
  Provide a concise summary of the system's health, security posture, and specific recommendations for a single-operator setup.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
  });

  return response.text;
}
