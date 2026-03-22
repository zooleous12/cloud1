import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeSystemState(state: any) {
  const model = "gemini-3-flash-preview";
  const prompt = `As a Kali Linux security expert, analyze the following system state and identify potential threats or anomalies.
  
  IMPORTANT KNOWLEDGE: Standard system processes like 'rtkit-daemon', 'systemd', 'dbus-daemon', and 'gnome-shell' are expected on a healthy Kali installation. Flag them only if their resource usage (CPU/MEM) is abnormally high or if they are running from unusual paths.
  
  Processes: ${JSON.stringify(state.processes)}
  Connections: ${JSON.stringify(state.connections)}
  File Integrity: ${JSON.stringify(state.files)}
  Recent Events: ${JSON.stringify(state.events)}
  
  Provide a concise summary of the security posture and specific recommendations.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
  });

  return response.text;
}

export async function analyzeForensicMedia(file: File, type: 'image' | 'video') {
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
        { text: `Analyze this ${type} for security-related information. Look for suspicious terminal commands, unauthorized access indicators, or malware signatures visible in the UI.` },
      ],
    },
  });

  return response.text;
}

export async function generateThreatVisual(prompt: string) {
  const model = "gemini-3.1-flash-image-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: `A futuristic, high-tech security visualization of: ${prompt}. Cyberpunk style, dark background, neon green accents.` }],
    },
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
