const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

const server = http.createServer((req, res) => {

    console.log(`${req.method} ${req.url}`);

    // Home page
    if (req.url === "/" || req.url === "/index.html") {

        const filePath =
            path.join(__dirname, "index.html");

        fs.readFile(filePath, (error, data) => {

            if (error) {

                console.error(error);

                res.writeHead(500, {
                    "Content-Type": "text/plain"
                });

                res.end(
                    "Cat Internet Simulator had a brain explosion. 🐈"
                );

                return;
            }

            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8"
            });

            res.end(data);
        });

        return;
    }

    // Cat information API
    if (req.url === "/api/cat") {

        const facts = [
            "Cats can sleep for many hours a day.",
            "Cats use their whiskers to sense their surroundings.",
            "A group of cats can be called a clowder.",
            "Cats spend a lot of time grooming themselves.",
            "Many cats really like boxes.",
            "Cats have excellent hearing.",
            "Cats can rotate their ears to locate sounds.",
            "Cats can jump surprisingly high."
        ];

        const names = [
            "Mittens",
            "Whiskers",
            "Momo",
            "Bugzi",
            "Cocoachip",
            "Noodle",
            "Pixel",
            "Toebeans"
        ];

        const randomFact =
            facts[Math.floor(Math.random() * facts.length)];

        const randomName =
            names[Math.floor(Math.random() * names.length)];

        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8"
        });

        res.end(
            JSON.stringify({
                name: randomName,
                fact: randomFact
            })
        );

        return;
    }

    // Not found
    res.writeHead(404, {
        "Content-Type": "text/html; charset=utf-8"
    });

    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - Cat Not Found</title>
        </head>
        <body>
            <h1>🐈 404 - Cat Not Found</h1>
            <p>The cat couldn't find that page.</p>
            <a href="/">Go back home</a>
        </body>
        </html>
    `);
});

server.listen(PORT, () => {

    console.log("");
    console.log("🐈 ================================");
    console.log("🐈   CAT INTERNET SIMULATOR ONLINE");
    console.log("🐈 ================================");
    console.log("");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("");
    console.log("🐾 Cat API:");
    console.log(`   http://localhost:${PORT}/api/cat`);
    console.log("");
    console.log("Press CTRL+C to stop the server.");
    console.log("");

});