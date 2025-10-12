const video = document.getElementById("camera");
const canvas = document.getElementById("snapshot");
const result = document.getElementById("result");
const climaDiv = document.getElementById("clima");
const captureBtn = document.getElementById("captureBtn");

let currentFacing = "environment"; // 👈 cámara actual (trasera por defecto)
let currentStream = null;
let track = null;
let flashOn = false; // estado del flash

// 🌤️ Obtener ubicación y clima actual
async function obtenerClima() {
  if (!navigator.geolocation) {
    climaDiv.innerHTML = "❌ Tu navegador no admite geolocalización.";
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    const apiKey = "98c604119b6a2cae19503435edb7118f";
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=es`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const ciudad = data.name;
      const temp = data.main.temp;
      const descripcion = data.weather[0].description;
      climaDiv.innerHTML = `📍 ${ciudad} | 🌡️ ${temp}°C | ${descripcion}`;
    } catch {
      climaDiv.innerHTML = "⚠️ No se pudo obtener el clima.";
    }
  });
}
obtenerClima();

// 🎥 Iniciar cámara
async function startCamera(facingMode = "environment") {
  try {
    // Detener stream anterior si existe
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } }
    });

    currentStream = stream;
    video.srcObject = stream;

    track = stream.getVideoTracks()[0];
  } catch (err) {
    alert("Error al acceder a la cámara: " + err.message);
  }
}
startCamera(currentFacing);

// 🔄 Alternar cámara
const switchBtn = document.createElement("button");
switchBtn.textContent = "🔁 Cambiar cámara";
switchBtn.style.margin = "10px";
document.body.insertBefore(switchBtn, captureBtn);

switchBtn.addEventListener("click", async () => {
  currentFacing = currentFacing === "environment" ? "user" : "environment";
  await startCamera(currentFacing);
});

// 💡 Activar/desactivar flash (si es compatible)
const flashBtn = document.createElement("button");
flashBtn.textContent = "💡 Flash";
flashBtn.style.margin = "10px";
document.body.insertBefore(flashBtn, captureBtn);

flashBtn.addEventListener("click", async () => {
  if (!track) return alert("Primero activa la cámara");

  const capabilities = track.getCapabilities();
  if (!capabilities.torch) {
    alert("⚠️ Tu dispositivo no soporta flash con la cámara del navegador.");
    return;
  }

  flashOn = !flashOn;
  try {
    await track.applyConstraints({ advanced: [{ torch: flashOn }] });
    flashBtn.textContent = flashOn ? "💡 Flash ON" : "💡 Flash OFF";
  } catch (e) {
    alert("No se pudo activar el flash: " + e.message);
  }
});

// 🌿 Escanear planta
captureBtn.addEventListener("click", async () => {
  result.innerHTML = "🔍 Analizando planta...";

  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageBase64 = canvas.toDataURL("image/jpeg").split(",")[1];

  try {
    const response = await fetch("https://api.plant.id/v2/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": "srciMvdUgLgU2ITKrCI1zjLa29XOfIXF0aSY5mXtrTuCZBHL5Q"
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
  } catch (error) {
    console.error("Error en la identificación:", error);
    result.innerHTML = "⚠️ Hubo un error al analizar la planta.";
  }
});


