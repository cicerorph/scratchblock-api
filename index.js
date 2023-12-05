const puppeteer = require("puppeteer-core");
const chrome = require("chrome-aws-lambda");
const express = require("express");

const exePath =
  process.platform === "win32"
    ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    : process.platform === "linux"
    ? "/usr/bin/google-chrome"
    : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function getOptions(isDev) {
  let options;
  if (isDev) {
    options = {
      args: [],
      executablePath: exePath,
      headless: true,
    };
  } else {
    options = {
      args: chrome.args,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
    };
  }
  return options;
}

// Create an Express application
const app = express();
const port = 3000; // You can use any port you prefer

app.get('/generate/:q', async (req, res) => {
    const args = req.params.q.split(' ');
    const query = `#?style=scratch3&script=${encodeURIComponent(args.join(' '))}`;

    const isDev = req.query.isDev === "true";

    const options = await getOptions(isDev);

    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    // Navigate to the scratchblocks page
    await page.goto(`https://scratchblocks.github.io/${query}`, {
        waitUntil: ['domcontentloaded', 'load']
    });

    // Wait for the page to load (you may adjust the wait time)
    await page.waitForTimeout(2000);

    // Get the HTML content of the page
    const html = await page.content();
    const identifier = '<a id="export-svg" class="export-link" download="scratchblocks.svg" href="';

    // Find the link to the SVG image
    const linkStart = html.substring(html.indexOf(identifier) + identifier.length);
    const fullLink = decodeURIComponent(linkStart.substring(0, linkStart.indexOf('"')));

    // Open the data URL in a new page
    const urlPage = await browser.newPage();
    await urlPage.goto(fullLink, {
        waitUntil: ['domcontentloaded', 'load']
    });

    // Close the original page
    await page.close();

    // Get width and height of the SVG image
    let svgWidth = 100;
    let svgHeight = 100;
    (() => {
        const a = fullLink.substring(85);
        const b = a.substring(0, a.indexOf('"'));
        svgWidth = Number(b) || 100;
        if (svgWidth > 1920) svgWidth = 1920;
    })();
    (() => {
        const a = fullLink.substring(fullLink.indexOf('height="') + 8);
        const b = a.substring(0, a.indexOf('"'));
        svgHeight = Number(b) || 100;
        if (svgHeight > 1080) svgHeight = 1080;
    })();

    // Generate the image
    const image = await urlPage.screenshot({
        type: 'png',
        omitBackground: true,
        clip: {
            x: 0,
            y: 0,
            width: svgWidth,
            height: svgHeight,
        },
    });

    // Close the new page
    await urlPage.close();

    // Close the browser
    await browser.close();

    // Send the generated image as a response
    res.set('Content-Type', 'image/png');
    res.send(image);
});


// Start the Express server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
