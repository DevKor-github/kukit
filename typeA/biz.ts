import {
  getContent,
  getDate,
  getTitle,
  getTypeAUrlList,
  getWriter,
  makeFilePathPublic,
  type typeANotice,
} from "./typeA.ts";

/**
 * @param page 탐색할 페이지 번호
 * @param category 탐색할 카테고리 번호, 1: 학부, 2: ms/phd, 3: mba, 6: 진로, 7: 교환학생, 10: 전체
 * @returns 해당 페이지의 공지사항 URL 리스트를 반환합니다.
 */
export async function getBizUrlList(
  page: number,
  category: number,
): Promise<string[]> {
  const mainUrl =
    `https://biz.korea.ac.kr/news/notice.html?kind=${category}&page=${page}`;
  const hrefList = await getTypeAUrlList(mainUrl, "notice_view");
  return hrefList.map((x) =>
    "https://biz.korea.ac.kr/news/" + x + "&kind=" + category
  );
}

/**
 * @param url getBizUrlList 함수에서 반환된 url 하나
 * @returns 공지사항의 제목, 작성자, 게시일자, public URL, HTML table body, 카테고리 내용을 반환합니다.
 */
export async function getNoticeFromBiz(
  url: string,
  mainCategory: number,
): Promise<typeANotice> {
  const scrap = await fetch(url);
  const html = await scrap.text();
  const article = makeFilePathPublic(html, "https://biz.korea.ac.kr");

  const title = getTitle(article, "p");
  const date = getDate(article, "span");
  const writer = getWriter(article, "parts");
  const content = getContent(article);

  const subcategory = {
    1: "학부",
    2: "대학원",
    3: "대학원",
    6: "진로정보",
    7: "교환학생",
  }[mainCategory] ?? "일반";

  const category = title.includes("장학")
    ? subcategory + " 장학"
    : subcategory + " 공지";

  return {
    title,
    date,
    writer,
    content,
    url,
    category,
  };
}

const urlList = await getBizUrlList(1, 1);
console.log((await getNoticeFromBiz(urlList[2], 1)).content);
