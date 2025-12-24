import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Form parse error" });
    }

    const { nickname, email, token } = fields;
    const skin = files.skin;

    if (!nickname || !email || !token || !skin) {
      return res.status(400).json({ error: "Missing fields" });
    }

    /* 🔐 reCAPTCHA */
    const verify = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`
      }
    );

    const captcha = await verify.json();
    if (!captcha.success) {
      return res.status(403).json({ error: "Captcha failed" });
    }

    /* 📎 Read file */
    const fileBuffer = fs.readFileSync(skin.filepath);

    /* 📤 Discord webhook */
    const payload = new FormData();
    payload.append(
      "payload_json",
      JSON.stringify({
        embeds: [{
          title: "🟢 Нова реєстрація MineBeta",
          fields: [
            { name: "👤 Нік", value: nickname },
            { name: "📧 Email", value: email }
          ],
          image: { url: "attachment://skin.png" },
          timestamp: new Date().toISOString()
        }]
      })
    );

    payload.append("file", new Blob([fileBuffer]), "skin.png");

    await fetch(process.env.DISCORD_WEBHOOK, {
      method: "POST",
      body: payload
    });

    res.status(200).json({ success: true });
  });
}

