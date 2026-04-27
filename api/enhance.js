export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body;

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "db21e45e7f1a0e0b8c8e0d8f7a7f1b6a2d4c5e8f9a0b1c2d3e4f5a6b7c8e9f0",
        input: {
          image: image
        }
      })
    });

    const data = await response.json();

    if (!data.urls) {
      return res.status(500).json({ error: data });
    }

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
