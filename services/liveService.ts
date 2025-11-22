import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { BoundingBox } from "../types";

// Define the tool for the model to call when it sees a hand
const updateHandCoordinatesTool: FunctionDeclaration = {
  name: "updateHandCoordinates",
  description: "Report the bounding box of the user's hand. Coordinates must be 0-100 normalized values.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ymin: { type: Type.NUMBER, description: "Top edge (0-100)" },
      xmin: { type: Type.NUMBER, description: "Left edge (0-100)" },
      ymax: { type: Type.NUMBER, description: "Bottom edge (0-100)" },
      xmax: { type: Type.NUMBER, description: "Right edge (0-100)" },
      confidence: { type: Type.NUMBER, description: "Certainty (0.0-1.0)" },
    },
    required: ["ymin", "xmin", "ymax", "xmax"],
  },
};

type HandUpdateCallback = (box: BoundingBox) => void;
type ErrorCallback = (error: string) => void;

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private session: any = null;
  private sessionPromise: Promise<any> | null = null;
  
  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY is missing via process.env.API_KEY");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(onHandUpdate: HandUpdateCallback, onError: ErrorCallback) {
    try {
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Session Opened");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Tool Calls (The primary mechanism for tracking)
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === "updateHandCoordinates") {
                  const args = fc.args as unknown as BoundingBox;
                  onHandUpdate(args);
                  
                  // We must respond to the tool call to keep the session alive
                  if (this.sessionPromise) {
                    this.sessionPromise.then((session: any) => {
                      session.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { result: "ok" },
                        }
                      });
                    });
                  }
                }
              }
            }
          },
          onclose: (e) => {
            console.log("Session closed", e);
          },
          onerror: (e) => {
            console.error("Session error", e);
            onError("Connection error occurred.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO], 
          tools: [{ functionDeclarations: [updateHandCoordinatesTool] }],
          systemInstruction: `
            You are a video analysis bot. 
            Input: You receive a stream of video frames.
            Task: Locate the user's hand in the frame.
            Action: CONTINUOUSLY call the 'updateHandCoordinates' tool with the bounding box of the hand.
            
            Rules:
            1. IGNORE audio. Focus ONLY on the video.
            2. If you see a hand, call the tool. Do NOT wait.
            3. Do not speak. Do not generate text. ONLY call the tool.
            4. If you are unsure, provide your best guess for the hand location.
            5. Coordinates are 0-100 (percentage of screen).
          `,
        },
      });

      this.session = await this.sessionPromise;
    } catch (error) {
      console.error("Failed to connect to Gemini Live:", error);
      onError("Failed to initialize AI session.");
      throw error;
    }
  }

  sendFrame(base64Data: string) {
    if (!this.sessionPromise) return;
    
    this.sessionPromise.then((session: any) => {
      try {
        session.sendRealtimeInput({
          media: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        });
      } catch (e) {
        console.warn("Failed to send frame:", e);
      }
    });
  }

  async disconnect() {
    if (this.sessionPromise) {
       // safely attempt to close if session exists
       try {
         const session = await this.sessionPromise;
         // There isn't a formal close() on the session object in all versions, 
         // but releasing the reference is key.
         // If the SDK supports it: session.close();
       } catch(e) {
         // ignore
       }
    }
    this.session = null;
    this.sessionPromise = null;
  }
}

// Helper to convert blob to base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};