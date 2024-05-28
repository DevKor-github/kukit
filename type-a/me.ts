import {
  convertRelativeFilePath,
  fetchWithError,
  getTypeAUrlList,
  getWriter,
  parseArticle,
  type TypeANotice,
} from "./type-a.ts";

enum MeCategory {
  UnderAndGrad = 0,
  Undergraduate = 1,
  Graduate = 2,
  Job = 3,
}

/**
 * @param listnum 탐색할 게시글 최대치
 * @param category 탐색할 카테고리 번호, 0: 일반(학부 및 대학원, 취업정보는 해당없음), 1: 학부, 2: 대학원, 3: 취업정보
 * @returns 해당 페이지의 공지사항 URL 리스트를 반환합니다.
 */
export async function getMeUrlList(
  listnum: number,
  category: MeCategory,
): Promise<string[]> {
  const meCategory = (category != 3) ? "undernotice" : "job";
  if (!meCategory) throw Error("Invalid category number");
  const mainUrl = (category != 3)
    ? `https://me.korea.ac.kr/community/undernotice.html?cate%5B%5D=${category}&listnum=${listnum}`
    : `https://me.korea.ac.kr/community/job.html?listnum=${listnum}`;

  const hrefList = await getTypeAUrlList(mainUrl, `${meCategory}_view`);
  return hrefList.map((x) => "https://me.korea.ac.kr/community/" + x);
}

/**
 * @param url getMeUrlList 함수에서 반환된 url 하나
 * @param mainCategory 탐색중인 카테고리 번호, 0: 일반(학부 및 대학원, 취업정보는 해당없음), 1: 학부, 2: 대학원, 3: 취업정보
 * @returns 공지사항의 제목, 작성자, 게시일자, public URL, HTML table body, 카테고리 내용을 반환합니다.
 */
export async function getNoticeFromMe(
  url: string,
  mainCategory: MeCategory,
): Promise<TypeANotice> {
  const scrap = await fetchWithError(url);
  const html = await scrap.text();
  const article = convertRelativeFilePath(html, "https://me.korea.ac.kr");

  const noticeData = parseArticle(article, { title: "div", date: "p" });
  noticeData.url = url;

  const subcategory = {
    1: "학부",
    2: "대학원",
    3: "취업정보",
  }[mainCategory];
  if (!subcategory) throw Error("Invalid category number");

  noticeData.writer = getWriter(article, "name");

  noticeData.category = subcategory +
    (mainCategory == 3
      ? ""
      : (noticeData.title.includes("장학") ? " 장학" : " 공지"));

  return noticeData;
}
