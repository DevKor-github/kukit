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
 * @param category 탐색할 카테고리 번호, 1: 학부, 2: 대학원, 3: 취업정보
 * @returns 해당 페이지의 공지사항 URL 리스트를 반환합니다.
 */
export async function getEeUrlList(
  page: number,
  category: number,
): Promise<string[]> {
  const eeCategory = {
    1: "undernotice",
    2: "gradnotice",
    3: "job",
  }[category];
  if (!eeCategory) throw Error("Invalid category number");
  const mainUrl =
    `https://ee.korea.ac.kr/community/${eeCategory}.html?&page=${page}`;
  const hrefList = await getTypeAUrlList(mainUrl, `${eeCategory}_view`);
  return hrefList.map((x) => "https://ee.korea.ac.kr/community/" + x);
}

/**
 * @param url getEngUrlList 함수에서 반환된 url 하나
 * @param mainCategory 탐색중인 카테고리 번호, 1: 학부, 2: 대학원, 3: 취업정보
 * @returns 공지사항의 제목, 작성자, 게시일자, public URL, HTML table body, 카테고리 내용을 반환합니다.
 */
export async function getNoticeFromEe(
  url: string,
  mainCategory: number,
): Promise<typeANotice> {
  const scrap = await fetch(url);
  const html = await scrap.text();
  const article = makeFilePathPublic(html, "https://ee.korea.ac.kr");

  const title = getTitle(article, "p");
  const date = getDate(article, "span");
  const writer = getWriter(article, "name");
  const content = getContent(article);

  const subcategory = {
    1: "학부",
    2: "대학원",
    3: "취업정보",
  }[mainCategory];
  if (!subcategory) throw Error("Invalid category number");
  const category = mainCategory == 3
    ? subcategory
    : title.includes("장학")
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

const oneurl = (await getEeUrlList(1, 1))[3];
console.log((await getNoticeFromEe(oneurl, 1)).content);
