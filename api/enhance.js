export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body;

    // 🟢 موديل مضمون لتحسين الصور
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "928360fa8a0c5c90d67c1c1a9b3f4e0d2e8a8b3c2d1e0f9a8b7c6d5e4f3a2b1",
        input: {
          image: image,
          scale: 2
        }
      })
    });

    const data = await response.json();

    if (!data.urls) {
      return res.status(500).json({ error: data });
    }

    let output = null;

    // 🔄 ننتظر النتيجة
    while (!output) {
      const check = await fetch(data.urls.get, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });

      const result = await check.json();

      if (result.status === "failed") {
        return res.status(500).json({ error: result });
      }

      output = result.output?.[0];

      await new Promise(r => setTimeout(r, 1500));
    }

    return res.status(200).json({ output });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
