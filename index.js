let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  // running on the Vercel platform.
  const chrome = require('chrome-aws-lambda');
  const puppeteer = require('puppeteer-core');
} else {
  // running locally.
  const puppeteer = require('puppeteer');
}

// Create an Express application
const app = express();
const port = 3000; // You can use any port you prefer

app.get('/generate/:q', async (req, res) => {
    const args = req.params.q.split(' ');
    const query = `#?style=scratch3&script=${encodeURIComponent(args.join(' '))}`;

    const browser = await chrome.puppeteer.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
    });

    
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
