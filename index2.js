const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const express = require('express');

const app = express();

// MongoDB connection string
const uri = 'mongodb+srv://himanshu:Himanshu1@cluster0.hlde7tl.mongodb.net/naTours?retryWrites=true&w=majority';

// Translation schema
const translationSchema = new mongoose.Schema({
  bhojpuri: String,
  translated: String
});

const Translation = mongoose.model('Translation', translationSchema);

(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Read Bhojpuri sentences from the file
    const bhojpuriSentences = (await fs.readFile('bhojpuriSentences.txt', 'utf8')).split('\n').filter(sentence => sentence.trim() !== '');

    let browser;

    // Loop through each Bhojpuri sentence, translate it, and save in MongoDB
    for (let i = 0; i < bhojpuriSentences.length; i++) {
      try {
        const bhojpuriSentence = bhojpuriSentences[i];

        // Launch a new browser instance if it doesn't exist or was closed due to an error
        if (!browser || !await isBrowserOpen(browser)) {
          browser = await puppeteer.launch({ headless: 'new', args: ["--no-sandbox"] });
        }

        // Open a new page
        const page = await browser.newPage();
        // Navigate to the specified URL
        await page.goto('https://translate.google.com/?hl=hi&sl=bho&tl=en&op=translate');

        // Type the Bhojpuri text into the textarea
        await page.type('textarea.er8xn', bhojpuriSentence);

        //await page.waitForTimeout(5000);

        // Wait for translation to appear
        await page.waitForSelector('div.lRu31');

        // Extract the translated text
        const translation = await page.evaluate(() => {
          const translationElement = document.querySelector('div.lRu31');
          return translationElement.innerText.trim();
        });

        // Create a new translation document and save it to MongoDB
        const translationDoc = new Translation({
          bhojpuri: bhojpuriSentence,
          translated: translation
        });
        await translationDoc.save();
        console.log(`Translation ${i + 1}/${bhojpuriSentences.length} saved to MongoDB`);

        // Close the current page
        await page.close();
      } catch (error) {
        console.error(`An error occurred for sentence ${i + 1}:`, error);

        // Close the browser if an error occurs
        if (browser) {
          await browser.close();
          browser = null;
        }
      }
    }

    // Close the browser after all iterations are complete
    if (browser) {
      await browser.close();
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
})();

// API endpoint to retrieve all translations
app.get('/translations', async (req, res) => {
  try {
    // Retrieve all translations from MongoDB
    const translations = await Translation.find();

    // Send the translations as a JSON response
    res.json(translations);
  } catch (error) {
    console.error('Error retrieving translations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Helper function to check if the browser is still open
async function isBrowserOpen(browser) {
  try {
    await browser.version();
    return true;
  } catch (error) {
    return false;
  }
}