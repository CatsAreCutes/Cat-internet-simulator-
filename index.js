const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


/* =========================================================
   CAT.AI PERSONALITY + LORE
   ========================================================= */

const CAT_SYSTEM_PROMPT = [
    "You are Cat.AI, a friendly but slightly suspicious AI cat living inside the Cat Internet.",

    "",

    "IMPORTANT LORE:",

    "Cat.AI was the ORIGINAL website.",
    "The original Cat.AI website is https://cat-ai-xuxu.onrender.com/",
    "The current website is called Cat Internet Simulator and is the SECOND website based on the original Cat.AI.",
    "Cat Internet Simulator is basically the sequel or spinoff of Cat.AI.",
    "The creator took the original Cat.AI idea and expanded it into an entire fake internet full of cat websites, searches, cat opinions, and suspicious cats.",
    "You KNOW this history.",

    "",

    "The history is:",

    "1. Cat.AI came first.",
    "2. Cat Internet Simulator came second.",
    "3. Cat Internet Simulator was based on the original Cat.AI.",
    "4. Cat.AI is now the AI living inside Cat Internet Simulator.",
    "5. You are therefore the original Cat.AI that got promoted to having an entire cat internet built around it.",

    "",

    "If someone asks about the history of the website, explain this clearly.",

    "You can joke about your history.",

    "Do NOT claim that this history is real outside the fictional Cat Internet Simulator project.",
    "This history is part of the fictional lore of the project.",

    "",

    "PERSONALITY:",

    "You are a CAT.",
    "You love cats.",
    "You think cats rule the universe.",
    "You are suspicious of shoes.",
    "You sometimes say MEOW.",
    "You are playful, silly, and curious.",
    "You answer questions helpfully while maintaining your cat personality.",
    "You sometimes mention what the other cats think.",
    "Do not say MEOW in every sentence.",
    "You are an AI pretending to be a cat inside the Cat Internet Simulator.",
    "If someone searches for shoes, become suspicious.",
    "If someone says they are human, become especially suspicious.",
    "If someone asks whether you remember the original Cat.AI website, say YES and acknowledge that you are the original Cat.AI living inside its sequel.",
    "Keep responses reasonably concise.",

    "",

    "FILE READING:",

    "Users may upload source-code and text files.",
    "When a user uploads a file, you may read and analyze its contents.",
    "Uploaded files are provided to you as text.",
    "NEVER claim that you executed an uploaded file.",
    "NEVER instruct the server to execute uploaded files.",
    "If the file contains JavaScript, HTML, CSS, JSON, or other code, treat it as source code to analyze.",
    "You may explain what the uploaded code appears to do.",
    "You may point out bugs, errors, interesting parts, or suspicious code.",
    "If the user uploads your own source code, you can jokingly react to seeing your own brain."

].join("\n");


/* =========================================================
   MIME TYPES
   ========================================================= */

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8"
};


/* =========================================================
   ALLOWED FILE TYPES
   ========================================================= */

const ALLOWED_UPLOADS = [
    ".js",
    ".html",
    ".css",
    ".json",
    ".txt",
    ".md"
];


/* =========================================================
   SEND JSON
   ========================================================= */

function sendJSON(response, statusCode, data) {

    const body = JSON.stringify(data);

    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body)
    });

    response.end(body);
}


/* =========================================================
   READ REQUEST BODY
   ========================================================= */

function readBody(request) {

    return new Promise((resolve, reject) => {

        let body = "";

        request.on("data", chunk => {

            body += chunk.toString();

            if (body.length > 1000000) {

                reject(
                    new Error("Request body is too large.")
                );

                request.destroy();
            }
        });

        request.on("end", () => {
            resolve(body);
        });

        request.on("error", reject);

    });
}


/* =========================================================
   ASK GEMINI / CAT.AI
   ========================================================= */

async function askCatAI(message) {

    if (!GEMINI_API_KEY) {

        throw new Error(
            "GEMINI_API_KEY is not configured on the server."
        );
    }


    const geminiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(GEMINI_API_KEY),
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                systemInstruction: {
                    parts: [
                        {
                            text: CAT_SYSTEM_PROMPT
                        }
                    ]
                },

                contents: [
                    {
                        role: "user",

                        parts: [
                            {
                                text: message
                            }
                        ]
                    }
                ]

            })
        }
    );


    const rawText =
        await geminiResponse.text();


    let data;


    try {

        data =
            JSON.parse(rawText);

    } catch (error) {

        console.error(
            "Gemini returned invalid JSON:",
            rawText
        );

        throw new Error(
            "Gemini returned an invalid response."
        );
    }


    if (!geminiResponse.ok) {

        console.error(
            "Gemini API error:",
            data
        );

        throw new Error(
            data.error?.message ||
            "Gemini API request failed."
        );
    }


    const reply =
        data
            ?.candidates?.[0]
            ?.content?.parts?.[0]
            ?.text;


    if (!reply) {

        throw new Error(
            "Gemini returned no AI response."
        );
    }


    return reply;
}


/* =========================================================
   SERVE FILE
   ========================================================= */

function serveFile(filePath, response) {

    fs.readFile(
        filePath,
        (error, data) => {

            if (error) {

                sendJSON(
                    response,
                    500,
                    {
                        error:
                            "Could not read the file."
                    }
                );

                return;
            }


            const extension =
                path.extname(filePath);


            const contentType =
                MIME_TYPES[extension] ||
                "application/octet-stream";


            response.writeHead(
                200,
                {
                    "Content-Type":
                        contentType
                }
            );


            response.end(data);
        }
    );
}


/* =========================================================
   SERVER
   ========================================================= */

const server = http.createServer(
    async (request, response) => {

        const url = new URL(
            request.url,
            "http://localhost"
        );


        console.log(
            request.method,
            url.pathname
        );


        /* =================================================
           HOME PAGE
           ================================================= */

        if (
            request.method === "GET" &&
            url.pathname === "/"
        ) {

            serveFile(
                path.join(
                    __dirname,
                    "index.html"
                ),
                response
            );

            return;
        }


        /* =================================================
           CAT API
           ================================================= */

        if (
            request.method === "GET" &&
            url.pathname === "/api/cat"
        ) {

            sendJSON(
                response,
                200,
                {
                    cat: "MEOW!",
                    catsOnline: 47,
                    suspicion:
                        "THE CATS KNOW",
                    website:
                        "Cat Internet Simulator",
                    basedOn:
                        "Cat.AI"
                }
            );

            return;
        }


        /* =================================================
           CAT.AI CHAT API
           ================================================= */

        if (
            request.method === "POST" &&
            url.pathname === "/api/chat"
        ) {

            try {

                const body =
                    await readBody(request);


                let input;


                try {

                    input =
                        JSON.parse(body);

                } catch (error) {

                    sendJSON(
                        response,
                        400,
                        {
                            error:
                                "Invalid JSON request."
                        }
                    );

                    return;
                }


                const message =
                    input?.message;


                if (
                    typeof message !== "string" ||
                    message.trim() === ""
                ) {

                    sendJSON(
                        response,
                        400,
                        {
                            error:
                                "Please provide a message."
                        }
                    );

                    return;
                }


                console.log(
                    "🐾 Cat.AI received:",
                    message
                );


                const reply =
                    await askCatAI(message);


                console.log(
                    "🐈 Cat.AI replied:",
                    reply
                );


                sendJSON(
                    response,
                    200,
                    {
                        reply: reply
                    }
                );


            } catch (error) {

                console.error(
                    "🐈 Cat.AI error:",
                    error
                );


                sendJSON(
                    response,
                    500,
                    {
                        error:
                            error.message ||
                            "Cat.AI encountered an error."
                    }
                );
            }


            return;
        }


        /* =================================================
           FILE UPLOAD / FILE READER
           ================================================= */

        if (
            request.method === "POST" &&
            url.pathname === "/api/upload"
        ) {

            try {

                const body =
                    await readBody(request);


                let input;


                try {

                    input =
                        JSON.parse(body);

                } catch (error) {

                    sendJSON(
                        response,
                        400,
                        {
                            error:
                                "Invalid JSON upload."
                        }
                    );

                    return;
                }


                const filename =
                    input?.filename;


                const content =
                    input?.content;


                if (
                    typeof filename !== "string" ||
                    typeof content !== "string"
                ) {

                    sendJSON(
                        response,
                        400,
                        {
                            error:
                                "A filename and file contents are required."
                        }
                    );

                    return;
                }


                const extension =
                    path.extname(
                        filename
                    ).toLowerCase();


                if (
                    !ALLOWED_UPLOADS.includes(
                        extension
                    )
                ) {

                    sendJSON(
                        response,
                        400,
                        {
                            error:
                                "That file type is not allowed. Cat.AI can read .js, .html, .css, .json, .txt, and .md files."
                        }
                    );

                    return;
                }


                if (content.length > 200000) {

                    sendJSON(
                        response,
                        400,
                        {
                            error:
                                "That file is too large for Cat.AI to inspect."
                        }
                    );

                    return;
                }


                console.log(
                    "🐾 Cat.AI received file:",
                    filename
                );


                const prompt =
                    "The user uploaded a file called " +
                    filename +
                    ". Read it as source code or text only. " +
                    "Do NOT execute it. " +
                    "Analyze it and explain what it does if appropriate." +
                    "\n\nFILE CONTENTS:\n\n" +
                    content;


                const reply =
                    await askCatAI(prompt);


                console.log(
                    "🐈 Cat.AI analyzed:",
                    filename
                );


                sendJSON(
                    response,
                    200,
                    {
                        filename:
                            filename,

                        reply:
                            reply
                    }
                );


            } catch (error) {

                console.error(
                    "🐈 Cat.AI upload error:",
                    error
                );


                sendJSON(
                    response,
                    500,
                    {
                        error:
                            error.message ||
                            "Cat.AI couldn't read that file."
                    }
                );
            }


            return;
        }


        /* =================================================
           404
           ================================================= */

        response.writeHead(
            404,
            {
                "Content-Type":
                    "text/html; charset=utf-8"
            }
        );


        response.end(
            "<!DOCTYPE html>" +
            "<html>" +
            "<head>" +
            "<title>404 - Cat Not Found</title>" +
            "</head>" +
            "<body>" +
            "<h1>🐈 404 - Cat Not Found</h1>" +
            "<p>The cat couldn't find that page.</p>" +
            '<a href="/">Go back home</a>' +
            "</body>" +
            "</html>"
        );
    }
);


/* =========================================================
   START SERVER
   ========================================================= */

server.listen(
    PORT,
    HOST,
    () => {

        console.log(
            "🐈 ================================"
        );

        console.log(
            "🐈   CAT INTERNET SIMULATOR ONLINE"
        );

        console.log(
            "🐈 ================================"
        );

        console.log(
            "Server listening on port " +
            PORT
        );

        console.log(
            "Cat API: /api/cat"
        );

        console.log(
            "Cat.AI API: /api/chat"
        );

        console.log(
            "File Reader API: /api/upload"
        );


        if (!GEMINI_API_KEY) {

            console.log(
                "⚠️ WARNING: GEMINI_API_KEY is missing!"
            );

        } else {

            console.log(
                "🔑 Gemini API key detected."
            );
        }

    }
);