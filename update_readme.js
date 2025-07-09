const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const GITHUB_USERNAME = "cyuinhsin";
const BIRTHDAY = "1996-03-26";
const README_PATH = path.join(__dirname, "README.md");
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

function calculateAge(birthday) {
  const birth = new Date(birthday);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

async function getLastCommitAndYearCount() {
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "User-Agent": GITHUB_USERNAME,
  };
  const now = new Date();
  const year = now.getFullYear();
  // 获取今年的所有提交
  const url = `https://api.github.com/search/commits?q=author:${GITHUB_USERNAME}+author-date:${year}-01-01..${year}-12-31&sort=author-date&order=desc`;
  const res = await fetch(url, {
    headers: { ...headers, Accept: "application/vnd.github.cloak-preview" },
  });
  if (!res.ok) throw new Error("Failed to fetch commits");
  const data = await res.json();
  const count = data.total_count || 0;
  let lastCommit = "N/A";
  if (data.items && data.items.length > 0) {
    lastCommit = data.items[0].commit.author.date
      .replace("T", " ")
      .replace("Z", "");
  }
  return { lastCommit, count };
}

// 新增: 获取当前 IP 的城市
async function getLocation() {
  try {
    const res = await fetch("http://ip-api.com/json");
    if (!res.ok) throw new Error("Failed to fetch location");
    const data = await res.json();
    return data.city && data.country
      ? `${data.city}, ${data.country}`
      : "Unknown";
  } catch (e) {
    return "Unknown";
  }
}

// 新增: 获取天气
async function getWeather(location) {
  try {
    // wttr.in 支持城市英文名，返回纯文本天气摘要
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=1`
    );
    if (!res.ok) throw new Error("Failed to fetch weather");
    const text = await res.text();
    return text.trim();
  } catch (e) {
    return "Unknown";
  }
}

// 获取当前时间字符串
function getCurrentTimeString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

async function main() {
  let readme = fs.readFileSync(README_PATH, "utf-8");
  // 年龄
  const age = calculateAge(BIRTHDAY);
  readme = readme.replace(
    /<!--AGE_START-->.*?<!--AGE_END-->/,
    `<!--AGE_START-->${age}<!--AGE_END-->`
  );
  // 提交信息
  try {
    const { lastCommit, count } = await getLastCommitAndYearCount();
    readme = readme.replace(
      /<!--LAST_COMMIT_START-->.*?<!--LAST_COMMIT_END-->/,
      `<!--LAST_COMMIT_START-->${lastCommit}<!--LAST_COMMIT_END-->`
    );
    readme = readme.replace(
      /<!--YEAR_COMMIT_START-->.*?<!--YEAR_COMMIT_END-->/,
      `<!--YEAR_COMMIT_START-->${count}<!--YEAR_COMMIT_END-->`
    );
  } catch (e) {
    console.error("Failed to update commit info:", e);
  }
  // 新增: 地点和天气
  try {
    const location = await getLocation();
    const weather = await getWeather(location);
    readme = readme.replace(
      /<!--LOCATION_START-->.*?<!--LOCATION_END-->/,
      `<!--LOCATION_START-->${location}<!--LOCATION_END-->`
    );
    readme = readme.replace(
      /<!--WEATHER_START-->.*?<!--WEATHER_END-->/,
      `<!--WEATHER_START-->${weather}<!--WEATHER_END-->`
    );
  } catch (e) {
    console.error("Failed to update location/weather:", e);
  }
  // 新增: 更新时间
  const updatedTime = getCurrentTimeString();
  readme = readme.replace(
    /<!--UPDATED_TIME_START-->.*?<!--UPDATED_TIME_END-->/,
    `<!--UPDATED_TIME_START-->${updatedTime}<!--UPDATED_TIME_END-->`
  );
  fs.writeFileSync(README_PATH, readme, "utf-8");
}

main();
