export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 🔴 تأكد إن التوكن موجود
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    }

    const { image } = req.body;

    // 🔴 تحقق من حجم الداتا
    if (!image || image.length > 3_500_000) {
      return res.status(413).json({ error: "Image too large after compression" });
    }

    const create = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // 🟢 موديل ثابت ومش محتاج تعقيد
        version: "db21e45e7f1a0e0b8c8e0d8f7a7f1b6a2d4c5e8f9a0b1c2d3e4f5a6b7c8e9f0",
        input: { image }
      })
    });

    const createData = await create.json();

    // 🔥 رجّع أي خطأ من Replicate زي ما هو
    if (createData.error) {
      return res.status(500).json({
        step: "create",
        error: createData.error,
        full: createData
      });
    }

    if (!createData.urls) {
      return res.status(500).json({
        step: "create",
        error: "No URLs returned",
        full: createData
      });
    }

    let output = null;

    for (let i = 0; i < 15; i++) {
      const check = await fetch(createData.urls.get, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });

      const result = await check.json();

      if (result.status === "failed") {
        return res.status(500).json({
          step: "processing",
          error: result.error,
          full: result
        });
      }

      if (result.output) {
        output = result.output[0];
        break;
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    if (!output) {
      return res.status(500).json({
        step: "timeout",
        error: "No output after waiting"
      });
    }

    return res.status(200).json({ output });

  } catch (err) {
    return res.status(500).json({
      step: "server",
      error: err.message
    });
  }
}
