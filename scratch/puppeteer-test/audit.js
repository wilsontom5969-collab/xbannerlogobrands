const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runAudit() {
  console.log('Starting frontend audit on https://xbannerlogobrands.vercel.app ...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => logs.push(`[PAGE ERROR] ${error.message}`));

  try {
    await page.goto('https://xbannerlogobrands.vercel.app', { waitUntil: 'networkidle0' });
    console.log('1. Homepage loaded.');
    
    await page.screenshot({ path: path.join(__dirname, 'audit_home.png') });

    const slots = await page.$$('.banner-slot');
    console.log(`2. Found ${slots.length} banner slots.`);

    const liveSlots = await page.$$eval('.banner-slot.status-live', els => els.length);
    const availableSlots = await page.$$eval('.banner-slot.status-available', els => els.length);
    console.log(`3. Live slots: ${liveSlots}, Available slots: ${availableSlots}`);

    // Click an available slot
    const availableSlotBtn = await page.$('.banner-slot.status-available');
    if (availableSlotBtn) {
      await availableSlotBtn.click();
      console.log('4. Clicked available slot.');
      await page.waitForSelector('.checkout-modal', { timeout: 5000 });
      console.log('5. Checkout modal opened.');
      
      const title = await page.$eval('.checkout-modal h2', el => el.innerText);
      const minBid = await page.$eval('.checkout-modal .min-bid', el => el.innerText).catch(() => 'N/A');
      console.log(`6. Modal Title: ${title}, Min Bid Displayed: ${minBid}`);
      
      await page.screenshot({ path: path.join(__dirname, 'audit_modal.png') });
    }

    console.log('\n--- BROWSER CONSOLE LOGS ---');
    console.log(logs.join('\n') || 'No errors or warnings.');
    
  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await browser.close();
  }
}

runAudit();
