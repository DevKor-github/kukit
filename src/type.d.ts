export interface NoticeInfo {
  id: string;
  title: string;
  date: string;
  writer: string;
  content: string;
  url: string;
}

export type KupidType = "Scholar" | "Notice" | "Schedule";
