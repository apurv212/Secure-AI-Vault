const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { normalizeExtractedData } = require('../utils/bankNormalizer');
const router = express.Router();

if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. Card extraction will not work.');
}

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Middleware to verify authentication
const verifyAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Extract card details from image URL
router.post('/', verifyAuth, async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const { imageUrl, cardId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Fetch image from URL (Firebase Storage URL with token should work)
    console.log('Fetching image from URL:', imageUrl);
    
    let imageBuffer;
    let mimeType = 'image/jpeg';
    
    // Check if it's a Firebase Storage URL
    if (imageUrl.includes('firebasestorage.googleapis.com')) {
      try {
        // Try to get the file using Firebase Admin SDK
        // Extract bucket name from URL: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/...
        const bucketMatch = imageUrl.match(/\/b\/([^\/]+)\//);
        if (bucketMatch) {
          const bucketName = bucketMatch[1];
          const bucket = admin.storage().bucket(bucketName);
          
          // Extract the file path from the URL
          const urlParts = imageUrl.split('/o/');
          if (urlParts.length > 1) {
            const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
            const file = bucket.file(filePath);
            const [exists] = await file.exists();
            if (exists) {
              const [buffer] = await file.download();
              imageBuffer = buffer;
              const [metadata] = await file.getMetadata();
              mimeType = metadata.contentType || 'image/jpeg';
              console.log('Image fetched from Firebase Storage. Size:', imageBuffer.length, 'bytes. MIME type:', mimeType);
            } else {
              throw new Error('File not found in Firebase Storage');
            }
          } else {
            throw new Error('Invalid Firebase Storage URL format');
          }
        } else {
          throw new Error('Could not extract bucket name from URL');
        }
      } catch (firebaseError) {
        console.warn('Firebase Admin fetch failed, trying direct URL:', firebaseError.message);
        // Fallback to direct fetch (download URLs with tokens should work)
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        mimeType = contentType.split(';')[0];
        console.log('Image fetched via direct URL. Size:', imageBuffer.byteLength, 'bytes. MIME type:', mimeType);
      }
    } else {
      // Direct URL fetch for non-Firebase URLs
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      mimeType = contentType.split(';')[0];
      console.log('Image fetched successfully. Size:', imageBuffer.byteLength, 'bytes. MIME type:', mimeType);
    }
    
    // Convert to base64
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Use Gemini 2.5 Flash for image analysis (stable, fast, supports images)
    // Available models: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash-001
    let model;
    try {
      // Try gemini-2.5-flash first (stable, fast, supports images)
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      console.log('Using model: gemini-2.5-flash');
    } catch (e) {
      try {
        // Fallback to gemini-2.5-pro (more powerful, slower)
        model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
        console.log('Using model: gemini-2.5-pro');
      } catch (e2) {
        try {
          // Fallback to gemini-2.0-flash-001 (older stable version)
          model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });
          console.log('Using model: gemini-2.0-flash-001');
        } catch (e3) {
          try {
            // Last resort: gemini-flash-latest
            model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
            console.log('Using model: gemini-flash-latest');
          } catch (e4) {
            throw new Error('No available Gemini models. Please check your API key and available models.');
          }
        }
      }
    }

    const prompt = `Analyze this card image and extract the following information. Return ONLY valid JSON, no markdown, no code blocks, just the JSON object:

{
  "type": "credit" or "debit" or "aadhar" or "pan" or "other",
  "cardNumber": "full card number if visible (all digits, no masking, no spaces or dashes)",
  "cardHolderName": "name on card",
  "expiryDate": "MM/YY format",
  "cvv": "CVV code if visible on the card",
  "bank": "name without 'Bank' word (e.g., HDFC, SBI, ICICI, Axis, etc.)",
  "cardName": "card name/nickname if visible",
  "isValid": true
}

Rules:
- If it's a credit/debit card, extract FULL card number (all 16 digits, no masking), name, expiry, CVV, and name (without "Bank" word, e.g., HDFC, SBI, ICICI)
- Extract CVV if visible on the card (usually 3 digits on the back)
- If it's Aadhar or PAN, extract relevant details
- Extract the complete card number without any masking or formatting
- Identify the name from the card design/logo (use standard names: HDFC, SBI, ICICI, Axis, etc.)
- Return only valid JSON object`;

    let result;
    try {
      // Try the new format first (Gemini 1.5)
      result = await model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        prompt
      ]);
    } catch (apiError) {
      console.error('Gemini API error:', apiError);
      // Fallback to text-only if vision fails
      throw new Error(`Gemini API error: ${apiError.message}`);
    }

    let responseText;
    try {
      responseText = result.response.text();
    } catch (textError) {
      console.error('Error getting response text:', textError);
      // Try alternative method
      const candidates = result.response.candidates;
      if (candidates && candidates[0] && candidates[0].content) {
        responseText = candidates[0].content.parts[0].text;
      } else {
        throw new Error('Unable to extract response text from Gemini API');
      }
    }
    
    // Parse JSON from response
    let extractedData;
    try {
      // Clean response - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      // Extract JSON object
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(cleanedText);
      }
      
      // Validate extracted data
      if (!extractedData.type) {
        extractedData.type = 'other';
      }
      
      // Clean card number - remove spaces, dashes, and keep only digits
      if (extractedData.cardNumber) {
        extractedData.cardNumber = extractedData.cardNumber.replace(/[\s-]/g, '');
      }
      
      // Clean CVV - remove spaces and keep only digits
      if (extractedData.cvv) {
        extractedData.cvv = extractedData.cvv.replace(/\s/g, '');
      }
      
      // Normalize bank name and set type to "other" if no bank found
      extractedData = normalizeExtractedData(extractedData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);
      return res.status(500).json({ 
        error: 'Failed to parse extraction result',
        rawResponse: responseText,
        parseError: parseError.message
      });
    }

    // Update card in database if cardId provided
    if (cardId) {
      const db = admin.firestore();
      await db.collection('cards').doc(cardId).update({
        ...extractedData,
        extractedAt: admin.firestore.FieldValue.serverTimestamp(),
        extractionStatus: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.json({
      success: true,
      data: extractedData
    });
  } catch (error) {
    console.error('Extraction error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error information
    let errorMessage = error.message || 'Unknown error';
    if (error.message && error.message.includes('API key')) {
      errorMessage = 'Gemini API key is invalid or not configured. Please check your .env file.';
    } else if (error.message && error.message.includes('quota')) {
      errorMessage = 'Gemini API quota exceeded. Please check your API limits.';
    } else if (error.message && error.message.includes('fetch')) {
      errorMessage = 'Failed to fetch image from URL. Please check the image URL.';
    }
    
    res.status(500).json({ 
      error: 'Failed to extract card details',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

