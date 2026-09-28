import type { MeetingDoc } from "../data/chatStore";
import type { BriefingSummary, MeetingMinuteSummary } from "./api";

export function briefingSummaryToMeetingDoc(b: BriefingSummary): MeetingDoc {
  return {
    id: `briefing-${b.briefingId}`,
    title: `[AI 브리핑] ${b.documentName}`,
    createdAt: b.createdAt,
    summary: [b.summary, "", "핵심 포인트", b.keyPoints.map(p => `• ${p}`).join("\n")].join("\n"),
    messages: [],
    sourceFile: b.documentName,
    tags: ["AI브리핑", b.status],
  };
}

export function meetingMinuteSummaryToMeetingDoc(m: MeetingMinuteSummary): MeetingDoc {
  return {
    id: `minute-${m.minuteId}`,
    title: m.title,
    createdAt: m.createdAt,
    summary: m.summary || "회의 요약 없음",
    messages: [],
    tags: ["회의", `참여자${m.participantCount}명`],
  };
}
