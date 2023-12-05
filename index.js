const express = require('express');
const scratchblocks = require('scratchblocks');

const app = express();
const port = 3000;

app.get('/generate/:q', (req, res) => {
  // Get the parameter 'q' from the request
  const query = req.params.q;

  // Replace '\n' with a newline character
  const formattedQuery = query.replace(/\\n/g, '\n');

  // Use scratchblocks to generate the image
  const svgCode = scratchblocks.parse(formattedQuery);
  const svgBuffer = Buffer.from(svgCode);

  // Send the image as a response
  res.set('Content-Type', 'image/svg+xml');
  res.send(svgBuffer);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
