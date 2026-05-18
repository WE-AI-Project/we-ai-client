import React, { useState, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { 
  Zap, Layout, Database, BrainCircuit, Server,
  CheckCircle2, CircleDashed, Calendar, GitCommit, X,
  LucideIcon
} from 'lucide-react';

gsap.registerPlugin(useGSAP);

interface NodeData {
  id: string;
  label: string;
  status: string;
  branch: string;
  x: number;
  y: number;
  color: string;
  date: string;
  commit: string;
  isRoot?: boolean;
  isPart?: boolean;
  parentId?: string;
  icon?: LucideIcon;
}

interface LinkData {
  from: string;
  to: string;
}

// --- 완벽하게 정렬된 트리(Tree) 구조의 브랜치/커밋 생성 ---
const generateData = () => {
  const nodes: NodeData[] = [];
  const links: LinkData[] = [];

  // 1. 루트 노드 (정중앙)
  const root: NodeData = { 
    id: 'root', label: 'SYNAIPSE', status: 'done', branch: 'main', 
    isRoot: true, x: 50, y: 50, icon: Zap, color: '#FFFFFF', 
    date: '2024-03-01', commit: 'init core v1' 
  };
  nodes.push(root);

  // 2. 4대 개발 파트 (네 모서리 방향)
  // angle은 파트에서 서브 브랜치들이 뻗어나갈 방향의 중심 각도
  const partsRaw = [
    { id: 'p_fe', label: 'FRONTEND', branch: 'feat/ui', icon: Layout, color: '#22D3EE', x: 25, y: 25, angle: 225 }, // 좌상단으로 뻗음
    { id: 'p_be', label: 'BACKEND', branch: 'feat/api', icon: Database, color: '#4ADE80', x: 75, y: 25, angle: 315 }, // 우상단으로 뻗음
    { id: 'p_ai', label: 'AI_ORACLE', branch: 'feat/ai', icon: BrainCircuit, color: '#A78BFA', x: 25, y: 75, angle: 135 }, // 좌하단으로 뻗음
    { id: 'p_inf', label: 'INFRA', branch: 'feat/infra', icon: Server, color: '#FB923C', x: 75, y: 75, angle: 45 }, // 우하단으로 뻗음
  ];

  partsRaw.forEach(part => {
    nodes.push({ 
      ...part, 
      isPart: true, 
      status: 'done', 
      date: '2024-04-01', 
      commit: `feat: sync ${part.label} cluster` 
    });
    
    // 루트 -> 파트 연결
    links.push({ from: 'root', to: part.id });

    // 3. 각 파트에서 여러 개의 "브랜치"가 부채꼴 모양으로 뻗어나감
    const numBranches = 6; // 파트당 6개의 브랜치
    const spreadAngle = 100; // 부채꼴로 퍼지는 총 각도 (100도)

    for (let b = 0; b < numBranches; b++) {
      // 각 브랜치의 '목표 방향' 각도 계산 (겹치지 않게 기본 뼈대 정렬)
      const branchTargetAngleDeg = part.angle - (spreadAngle / 2) + (b * (spreadAngle / (numBranches - 1)));
      const branchTargetAngleRad = (branchTargetAngleDeg * Math.PI) / 180;
      
      const numCommits = 4 + Math.floor(Math.random() * 3); // 브랜치 하나당 4~6개의 커밋이 일직선으로 달림
      let parentId = part.id; // 첫 커밋은 파트 노드에 연결

      // 🌟 수학적 변경: 직전 좌표에서 스텝을 밟는 방식으로 꼬불꼬불함 구현
      // 시작 좌표를 부모(파트) 좌표로 설정
      let curX = part.x;
      let curY = part.y;
      const stepSize = 4.5; // 한 커밋당 나아가는 고정 거리

      for (let c = 0; c < numCommits; c++) {
        const id = `${part.id}_b${b}_c${c}`;
        
        // --- 꼬불꼬불 로직 핵심 ---
        // 목표 각도(`branchTargetAngleRad`)에 난수(Jitter)를 섞어서 꺾이는 각도 계산
        // -0.25~0.25 라디안 (약 -14~+14도) 정도 꺾이게 설정 (겹침 방지를 위해 폭을 좁힘)
        const angleJitter = (Math.random() - 0.5) * 0.5; 
        const stepAngleRad = branchTargetAngleRad + angleJitter;

        // 삼각함수로 직전 좌표(`curX`, `curY`)에서 새로운 좌표 계산 (두 점 사이는 직선)
        const nextX = curX + stepSize * Math.cos(stepAngleRad);
        const nextY = curY + stepSize * Math.sin(stepAngleRad);

        // 좌표 업데이트 (다음 커밋의 시작점이 됨)
        curX = nextX;
        curY = nextY;

        nodes.push({
          id,
          parentId,
          label: `${part.label.substring(0,2)}_f${b}_${Math.random().toString(36).substring(2,5)}.ts`,
          status: Math.random() > 0.3 ? 'done' : 'working',
          branch: `${part.branch}/task-${b}`, // 명확하게 어떤 브랜치인지 분리
          color: part.color,
          x: Math.max(2, Math.min(98, curX)), // 화면 경계 제한
          y: Math.max(2, Math.min(98, curY)),
          date: `2024-05-${10 + c}`,
          commit: `fix: branch ${b} commit ${c}`
        });

        // 🌟 핵심: 오직 자기 브랜치 내의 직전 커밋(또는 파트 노드)하고만 1:1로 연결됨 (거미줄 금지)
        links.push({ from: parentId, to: id });
        
        // 다음 커밋은 지금 만든 커밋의 꼬리를 물게 함
        parentId = id; 
      }
    }
  });

  return { nodes, links, projectName: root.label };
};

export const SynAIpseGalaxyPage: React.FC = () => {
  const GALAXY_DATA = useMemo(() => generateData(), []);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from('.node-point', { scale: 0, opacity: 0, duration: 0.8, stagger: 0.005, ease: 'back.out(1.5)' });
    gsap.from('.branch-line', { strokeDashoffset: 1000, duration: 2, stagger: 0.02, ease: 'power2.inOut' });
  }, { scope: containerRef });

  const handleNodeClick = (node: NodeData) => {
    if (selectedNode?.id === node.id) {
      closePanels();
    } else {
      setSelectedNode(node);
      gsap.fromTo('.side-panel', { x: -350, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
      gsap.fromTo('.bottom-panel', { y: 150, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
    }
  };

  const closePanels = () => {
    gsap.to('.side-panel', { x: -350, opacity: 0, duration: 0.4, ease: 'power2.in' });
    gsap.to('.bottom-panel', { y: 150, opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: () => setSelectedNode(null) });
  };

  return (
    <div ref={containerRef} className="flex-1 w-full h-full relative bg-[#000000] overflow-hidden font-mono text-[#D4CC9E] flex transition-all duration-500 ease-in-out">
      
      {/* 좌측 정보 패널 */}
      {selectedNode && (
        <div className="side-panel w-80 shrink-0 bg-black/60 backdrop-blur-xl border-r border-white/10 p-8 flex flex-col gap-8 transition-transform duration-500 z-30">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/40 mb-1 tracking-widest uppercase">Target / Node</p>
              <h2 className="text-xl font-bold tracking-tighter truncate" style={{ color: selectedNode.color }}>{selectedNode.label}</h2>
              <p className="text-[9px] text-white/50 mt-2 tracking-widest bg-white/5 px-2 py-1 rounded inline-block uppercase">{selectedNode.branch}</p>
            </div>
            <button onClick={closePanels} className="p-1.5 hover:bg-white/10 rounded-full transition-colors ml-4 shrink-0">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10"><Calendar className="w-4 h-4 text-white/40" /></div>
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-wider">Registry Date</p>
                <p className="text-xs font-semibold mt-0.5">{selectedNode.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 border-t border-white/5 pt-6 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10"><GitCommit className="w-4 h-4 text-white/40" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/40 uppercase tracking-wider">Commit Detail</p>
                <p className="text-xs truncate italic mt-0.5" style={{ color: `${selectedNode.color}DD` }}>"{selectedNode.commit}"</p>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="text-[10px] font-bold px-3 py-1.5 rounded flex items-center gap-2 w-max" style={{ backgroundColor: `${selectedNode.color}15`, color: selectedNode.color }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedNode.color, boxShadow: `0 0 8px ${selectedNode.color}` }} />
              {selectedNode.status.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* 시각화 영역 */}
      <div className="flex-1 w-full h-full relative overflow-hidden transition-all duration-500 ease-in-out">
        {/* 워터마크 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-[0.03] pointer-events-none watermark">
          <h1 className="text-[15vw] font-black text-white tracking-[0.3em] uppercase italic select-none">
            {GALAXY_DATA.projectName}
          </h1>
        </div>

        {/* 연결선 (거미줄 제거, 오직 브랜치-커밋 연결만) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none connections">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {GALAXY_DATA.links.map((link, i) => {
            const from = GALAXY_DATA.nodes.find(n => n.id === link.from)!;
            const to = GALAXY_DATA.nodes.find(n => n.id === link.to)!;
            
            // 파트 전체 하이라이트 조건
            const isRelated = selectedNode?.color === to.color || selectedNode?.id === 'root';
            const isDefault = !selectedNode;
            
            // 🌟 선은 항상 '직선(line)'으로 그려짐 -> 두 점을 이음
            const strokeColor = isDefault ? "rgba(255, 255, 255, 0.4)" : (isRelated ? to.color : "rgba(255, 255, 255, 0.05)");
            const strokeWidth = isDefault ? "1" : (isRelated ? "2" : "0.3");

            return (
              <line
                key={`line-${i}`}
                x1={`${from.x}%`} y1={`${from.y}%`}
                x2={`${to.x}%`} y2={`${to.y}%`}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray="1000"
                className="branch-line transition-all duration-500"
                style={{ filter: isRelated && !isDefault ? 'url(#glow)' : 'none' }}
              />
            );
          })}
        </svg>

        {/* 노드 레이어 */}
        {GALAXY_DATA.nodes.map((node) => {
          const isRelated = !selectedNode || selectedNode.color === node.color || node.id === 'root';
          const opacity = isRelated ? 1 : 0.15;

          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node)}
              className="absolute cursor-pointer group node-point transition-all duration-500"
              style={{ 
                left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)', 
                zIndex: node.isRoot ? 10 : node.isPart ? 5 : 3, opacity 
              }}
            >
              {node.icon ? (
                /* 중심/파트 노드 */
                <div className={`
                  relative rounded-full border-2 flex items-center justify-center bg-black transition-all duration-300
                  ${node.isRoot ? 'w-16 h-16 border-white shadow-[0_0_40px_rgba(255,255,255,0.4)]' : 'w-10 h-10'}
                  ${!node.isRoot && `shadow-[0_0_20px_${node.color}50]`}
                  ${selectedNode?.id === node.id ? 'scale-110 ring-4 ring-white/10' : 'group-hover:scale-110'}
                `} style={{ borderColor: node.isRoot ? '#FFF' : node.color }}>
                  <node.icon className={`text-white transition-all ${node.isRoot ? 'w-8 h-8 animate-pulse' : 'w-4 h-4'}`} />
                  <div className={`absolute whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 px-2 py-0.5 rounded text-[9px] border border-white/10 text-white/80 pointer-events-none ${node.isRoot ? '-top-10' : '-top-8'}`}>
                    {node.isRoot ? GALAXY_DATA.projectName : node.label}
                  </div>
                </div>
              ) : (
                /* 커밋 노드 (정렬된 점) */
                <div className={`
                  relative w-2.5 h-2.5 rounded-full border-[1.5px] bg-black transition-all duration-300
                  ${selectedNode?.id === node.id ? 'scale-150 ring-2 ring-white/20' : 'group-hover:scale-150'}
                `} style={{ 
                  borderColor: node.color, 
                  backgroundColor: node.status === 'done' ? node.color : '#000',
                  boxShadow: `0 0 10px ${node.color}70`
                }}>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 px-1.5 py-0.5 rounded text-[7px] border border-white/10 text-white/60 pointer-events-none uppercase">
                    {node.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 하단 패널 */}
        <div className={`bottom-panel absolute bottom-8 left-8 right-8 h-20 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl z-10 flex items-center px-10 transition-opacity duration-500 ${selectedNode ? 'opacity-100' : 'opacity-40'}`}>
          <div className="flex gap-12 items-center">
            <div className="flex flex-col">
              <span className="text-[9px] text-white/30 mb-1 tracking-widest uppercase">Commit Nodes</span>
              <span className="text-xl font-black">{GALAXY_DATA.nodes.length} <span className="text-[10px] text-white/20 ml-1">Total</span></span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] text-white/30 mb-1 tracking-widest uppercase">Core Latency</span>
              <span className="text-xl font-black text-green-400">0.01ms</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] text-white/30 mb-1 tracking-widest uppercase">AI Oracle Sync</span>
              <div className="flex items-center gap-3 mt-1">
                 <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                   <div className="h-full bg-[#AEB784] w-[98%]" />
                 </div>
                 <span className="text-xs font-bold text-[#AEB784]">98%</span>
              </div>
            </div>
          </div>
          
          <div className="ml-auto text-right flex flex-col items-end gap-1">
            <div className="flex items-center justify-end gap-2 text-[#AEB784]">
              <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase">Oracle AI Connected</span>
            </div>
            <p className="text-[8px] text-white/20 uppercase tracking-widest mt-0.5">SyNAIPSE OS v1.0.4-LATEST</p>
          </div>
        </div>
      </div>

      {/* 나뭇가지 스타일 선처리를 위한 CSS */}
      <style>{`
        .connections line { stroke-linecap: round; } 
      `}</style>
    </div>
  );
};