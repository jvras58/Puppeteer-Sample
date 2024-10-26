import puppeteer from "puppeteer";
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Defina como false para ver o navegador em ação (útil para depuração)
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.goto('https://converter.app/mp3-to-midi/');

  await page.waitForSelector('#form-element');

  const filePath = path.resolve(process.cwd(), 'famintø.mp3');

  const inputUploadHandle = await page.$('input[type=file]');
  await inputUploadHandle.uploadFile(filePath);

  await new Promise(resolve => setTimeout(resolve, 5000));

  const closeAdButton = await page.$('.close-ad-button-selector')
  if (closeAdButton) {
    await closeAdButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000)); 
  }

  await page.screenshot({ path: 'before_click.png' });

  const submitButton = await page.$('button[type=submit]');
  await submitButton.click();

  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  await page.waitForSelector('#text', { visible: true });

  const downloadButton = await page.waitForSelector('.btn', { visible: true });

  await downloadButton.click();

  const midiDir = path.resolve(process.cwd(), 'mp3-to-midi');
  if (!fs.existsSync(midiDir)) {
    fs.mkdirSync(midiDir);
  }

  await page.screenshot({ path: path.join(midiDir, 'converter-midi.png') });

  await browser.close();
})();