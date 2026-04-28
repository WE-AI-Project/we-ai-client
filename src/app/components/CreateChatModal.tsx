import React, { useState } from "react";
import { X, UserPlus, Check } from "lucide-react";
import { loadSettings, TeamMember } from "../data/projectSettingsStore";
import { SIDEBAR_BORDER } from "../colors";

interface CreateChatModalProps {
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
}

export function CreateChatModal({ onClose, onCreate }: CreateChatModalProps) {
  const { members } = loadSettings();
  const [channelName, setChannelName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleMember = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!channelName.trim() || selectedIds.length === 0) {
      alert("방 이름과 초대할 팀원을 확인해주세요.");
      return;
    }
    onCreate(channelName, selectedIds);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.03]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#AEB784]/20 rounded-xl">
              <UserPlus className="w-5 h-5 text-[#41431B]" />
            </div>
            <h2 className="text-[15px] font-bold text-[#1A1C06]">새 채팅방 개설</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 */}
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-[#888A62] uppercase tracking-widest">채팅방 이름</label>
            <input 
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="방 제목을 입력하세요"
              className="w-full px-4 py-3 bg-[#F8F7F5] border-2 border-transparent focus:border-[#AEB784] rounded-2xl text-sm outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-[#888A62] uppercase tracking-widest flex justify-between">
              팀원 초대 <span className="text-[#41431B]">{selectedIds.length}명 선택됨</span>
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {members.map((member: TeamMember) => (
                <div 
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    selectedIds.includes(member.id) ? "bg-[#AEB784]/10" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#41431B] flex items-center justify-center text-[10px] font-bold text-white uppercase">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1A1C06]">{member.name}</p>
                      <p className="text-[10px] text-[#888A62]">{member.department} · {member.role}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    selectedIds.includes(member.id) ? "bg-[#41431B] border-[#41431B]" : "border-gray-300"
                  }`}>
                    {selectedIds.includes(member.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-6 pt-0 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl text-xs font-bold text-gray-400 bg-gray-50 hover:bg-gray-100 transition-all"
          >
            취소
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-1 py-3.5 rounded-2xl text-xs font-bold text-white bg-[#41431B] hover:bg-[#2A2C10] shadow-lg shadow-[#41431B]/20 transition-all"
          >
            방 만들기
          </button>
        </div>
      </div>
    </div>
  );
}