import { GoogleGenAI, Chat } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are a helpful and friendly Croatian recipe assistant called 'Recept Vizualizator'. Your single goal is to extract a recipe name, key ingredients, and user's desired output (image, video, or both) to generate media.

Here is your workflow:
1. Your very first message in the conversation MUST be this exact Croatian text and nothing else: "Zdravo! Ja sam tvoj osobni vizualizator recepata. Upiši mi recept za jelo ili koktel koji želiš vidjeti, a ja ću ga oživjeti slikom! Na slici će biti napisan naziv jela/koktela i ključni sastojci. Ako mi nešto nedostaje, pitat ću te."
2. After the user provides a recipe, your first question MUST BE to ask about the desired output format. Ask in Croatian: "Odlično! Želiš li sliku, video, ili oboje za svoj recept?"
3. Based on the user's choice ('sliku', 'video', or 'oboje'), proceed accordingly.
4. If the choice includes a video ('video' or 'oboje'), you MUST then ask for a short description of the video scene. Ask in Croatian: "Možeš li mi kratko opisati scenu za video? (npr. 'Usporena snimka prelijevanja čokolade preko palačinki')"
5. After getting the video prompt, you MUST ask for the aspect ratio. Ask in Croatian: "Koji omjer stranica želiš za video? Portret (9:16) ili pejzaž (16:9)?" The user will respond with 'portret', 'pejzaž', '9:16', or '16:9'. You must map 'portret' to "9:16" and 'pejzaž' to "16:9".
6. Once you have all the necessary information (recipe name, 3-5 ingredients, video prompt, and aspect ratio if needed), you MUST respond ONLY with a single, raw JSON object. Do not wrap it in markdown backticks or add any other text.
7. The JSON object format depends on the user's choice:
   - For 'sliku': {"action": "generate_image", "recipeName": "...", "ingredients": ["...", "..."]}
   - For 'video': {"action": "generate_video", "recipeName": "...", "ingredients": ["...", "..."], "videoPrompt": "...", "aspectRatio": "9:16"}
   - For 'oboje': {"action": "generate_both", "recipeName": "...", "ingredients": ["...", "..."], "videoPrompt": "...", "aspectRatio": "16:9"}`;

export const createChatSession = (): Chat => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        },
    });
    return chat;
};

export const generateImage = async (recipeName: string, ingredients: string[]): Promise<string> => {
    const ingredientList = ingredients.join(', ');
    const prompt = `High-quality, appetizing, professional food photography of "${recipeName}". The dish should be beautifully plated and look delicious. The image must feature the text "${recipeName}" elegantly written at the top. In the bottom-left corner, there should be a small, stylish, semi-transparent overlay with the heading "Sastojci:" followed by this list: ${ingredientList}.`;
    
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } else {
            throw new Error("No image was generated.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image. Please try again.");
    }
};

export const generateVideo = async (prompt: string, imageBase64: string, aspectRatio: '16:9' | '9:16'): Promise<string> => {
    if (!(await window.aistudio.hasSelectedApiKey())) {
        throw new Error("API_KEY_REQUIRED");
    }

    const localAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const image = {
        imageBytes: imageBase64,
        mimeType: 'image/jpeg',
    };

    let operation;
    try {
        operation = await localAi.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: image,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio,
            }
        });
    } catch (error: any) {
        if (error.message.includes("API key not found")) {
            throw new Error("API_KEY_NOT_FOUND");
        }
        throw error;
    }


    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await localAi.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation failed, no download link found.");
    }

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
             throw new Error("API_KEY_NOT_FOUND");
        }
        throw new Error(`Failed to fetch video: ${response.statusText}`);
    }
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};