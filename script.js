document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  const form = document.getElementById("prediction-form");
  const btnSample = document.getElementById("btn-sample");
  const btnSubmit = document.getElementById("btn-submit");
  const btnText = btnSubmit.querySelector(".btn-text");
  const spinner = btnSubmit.querySelector(".spinner");

  const stateEmpty = document.getElementById("state-empty");
  const stateSuccess = document.getElementById("state-success");
  const stateError = document.getElementById("state-error");

  const predictedClassElem = document.getElementById("predicted-class");
  const topConfidenceElem = document.getElementById("top-confidence");
  const probabilityContainer = document.getElementById("probability-container");
  const errorMessage = document.getElementById("error-message");

  // Standard Room Types matching NYC Airbnb dataset
  const DEFAULT_CLASSES = [
    "Entire home/apt",
    "Private room",
    "Shared room",
    "Hotel room"
  ];

  // Preset sample data for quick testing
  const sampleData = {
    latitude: 40.75889,
    longitude: -73.98513,
    price: 220,
    minimum_nights: 2,
    number_of_reviews: 86,
    reviews_per_month: 2.15,
    calculated_host_listings_count: 2,
    availability_365: 280,
    neighbourhood_group: "Manhattan",
    neighbourhood: "Theater District"
  };

  // Fill sample button listener
  btnSample.addEventListener("click", () => {
    Object.keys(sampleData).forEach((key) => {
      const field = document.getElementById(key);
      if (field) field.value = sampleData[key];
    });
  });

  // Form submit listener
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Form data extraction & parsing
    const rawData = new FormData(form);
    const payload = {
      latitude: parseFloat(rawData.get("latitude")),
      longitude: parseFloat(rawData.get("longitude")),
      price: parseFloat(rawData.get("price")),
      minimum_nights: parseInt(rawData.get("minimum_nights"), 10),
      number_of_reviews: parseInt(rawData.get("number_of_reviews"), 10),
      reviews_per_month: parseFloat(rawData.get("reviews_per_month")),
      calculated_host_listings_count: parseInt(rawData.get("calculated_host_listings_count"), 10),
      availability_365: parseInt(rawData.get("availability_365"), 10),
      neighbourhood_group: (rawData.get("neighbourhood_group") || "").trim(),
      neighbourhood: (rawData.get("neighbourhood") || "").trim()
    };

    // Client-side validation check
    for (let key in payload) {
      if (payload[key] === "" || (typeof payload[key] === "number" && isNaN(payload[key]))) {
        alert(`Please complete the "${key.replace(/_/g, ' ')}" field correctly.`);
        return;
      }
    }

    setLoadingState(true);

    try {
      // Dynamic base URL: Works on Live Server (port 5500), FastAPI local (port 8000), and Render
      const isLiveServer = window.location.port === "5500";
      const baseUrl = isLiveServer ? "http://127.0.0.1:8000" : "";

      const response = await fetch(`${baseUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned status ${response.status}: ${responseText || "Empty response"}`);
      }

      if (!response.ok) {
        const errMsg = typeof data.detail === "object" ? JSON.stringify(data.detail) : data.detail;
        throw new Error(errMsg || `Request failed with status ${response.status}`);
      }

      renderPrediction(data);
    } catch (err) {
      renderError(err.message);
    } finally {
      setLoadingState(false);
    }
  }); // <-- Closing bracket fixed here

  // UI State Handlers
  function setLoadingState(isLoading) {
    if (isLoading) {
      btnSubmit.disabled = true;
      btnText.classList.add("hidden");
      spinner.classList.remove("hidden");
    } else {
      btnSubmit.disabled = false;
      btnText.classList.remove("hidden");
      spinner.classList.add("hidden");
    }
  }

  function renderPrediction(data) {
    stateEmpty.classList.add("hidden");
    stateError.classList.add("hidden");
    stateSuccess.classList.remove("hidden");

    predictedClassElem.textContent = data.Predicted_room_type;

    const probs = data.Probability || [];
    const maxProb = probs.length > 0 ? Math.max(...probs) : 0;
    topConfidenceElem.textContent = `${(maxProb * 100).toFixed(1)}%`;

    // Clear and build dynamic probability breakdown
    probabilityContainer.innerHTML = "";

    probs.forEach((prob, idx) => {
      const label = DEFAULT_CLASSES[idx] || `Class ${idx + 1}`;
      const percentage = (prob * 100).toFixed(1);

      const probRow = document.createElement("div");
      probRow.className = "prob-row";
      probRow.innerHTML = `
        <div class="prob-labels">
          <span>${label}</span>
          <span style="font-weight: 600;">${percentage}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: 0%;"></div>
        </div>
      `;

      probabilityContainer.appendChild(probRow);

      // Trigger animation smoothly
      setTimeout(() => {
        const fill = probRow.querySelector(".progress-fill");
        fill.style.width = `${percentage}%`;
      }, 50 * idx);
    });
  }

  function renderError(msg) {
    stateEmpty.classList.add("hidden");
    stateSuccess.classList.add("hidden");
    stateError.classList.remove("hidden");
    errorMessage.textContent = msg;
  }
});