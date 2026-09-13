const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  await page.goto('http://localhost:8788', { waitUntil: 'networkidle0' });
  
  const result = await page.evaluate(() => {
    // Let's find all images on the page
    const imgs = document.querySelectorAll('img');
    const supabaseImg = Array.from(imgs).find(img => img.src.includes('supabase.co'));
    
    // Let's also look for the text '22,000' (the bid amount for big-1)
    let bidElement = null;
    let slotHtml = '';
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      if (div.innerText && div.innerText.includes('22,000')) {
        bidElement = div;
        break;
      }
    }
    
    if (bidElement) {
      // Get the outer HTML of the parent element (the slot container)
      slotHtml = bidElement.parentElement ? bidElement.parentElement.outerHTML : bidElement.outerHTML;
    }

    if (!supabaseImg) {
      return {
        found: false,
        totalImages: imgs.length,
        allSrcs: Array.from(imgs).map(i => i.src),
        slotHtml: slotHtml
      };
    }
    
    return {
      found: true,
      src: supabaseImg.src,
      width: supabaseImg.naturalWidth,
      height: supabaseImg.naturalHeight,
      complete: supabaseImg.complete,
      slotHtml: slotHtml
    };
  });
  
  console.log("DOM INSPECTION RESULT:");
  console.log(JSON.stringify(result, null, 2));
  
  await browser.close();
})();
