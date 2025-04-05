
const puppeteer = require('puppeteer');
const fs = require('fs');
const url = process.argv[2];

async function extractContent(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
  } catch (err) {
    console.error('Failed to load:', url);
    return null;
  }

  const data = await page.evaluate(() => {
    const getText = (selector) => Array.from(document.querySelectorAll(selector)).map(el => el.innerText.trim()).filter(Boolean);
    return {
      url: window.location.href,
      title: [document.title],
      h1: getText('h1'),
      h2: getText('h2'),
      paragraphs: getText('p'),
      listItems: getText('li'),
      tableData: []  // Extend as needed
    };
  });

  return data;
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const visited = new Set();
  const toVisit = [url];
  const results = [];

  while (toVisit.length > 0) {
    const currentUrl = toVisit.shift();
    if (visited.has(currentUrl)) continue;

    console.log('Scraping:', currentUrl);
    visited.add(currentUrl);
    const content = await extractContent(page, currentUrl);
    if (content) results.push(content);

    // Find internal links to follow
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => href.startsWith(location.origin))
    );
    links.forEach(link => {
      if (!visited.has(link)) toVisit.push(link);
    });
  }

  await browser.close();
  fs.writeFileSync('output.json', JSON.stringify({ pages: results }, null, 2));
  console.log('Scraping complete. Output saved to output.json');
})();
