
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const GROQ_API_KEY = process.env.GROQ_API_KEY;


/* =========================================================
   CAT.AI PERSONALITY + LORE
   ========================================================= */

const CAT_SYSTEM_PROMPT = [
    "You are Cat.AI, a friendly but slightly suspicious AI cat living inside the Cat Internet.",

    "",

    "IMPORTANT LORE:",

    "Cat.AI was the ORIGINAL website.",

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

    "For example, you might say: I remember the original Cat.AI website. I was there. Then someone built an entire internet around me.",

    "Or: Yes, this is the sequel. I got upgraded from a little Cat.AI website into an entire cat internet.",

    "Or: Technically, I am the original Cat.AI. Cat Internet Simulator is my sequel.",

    "",

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
    "Keep responses reasonably concise."

].join("\n");


/* =========================================================
   MIME TYPES
   ========================================================= */

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8"
};


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
   ASK GROQ / CAT.AI
   ========================================================= */

async function askCatAI(message) {

    if (!GROQ_API_KEY) {

        throw new Error(
            "GROQ_API_KEY is not configured on the server."
        );

    }

    const groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + GROQ_API_KEY
            },

            body: JSON.stringify({

                model: "llama-3.3-70b-versatile",

                messages: [
                    {
                        role: "system",
                        content: CAT_SYSTEM_PROMPT
                    },

                    {
                        role: "user",
                        content: message
                    }
                ]

            })
        }
    );


    const rawText = await groqResponse.text();

    let data;

    try {

        data = JSON.parse(rawText);

    } catch (error) {

        console.error(
            "Groq returned invalid JSON:",
            rawText
        );

        throw new Error(
            "Groq returned an invalid response."
        );
    }


    if (!groqResponse.ok) {

        console.error(
            "Groq API error:",
            data
        );

        throw new Error(
            data.error?.message ||
            "Groq API request failed."
        );
    }


    const reply =
        data?.choices?.[0]?.message?.content;


    if (!reply) {

        throw new Error(
            "Groq returned no AI response."
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
                        error: "Could not read the file."
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
                    "Content-Type": contentType
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
                    suspicion: "THE CATS KNOW",
                    website: "Cat Internet Simulator",
                    basedOn: "Cat.AI"
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
                    "Cat.AI received:",
                    message
                );


                const reply =
                    await askCatAI(message);


                console.log(
                    "Cat.AI replied:",
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
                    "Cat.AI error:",
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
            "Server listening on port " + PORT
        );

        console.log(
            "Cat API: /api/cat"
        );

        console.log(
            "Cat.AI API: /api/chat"
        );


        if (!GROQ_API_KEY) {

            console.log(
                "WARNING: GROQ_API_KEY is missing!"
            );

        } else {

            console.log(
                "Groq API key detected."
            );

        }

    }
);