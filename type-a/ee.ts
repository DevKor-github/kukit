import {
  convertRelativeFilePath,
  fetchWithError,
  getTypeAUrlList,
  getWriter,
  parseArticle,
  type TypeANotice,
} from "./type-a.ts";

export enum EeCategory {
  Undergraduate = 1,
  Graduate = 2,
  Job = 3,
}

/**
 * @param page 탐색할 페이지 번호
 * @param category 탐색할 카테고리 번호, 1: 학부, 2: 대학원, 3: 취업정보
 * @returns 해당 페이지의 공지사항 URL 리스트를 반환합니다.
 */
export async function getEeUrlList(page: number, category: EeCategory): Promise<string[]> {
  const eeCategory = {
    1: "undernotice",
    2: "gradnotice",
    3: "job",
  }[category];
  if (!eeCategory) throw Error("Invalid category number");
  const mainUrl = `https://ee.korea.ac.kr/community/${eeCategory}.html?&page=${page}`;
  const hrefList = await getTypeAUrlList(mainUrl, `${eeCategory}_view`);
  return hrefList.map((x) => "https://ee.korea.ac.kr/community/" + x);
}

/**
 * @param url getEeUrlList 함수에서 반환된 url 하나
 * @param mainCategory 탐색중인 카테고리 번호, 1: 학부, 2: 대학원, 3: 취업정보
 * @returns 공지사항의 제목, 작성자, 게시일자, public URL, HTML table body, 카테고리 내용을 반환합니다.
 */
export async function fetchEeNotices(url: string, mainCategory: EeCategory): Promise<TypeANotice> {
  const scrap = await fetchWithError(url);
  const html = await scrap.text();
  const article = convertRelativeFilePath(html, "https://ee.korea.ac.kr");

  const noticeData = parseArticle(article, { title: "p", date: "span" });
  noticeData.writer = getWriter(article, "name");
  noticeData.url = url;

  const subcategory = {
    1: "학부",
    2: "대학원",
    3: "취업정보",
  }[mainCategory];
  if (!subcategory) throw Error("Invalid category number");

  noticeData.category =
    subcategory + (mainCategory == 3 ? "" : noticeData.title.includes("장학") ? " 장학" : " 공지");

  return noticeData;
}
