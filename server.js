const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Create a directory for storing downloaded images
const IMAGES_DIR = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Serve static files from the public directory
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));


// Function to download and save image
async function downloadImage(imageUrl) {
    try {
        // Generate a unique filename based on the URL
        const filename = crypto.createHash('md5').update(imageUrl).digest('hex') + '.jpg';
        const filepath = path.join(IMAGES_DIR, filename);

        // Check if we already have this image
        if (fs.existsSync(filepath)) {
            return `/images/${filename}`;
        }

        // Download the image
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'stream',
            timeout: 5000, // 5 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Save the image
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(`/images/${filename}`));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Error downloading image from ${imageUrl}:`, error.message);
        return null;
    }
}

app.get('/', async (req, res) => {
    try {
        // Read and parse the posts file
        const postsFilePath = path.join(__dirname, 'instagram_posts.json');
        const postsData = JSON.parse(fs.readFileSync(postsFilePath, 'utf-8'));

        // Download all images first
        const downloadPromises = postsData.map(async (post) => {
            const localImagePath = await downloadImage(post.image_url);
            return {
                ...post,
                local_image_url: localImagePath || '/images/placeholder.jpg' // Fallback to placeholder if download fails
            };
        });

        const postsWithLocalImages = await Promise.all(downloadPromises);

        // Generate HTML
        const html = `
            <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Posts</title>
    <style>
        :root {
            --bg-primary: #f4f4f4;
            --bg-secondary: #ffffff;
            --accent-primary: #000080;
            --dark-navy: #00004d;
            --text-primary: #333333;
            --text-secondary: #666666;
            --card-bg: #ffffff;
            --glow-color: rgba(0, 0, 128, 0.2);
        }

        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
        }

        h1 {
            text-align: center;
            margin: 40px 0;
            color: var(--accent-primary);
            font-size: 2.5rem;
            font-weight: 600;
            letter-spacing: 2px;
            position: relative;
            padding-bottom: 15px;
            text-shadow: 0 0 10px var(--glow-color);
        }

        h1::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, 
                transparent, 
                var(--accent-primary), 
                transparent
            );
            border-radius: 2px;
        }

        .container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 30px;
            padding: 40px;
            max-width: 1400px;
            margin: 0 auto;
        }

        .post {
            border-radius: 12px;
            overflow: hidden;
            background: var(--card-bg);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            border: 1px solid rgba(0, 0, 128, 0.1);
            display: none; /* Hide all posts initially */
        }

        .post.visible {
            display: block; /* Show only visible posts */
        }

        .post:hover {
            transform: translateY(-10px);
            box-shadow: 0 15px 40px rgba(0, 0, 128, 0.15);
            border-color: rgba(0, 0, 128, 0.3);
        }

        .image-container {
            position: relative;
            width: 100%;
            height: 300px;
            overflow: hidden;
        }

        .image-container::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                to bottom,
                transparent 70%,
                var(--card-bg)
            );
        }

        .post img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
            filter: saturate(1.1) contrast(1.1);
        }

        .post:hover img {
            transform: scale(1.1);
        }

        .content {
            padding: 25px;
            position: relative;
            background: var(--card-bg);
        }

        .caption {
            font-size: 0.95rem;
            color: var(--text-secondary);
            line-height: 1.6;
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-align: left;
        }

        .post-link {
            display: inline-flex;
            align-items: center;
            margin-top: 20px;
            color: var(--accent-primary);
            text-decoration: none;
            font-weight: 500;
            font-size: 0.9rem;
            letter-spacing: 0.5px;
            padding: 8px 16px;
            border-radius: 6px;
            background: rgba(0, 0, 128, 0.1);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .load-more-container {
            text-align: center;
            padding: 20px 0 60px;
        }

        .load-more-btn {
            background: var(--dark-navy);
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 1.1rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(0, 0, 77, 0.2);
        }

        .load-more-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 77, 0.3);
            background: var(--accent-primary);
        }

        .load-more-btn:active {
            transform: translateY(0);
        }

        .load-more-btn.hidden {
            display: none;
        }

        @media (max-width: 768px) {
            .container {
                padding: 20px;
                gap: 20px;
            }

            h1 {
                font-size: 2rem;
                margin: 30px 0;
            }

            .image-container {
                height: 250px;
            }

            .post:hover {
                transform: translateY(-5px);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .post,
            .post-link,
            .post img,
            .load-more-btn {
                transition: none;
            }
            
            .post:hover,
            .load-more-btn:hover {
                transform: none;
            }
            
            .post:hover img {
                transform: none;
            }
        }
    </style>
</head>
<body>
    <h1>Latest Instagram Posts</h1>
    <div class="container">
        ${postsWithLocalImages.map(post => `
            <div class="post">
                <div class="image-container">
                    <img src="${post.local_image_url}" 
                         alt="Instagram Post"
                         onerror="this.src='/images/placeholder.jpg'">
                </div>
                <div class="content">
                    <p class="caption">${post.caption}</p>
                    <a href="${post.post_url}" target="_blank" rel="noopener noreferrer" class="post-link">
                        View on Instagram →
                    </a>
                </div>
            </div>
        `).join('')}
    </div>
    <div class="load-more-container">
        <button class="load-more-btn">Load More</button>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const posts = document.querySelectorAll('.post');
            const loadMoreBtn = document.querySelector('.load-more-btn');
            const postsPerPage = 4;
            let currentlyShown = 0;

            // Function to show next batch of posts
            function showMorePosts() {
                const nextBatch = Array.from(posts).slice(currentlyShown, currentlyShown + postsPerPage);
                nextBatch.forEach(post => post.classList.add('visible'));
                currentlyShown += postsPerPage;

                // Hide button if no more posts to show
                if (currentlyShown >= posts.length) {
                    loadMoreBtn.classList.add('hidden');
                }
            }

            // Show initial posts
            showMorePosts();

            // Add click event listener to load more button
            loadMoreBtn.addEventListener('click', showMorePosts);
        });
    </script>
</body>
</html>
        `;

        res.send(html);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/contactus', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'contactus.html');
    res.sendFile(filePath);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

