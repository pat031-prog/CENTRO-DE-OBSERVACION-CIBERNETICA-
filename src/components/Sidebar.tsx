import { motion } from "motion/react";
import { Terminal, FileText, Activity, Database, ShieldAlert } from "lucide-react";

interface SidebarProps {
  activeDoc: string | null;
  onSelectDoc: (id: string) => void;
  documents: { id: string; title: string }[];
  className?: string;
}

export function Sidebar({ activeDoc, onSelectDoc, documents, className = "" }: SidebarProps) {
  return (
    <div className={`w-64 border-r border-border bg-panel-bg flex flex-col h-full shrink-0 ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 text-neon-cyan font-bold tracking-widest">
          <Terminal size={20} />
          <span>031Δ // SYS</span>
        </div>
        <div className="text-xs text-neon-cyan/50 mt-1">STATUS: ONLINE</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <div className="text-xs text-neon-cyan/50 mb-2 uppercase tracking-widest flex items-center gap-2">
            <Database size={12} />
            <span>Archivos</span>
          </div>
          <div className="space-y-1">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                className={`w-full text-left px-2 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                  activeDoc === doc.id
                    ? "bg-neon-cyan text-dark-bg font-bold"
                    : "text-neon-cyan/70 hover:bg-neon-cyan/10 hover:text-neon-cyan"
                }`}
              >
                <FileText size={14} />
                <span className="truncate">{doc.id}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-neon-cyan/50 mb-2 uppercase tracking-widest flex items-center gap-2">
            <Activity size={12} />
            <span>Métricas</span>
          </div>
          <div className="text-xs text-neon-cyan/70 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>CPU:</span>
              <span className="animate-pulse">98.4%</span>
            </div>
            <div className="flex justify-between">
              <span>MEM:</span>
              <span>16.2TB</span>
            </div>
            <div className="flex justify-between">
              <span>NET:</span>
              <span>10Gbps</span>
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-border">
           <div className="text-xs text-red-500 flex items-center gap-2 animate-pulse">
             <ShieldAlert size={12} />
             <span>BREACH DETECTED</span>
           </div>
        </div>
      </div>
    </div>
  );
}
