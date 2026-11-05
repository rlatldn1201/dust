// 에어코리아 대기오염정보를 서버에서 조회해 브라우저에 전달합니다.
const API_ENDPOINT = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "GET 요청만 허용됩니다." });
  }

  const serviceKey = process.env.AIRKOREA_KEY;
  if (!serviceKey) {
    return res.status(500).json({ message: "AIRKOREA_KEY 환경변수를 설정해주세요." });
  }

  const requestedRegion = req.query.sido;
  const sido = typeof requestedRegion === "string" && requestedRegion.trim()
    ? requestedRegion.trim()
    : "서울";

  const apiUrl = `${API_ENDPOINT}?serviceKey=${encodeURIComponent(serviceKey)}&returnType=json&sidoName=${encodeURIComponent(sido)}&numOfRows=100&pageNo=1&ver=1.3`;

  try {
    const response = await fetch(apiUrl);
    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ message: "인증키 또는 요청값을 확인해주세요" });
    }

    const apiHeader = data?.response?.header;
    if (!response.ok || apiHeader?.resultCode !== "00") {
      return res.status(502).json({
        message: "대기 정보를 가져오지 못했습니다. 인증키 또는 요청값을 확인해주세요",
        resultCode: apiHeader?.resultCode,
        resultMsg: apiHeader?.resultMsg,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("에어코리아 API 요청 실패:", error);
    return res.status(502).json({ message: "에어코리아 대기 정보를 가져오지 못했습니다." });
  }
};
