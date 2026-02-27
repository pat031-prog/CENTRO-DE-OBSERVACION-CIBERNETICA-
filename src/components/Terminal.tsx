import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Terminal as TerminalIcon, ChevronUp, ChevronDown } from "lucide-react";

interface TerminalProps {
  onCommand: (cmd: string) => void;
  logs: string[];
}

export function Terminal({ onCommand, logs }: TerminalProps) {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onCommand(input.trim());
      setInput("");
    }
  };

  return (
    <div className="border-t border-border bg-panel-bg flex flex-col font-mono text-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-dark-bg border-b border-border px-4 py-2 flex items-center justify-between text-neon-cyan/70 text-xs tracking-widest uppercase hover:bg-neon-cyan/10 transition-colors w-full"
      >
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} />
          <span>Consola de Operaciones</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: "12rem" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-1 text-neon-cyan/80">
              {logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-border flex items-center gap-2 bg-dark-bg shrink-0">
              <span className="text-neon-green font-bold">&gt;</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-neon-cyan placeholder-neon-cyan/30"
                placeholder="Ingrese comando (ej: help, read 0x01)..."
                autoFocus={isOpen}
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
