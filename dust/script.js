// Vercel 서버리스 함수를 통해 지역별 대기 측정값을 가져와 화면에 표시합니다.
const regionSelect = document.querySelector("#region-select");
const averageTitle = document.querySelector("#summary-title");
const averageValue = document.querySelector("#average-value");
const averageDescription = document.querySelector("#average-description");
const stationTitle = document.querySelector("#stations-title");
const stationCount = document.querySelector("#station-count");
const statusMessage = document.querySelector("#status-message");
const stationList = document.querySelector("#station-list");

const gradeLabels = {
  "1": "좋음",
  "2": "보통",
  "3": "나쁨",
  "4": "매우 나쁨",
};

function getMeasurement(value) {
  if (value === undefined || value === null || String(value).trim() === "" || String(value).trim() === "-") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function createMeasurement(label, value, unit) {
  const measurement = document.createElement("div");
  measurement.className = "measurement";

  const measurementLabel = document.createElement("span");
  measurementLabel.className = "measurement-label";
  measurementLabel.textContent = label;

  const measurementValue = document.createElement("span");
  measurementValue.className = "measurement-value";

  if (value === null || value === undefined || String(value).trim() === "" || String(value).trim() === "-") {
    measurementValue.classList.add("not-measured");
    measurementValue.textContent = "측정 안 됨";
  } else {
    measurementValue.append(document.createTextNode(String(value)));
    if (unit) {
      const measurementUnit = document.createElement("small");
      measurementUnit.textContent = unit;
      measurementValue.append(measurementUnit);
    }
  }

  measurement.append(measurementLabel, measurementValue);
  return measurement;
}

function createStationCard(station) {
  const card = document.createElement("article");
  const grade = String(station.pm10Grade ?? "").trim();
  const knownGrade = Object.hasOwn(gradeLabels, grade);
  card.className = `station-card ${knownGrade ? `grade-${grade}` : "grade-unknown"}`;

  const header = document.createElement("div");
  header.className = "station-card-header";

  const name = document.createElement("h3");
  name.textContent = station.stationName || "이름 없는 측정소";

  const badge = document.createElement("span");
  badge.className = "grade-badge";
  badge.textContent = knownGrade ? gradeLabels[grade] : "등급 정보 없음";
  header.append(name, badge);

  const measurements = document.createElement("div");
  measurements.className = "measurement-list";
  measurements.append(
    createMeasurement("미세먼지 PM10", getMeasurement(station.pm10Value), "㎍/㎥"),
    createMeasurement("초미세먼지 PM2.5", getMeasurement(station.pm25Value), "㎍/㎥"),
  );

  const time = createMeasurement("측정 시각", station.dataTime, "");
  time.classList.add("measurement-time");
  measurements.append(time);
  card.append(header, measurements);

  return card;
}

function updateAverage(stations, region) {
  const values = stations
    .map((station) => getMeasurement(station.pm10Value))
    .filter((value) => value !== null);
  averageTitle.textContent = `${region} 평균 미세먼지`;

  if (values.length === 0) {
    averageValue.replaceChildren(document.createTextNode("측정 안 됨"));
    averageDescription.textContent = "계산할 수 있는 미세먼지 측정값이 없습니다.";
    return;
  }

  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  averageValue.replaceChildren(document.createTextNode(String(average)));
  const unit = document.createElement("span");
  unit.textContent = "㎍/㎥";
  averageValue.append(unit);
  averageDescription.textContent = `측정값 ${values.length}개 기준 평균입니다.`;
}

function showError(message) {
  averageValue.replaceChildren(document.createTextNode("--"));
  averageDescription.textContent = "평균을 표시할 수 없습니다.";
  stationCount.textContent = "정보 없음";
  statusMessage.textContent = message;
}

async function loadAirQuality() {
  const region = regionSelect.value;
  averageTitle.textContent = `${region} 평균 미세먼지`;
  stationTitle.textContent = `${region} 측정소`;
  stationCount.textContent = "불러오는 중";
  statusMessage.textContent = "대기 정보를 불러오고 있습니다.";
  stationList.replaceChildren();

  try {
    const response = await fetch(`/api/dust?sido=${encodeURIComponent(region)}`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || `서버 응답 오류 (${response.status})`);
    }

    const header = result.response?.header;
    if (header?.resultCode && header.resultCode !== "00") {
      throw new Error(header.resultMsg || "대기 정보를 가져오지 못했습니다.");
    }

    const items = result.response?.body?.items;
    if (!Array.isArray(items)) {
      throw new Error("응답 형식이 올바르지 않습니다. 인증키와 API 응답을 확인해 주세요.");
    }

    updateAverage(items, region);
    stationCount.textContent = `측정소 ${items.length}곳`;
    statusMessage.textContent = items.length > 0 ? "" : "표시할 측정소 정보가 없습니다.";
    stationList.replaceChildren(...items.map(createStationCard));
  } catch (error) {
    console.error("대기 정보 조회 실패:", error);
    showError(`대기 정보를 불러오지 못했습니다. ${error.message}`);
  }
}

regionSelect.addEventListener("change", loadAirQuality);
loadAirQuality();
