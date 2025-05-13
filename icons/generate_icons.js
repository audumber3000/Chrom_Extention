const puppeteer = require('puppeteer');
const path = require('path');

async function generateIcons() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Load the HTML file
  await page.goto(`file:${path.join(__dirname, 'generate_icons.html')}`);
  
  // Generate icons for each size
  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const canvas = await page.$(`#icon${size}`);
    const screenshot = await canvas.screenshot();
    require('fs').writeFileSync(`icon${size}.png`, screenshot);
  }
  
  await browser.close();
}

generateIcons().catch(console.error); 