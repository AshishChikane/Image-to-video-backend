const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Ensure the uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Configure multer for image upload
const upload = multer({
    dest: UPLOADS_DIR,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});


// API Route to upload an image and create a video
app.post('/generate-video', upload.single('image'), (req, res) => {
    const image = req.file;
    const duration = parseInt(req.body.duration);
    const width = parseInt(req.body.width);   // Get width from request
    const height = parseInt(req.body.height); // Get height from request

    // Validate inputs
    if (!image || isNaN(duration) || duration <= 0 || isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        return res.status(400).json({ error: "Invalid input" });
    }

    const imagePath = image.path;
    const outputFileName = `${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, 'uploads', outputFileName);

    ffmpeg()
        .input(imagePath)
        .inputOptions('-loop 1') // Loop the image for the duration
        .outputOptions([`-t ${duration}`, '-r 30', '-pix_fmt yuv420p']) // Set frame rate and pixel format
        .videoFilter(`scale=${width}:${height}`) // Scale video to specified width and height
        .output(outputPath)
        .on('end', () => {
            const videoUrl = `/uploads/${outputFileName}`;

            // Send the video URL as a JSON response
            res.status(200).json({ videoUrl });

            // Clean up the uploaded image after the video is generated
            fs.unlinkSync(imagePath);
        })
        .on('error', (err) => {
            console.error(`FFmpeg Error: ${err.message}`);
            res.status(500).json({ error: "Error generating video" });

            // Clean up the image in case of an error
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        })
        .run();
});



app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
server.setTimeout(120000);  // 120 seconds