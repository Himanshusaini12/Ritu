const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;

(async () => {
    try {
        // Read Bhojpuri sentences from the file
        const bhojpuriSentences = (await fs.readFile('bhojpuriSentences.txt', 'utf8')).split('\n').filter(sentence => sentence.trim() !== '');

        // Initialize Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Translations5');
        worksheet.columns = [
            { header: 'Bhojpuri Sentence', key: 'bhojpuri' },
            { header: 'Translated Sentence', key: 'translated' }
        ];

        let browser;

        // Loop through each Bhojpuri sentence, translate it, and save in Excel
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

                await page.waitForTimeout(5000);

                // Wait for translation to appear
                await page.waitForSelector('div.lRu31');

                // Extract the translated text
                const translation = await page.evaluate(() => {
                    const translationElement = document.querySelector('div.lRu31');
                    return translationElement.innerText.trim();
                });

                // Add the translation to Excel worksheet
                worksheet.addRow({ bhojpuri: bhojpuriSentence, translated: translation });

                // Save the Excel file after each iteration
                await workbook.xlsx.writeFile('translations5.xlsx');
                console.log(`Translation ${i + 1}/${bhojpuriSentences.length} saved to translations.xlsx`);

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

// Helper function to check if the browser is still open
async function isBrowserOpen(browser) {
    try {
        await browser.version();
        return true;
    } catch (error) {
        return false;
    }
}
