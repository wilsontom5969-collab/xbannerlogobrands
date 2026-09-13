const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating to https://xbannerlogobrands.vercel.app ...');
  
  const response = await page.goto('https://xbannerlogobrands.vercel.app', { waitUntil: 'networkidle2' });
  
  console.log('HTTP Status:', response.status());
  
  await browser.close();
})();
