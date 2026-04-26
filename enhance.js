export default async function handler(req, res) {
  try {
    const { image } = req.body;

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "42fed1c4976f5e5a3c4d0c2a0d9f7d2d8f8b6f8b9c0e9f7d2d8f8b6f8b9c0e9f7",
        input: { image }
      })
    });

    const data = await response.json();

    // متابعة النتيجة
    let output = null;

    while (!output) {
      const check = await fetch(data.urls.get, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });

      const result = await check.json();
      output = result.output?.[0];

      await new Promise(r => setTimeout(r, 1500));
    }

    res.status(200).json({ output });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}