const video = document.getElementById("camera");
const canvas = document.getElementById("snapshot");
const result = document.getElementById("result");
const climaDiv = document.getElementById("clima");
const captureBtn = document.getElementById("captureBtn");

// 🌤️ Obtener ubicación y clima actual
async function obtenerClima() {
  if (!navigator.geolocation) {
    climaDiv.innerHTML = "❌ Tu navegador no admite geolocalización.";
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    const apiKey = "98c604119b6a2cae19503435edb7118f"; // <-- Pega aquí tu API key de OpenWeatherMap
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=es`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const ciudad = data.name;
      const temp = data.main.temp;
      const descripcion = data.weather[0].description;

      climaDiv.innerHTML = `📍 ${ciudad} | 🌡️ ${temp}°C | ${descripcion}`;
    } catch (err) {
      climaDiv.innerHTML = "⚠️ No se pudo obtener el clima.";
    }
  });
}

obtenerClima();

// 🎥 Iniciar cámara
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (err) {
    alert("Error al acceder a la cámara: " + err.message);
  }
}
startCamera();

// 🌿 Escanear planta
captureBtn.addEventListener("click", async () => {
  result.innerHTML = "🔍 Analizando planta...";

  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageBase64 = canvas.toDataURL("image/jpeg").split(",")[1];

  // 🔹 Enviar imagen a Plant.id
  const response = await fetch("https://api.plant.id/v2/identify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": "srciMvdUgLgU2ITKrCI1zjLa29XOfIXF0aSY5mXtrTuCZBHL5Q" // <-- Pega aquí tu API key de Plant.id
    },
    body: JSON.stringify({
      images: [imageBase64],
      modifiers: ["crops_fast", "similar_images"],
      plant_language: "es",
      plant_details: ["common_names", "url", "wiki_description", "taxonomy"]
    })
  });

  const data = await response.json();

  if (!data.suggestions || data.suggestions.length === 0) {
    result.innerHTML = "❌ No se pudo identificar la planta.";
    return;
  }

  const plant = data.suggestions[0];
  const climaTexto = climaDiv.innerText || "";

  result.innerHTML = `
    <h2>${plant.plant_name}</h2>
    <p><strong>Nombres comunes:</strong> ${plant.plant_details?.common_names?.join(", ") || "No disponibles"}</p>
    <p><strong>Descripción:</strong> ${plant.plant_details?.wiki_description?.value || "Sin descripción disponible"}</p>
    <p><strong>Clasificación:</strong> ${plant.plant_details?.taxonomy?.class || "Desconocida"}</p>
    <p><strong>Condiciones actuales:</strong> ${climaTexto}</p>
    <p><em>Según el clima, esta planta puede prosperar mejor con ${
      climaTexto.includes("lluvia") ? "alta humedad 🌧️" : "buen sol ☀️"
    }.</em></p>
    <a href="${plant.plant_details?.url}" target="_blank">🌍 Ver más información</a>
  `;
});

