const express = require("express");
const puppeteer = require("puppeteer-core");
const chrome = require("chrome-aws-lambda");

const app = express();
const port = process.env.PORT || 3000;

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

async function generateBlocksImage(args, browser) {
  // Logic to generate blocks image goes here
  // Adapt this part based on your requirements
  const page = await browser.newPage();
  const query = `#?style=scratch3&script=${encodeURIComponent(args.join(' '))}`;
  await page.goto(`https://scratchblocks.github.io/${query}`, {
    waitUntil: ['domcontentloaded', 'load']
  });

  // Rest of the logic to grab blocks, similar to your previous code...

  const image = await page.screenshot({
    type: 'png',
  });

  // Close the page
  await page.close();

  return image;
}

app.get('/:page', async (req, res) => {
  const pageToScreenshot = req.params.page;
  const isDev = req.query.isDev === "true";
  const blocksArgs = req.query.q; // Assuming you pass blocksArgs as a query parameter

  try {
    if (!pageToScreenshot.includes("https://")) {
      res.status(404).json({
        body: "Sorry, we couldn't screenshot that page. Did you include https://?",
      });
      return;
    }

    const options = await getOptions(isDev);
    const browser = await puppeteer.launch(options);

    // Screenshot logic
    const pageScreenshot = await generatePageScreenshot(pageToScreenshot, browser);

    // Blocks image logic
    const blocksImage = await generateBlocksImage(blocksArgs, browser);

    await browser.close();

    res.status(200).header("Content-Type", "image/png").send(blocksImage);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      body: "Sorry, Something went wrong!",
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
