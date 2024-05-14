export interface NoticeInfo {
    id: string; //일단은 내부 id로 리턴하게 해 놓음. 추후 변경 가능
    title: string;
    date: string;
    writer: string;
    content: string;
    url: string;
    category: string;
  }

//경영대 공지사항 크롤링 함수
//경영대 공지사항은 카테고리별로 구분되어 있지 않아(장학 등) 별도로 카테고리를 분류해주는 함수가 필요함.
//구상한 함수 기동 방식: url을 통해 db에 저장된 공지인지 확인 후 저장되지 않은 url만 뽑아
//getNoticeFromBiz 함수로 공지사항을 크롤링하고, categorizeBizNotice 함수로 카테고리를 분류해줌.
//url 카테고리 탐색 순서는 6(진로)->7(교환학생)->1(학부)->2,3(대학원)->10(전체) 순서로 탐색하면 좋을 것.
//(정확한 카테고리 리스트에 따라 수정될 수 있음)

/**
 *
 * @param page 탐색할 페이지 번호
 * @param category 탐색할 카테고리 번호, 1: 학부, 2: ms/phd, 3: mba, 6: 진로, 7: 교환학생, 10: 전체
 * @returns 해당 페이지의 공지사항 URL 리스트를 반환합니다.
 */
export async function getBizUrlList(page: number, category: number): Promise<string[]> {
  const scrap = await fetch(`https://biz.korea.ac.kr/news/notice.html?kind=${category}&page=${page}`);
  const html = await scrap.text();
  const matchArray = html.match(/notice_view\.html\?no=([0-9]+)/g);
  if (!matchArray) throw Error('No match found');
  return matchArray.map((x) => 'https://biz.korea.ac.kr/news/' + x + '&kind=' + category);
}

function makeFilePathPublic(html: string) {
  return html.replace(/\/ft_board\/(.+)"/, function(match) {
    return 'https://biz.korea.ac.kr' + match;
  });
}

/**
 *
 * @param html getBizUrlList 함수에서 반환된 url 하나
 * @returns 공지사항의 제목, 작성자, 게시일자, 경영대 내부 id, public URL, HTML table body, 빈 카테고리 내용을 반환합니다.
 */
export async function getNoticeFromBiz(url: string): Promise<NoticeInfo> {
  const scrap = await fetch(url);
  const html = await scrap.text();
  const article = makeFilePathPublic(html);

  const rawID = url.match(/([0-9]+)/);
  if (!rawID) throw Error("Failed to get id");

  const rawTitle = article.match(/<p class="tit">(.+)<\/p>/);
  if (!rawTitle) throw Error("Failed to get title");
  const titleArr = rawTitle[1].split(/<span class="cate">|<\/span>/);
  const title = titleArr[titleArr.length - 1];

  const rawDate = article.match(/<span class="date">(.+)<\/span>/);
  if (!rawDate) throw Error("Failed to get date");

  const rawWriter = article.match(/<span class="parts">(.+)<\/span>/);
  if (!rawWriter) throw Error("Failed to get writer");
  
  const rawMain = article.match(/<div class="contents_info">(.+)<div class="file_info">/s);
  const rawFile = article.match(/<div class="file_info">(.+)<div class="list_info">/s);
  if (!rawMain||!rawFile) throw Error("Failed to get content");
  const content = rawMain[0].replace(/<div class="file_info">/, "") + rawFile[0].replace(/<div class="list_info">/, "");

  return {
    id: rawID[1],
    title,
    date: rawDate[1],
    writer: rawWriter[1],
    content,
    url,
    category: "",
  };
}
/**
 *
 * @param html getNoticeFromBiz 함수에서 반환된 noticeInfo 하나
 * @returns 카테고리가 채워진 noticeInfo를 반환합니다.
 */
export function categorizeBizNotice(notice: NoticeInfo) : NoticeInfo {
  const mainCategory = notice.url.match(/kind=([0-9])/);
  if (!mainCategory) throw Error("Failed to get category");
  const category = {
    1: '학부',
    2: '대학원',
    3: '대학원',
    6: '진로정보',
    7: '교환학생',
  }[mainCategory[1]] ?? '일반';
  if (notice.title.includes('장학')) notice.category = category + ' 장학';
  else notice.category = category + ' 공지';
  return notice;
}
