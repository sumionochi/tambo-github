// lib/apis/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function generateImageVariations(
  imageUrl: string,
  prompt: string,
  count: number = 4
): Promise<string[]> {
  try {
    console.log("🎨 Generating image variations with GPT-Image-1.5");
    console.log("📝 Prompt:", prompt);

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image");
    }

    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], "image.png", { type: "image/png" });

    // Generate with GPT-Image-1.5
    const response = await openai.images.edit({
      model: "gpt-image-1.5",
      image: imageFile,
      prompt: prompt,
      n: Math.min(count, 10),
      size: "1024x1024",
      quality: "high",
      output_format: "png",
    });

    // TypeScript safety check
    if (!response.data || response.data.length === 0) {
      throw new Error("No images returned from API");
    }

    console.log("✅ Generated", response.data.length, "variations");

    // GPT models return base64, convert to data URLs
    const imageUrls: string[] = [];

    for (const img of response.data) {
      if (img.b64_json) {
        imageUrls.push(`data:image/png;base64,${img.b64_json}`);
      } else if (img.url) {
        imageUrls.push(img.url);
      }
    }

    if (imageUrls.length === 0) {
      throw new Error("No valid image data received");
    }

    return imageUrls;
  } catch (error: any) {
    console.error("❌ Image generation error:", error);
    throw error;
  }
}

export async function generateImage(
  prompt: string,
  options?: {
    model?:
      | "dall-e-2"
      | "dall-e-3"
      | "gpt-image-1"
      | "gpt-image-1-mini"
      | "gpt-image-1.5";
    size?:
      | "256x256"
      | "512x512"
      | "1024x1024"
      | "1792x1024"
      | "1024x1792"
      | "1536x1024"
      | "1024x1536";
    quality?: "standard" | "hd" | "low" | "medium" | "high";
    n?: number;
  }
): Promise<string[]> {
  try {
    console.log("🎨 Generating image:", prompt);

    const model = options?.model || "gpt-image-1.5";
    const isGPTModel = model.startsWith("gpt-image");

    const response = await openai.images.generate({
      model: model,
      prompt: prompt,
      n: options?.n || 1,
      size: options?.size || "1024x1024",
      quality: options?.quality,
      ...(isGPTModel && { output_format: "png" }),
    } as any);

    // TypeScript safety check
    if (!response.data || response.data.length === 0) {
      throw new Error("No images returned from API");
    }

    console.log("✅ Generated", response.data.length, "images");

    const imageUrls: string[] = [];

    for (const img of response.data) {
      if (img.b64_json) {
        imageUrls.push(`data:image/png;base64,${img.b64_json}`);
      } else if (img.url) {
        imageUrls.push(img.url);
      }
    }

    if (imageUrls.length === 0) {
      throw new Error("No valid image data received");
    }

    return imageUrls;
  } catch (error: any) {
    console.error("❌ Image generation error:", error);
    throw error;
  }
}
