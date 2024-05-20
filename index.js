const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;

(async () => {
    // Read Bhojpuri sentences from the file
    const bhojpuriSentences = (await fs.readFile('bhojpuriSentences.txt', 'utf8')).split('\n').filter(sentence => sentence.trim() !== '');

    // Launch a new browser instance
    const browser = await puppeteer.launch({ headless: 'new' ,args: [ "--no-sandbox"]});
    // Open a new page
    const page = await browser.newPage();
    // Navigate to the specified URL
    await page.goto('https://translate.google.com/?hl=hi&sl=bho&tl=en&op=translate');

    // Initialize Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Translations');
    worksheet.columns = [
        { header: 'Bhojpuri Sentence', key: 'bhojpuri' },
        { header: 'Translated Sentence', key: 'translated' }
    ];

    // Loop through each Bhojpuri sentence, translate it, and save in Excel
    for (let i = 0; i < bhojpuriSentences.length; i++) {
        const bhojpuriSentence = bhojpuriSentences[i];

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
        await workbook.xlsx.writeFile('translations.xlsx');
        console.log(`Translation ${i + 1}/${bhojpuriSentences.length} saved to translations.xlsx`);

        // Clear the textarea for the next translation
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea.er8xn');
            textarea.value = '';
        });
    }

    // Close the browser
    await browser.close();
})();
