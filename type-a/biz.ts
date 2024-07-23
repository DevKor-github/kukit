import {
  convertRelativeFilePath,
  fetchWithError,
  getTypeAUrlList,
  getWriter,
  parseArticle,
  type TypeANotice,
} from "./type-a.ts";

export enum BizCategory {
  Undergraduate = 1,
  Graduate = 2,
  MBA = 3,
  Career = 6,
  Exchange = 7,
  All = 10,
}

/**
 * @param page 탐색할 페이지 번호
 * @param category 탐색할 카테고리 번호, 1: 학부, 2: ms/phd, 3: mba, 6: 진로, 7: 교환학생, 10: 전체
 * @returns 해당 페이지의 공지사항 URL 리스트를 반환합니다.
 */
export async function getBizUrlList(page: number, category: BizCategory): Promise<string[]> {
  const mainUrl = `https://biz.korea.ac.kr/news/notice.html?kind=${category}&page=${page}`;
  const hrefList = await getTypeAUrlList(mainUrl, "notice_view");
  return hrefList.map((x) => "https://biz.korea.ac.kr/news/" + x);
}

/**
 * @param url getBizUrlList 함수에서 반환된 url 하나
 * @returns 공지사항의 제목, 작성자, 게시일자, public URL, HTML table body, 카테고리 내용을 반환합니다.
 */
export async function fetchBizNotices(
  url: string,
  mainCategory: BizCategory
): Promise<TypeANotice> {
  const scrap = await fetchWithError(url);
  const html = await scrap.text();
  const article = convertRelativeFilePath(html, "https://biz.korea.ac.kr");

  const noticeData = parseArticle(article, { title: "p", date: "span" });
  noticeData.writer = getWriter(article, "parts");
  noticeData.url = url;

  const subcategory = {
    1: "학부",
    2: "대학원",
    3: "대학원",
    6: "진로정보",
    7: "교환학생",
    10: "일반",
  }[mainCategory];
  if (!subcategory) throw Error("Invalid category number");

  noticeData.category = subcategory + (noticeData.title.includes("장학") ? " 장학" : " 공지");

  return noticeData;
}
