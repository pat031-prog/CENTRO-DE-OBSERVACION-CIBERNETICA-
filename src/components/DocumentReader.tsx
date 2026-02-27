import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Document } from "../data/documents";

interface DocumentReaderProps {
  document: Document;
}

export function DocumentReader({ document }: DocumentReaderProps) {
  const [decryptedText, setDecryptedText] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDecrypting(true);
    setDecryptedText("");

    let currentIndex = 0;
    // Faster typing effect to handle larger documents
    const interval = setInterval(() => {
      if (currentIndex < document.content.length) {
        // Add chunks instead of single characters for speed
        const chunk = document.content.slice(currentIndex, currentIndex + 50);
        setDecryptedText((prev) => prev + chunk);
        currentIndex += 50;
      } else {
        setDecryptedText(document.content); // Ensure exact match at the end
        clearInterval(interval);
        setIsDecrypting(false);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [document.id, document.content]);

  useEffect(() => {
    // Only auto-scroll if the user is near the bottom already
    // This allows them to scroll up and read while it's loading
    if (containerRef.current && isDecrypting) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (isNearBottom) {
        containerRef.current.scrollTop = scrollHeight;
      }
    }
  }, [decryptedText, isDecrypting]);

  const renderContent = (text: string) => {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBlockType = '';
    const renderedLines: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('\`\`\`')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          codeBlockType = line.slice(3).trim();
        }
        renderedLines.push(<div key={i} className="text-neon-cyan/20 font-mono text-xs ml-4">{line}</div>);
        continue;
      }

      let lineClass = "";
      
      if (inCodeBlock) {
        lineClass = "font-mono text-xs md:text-sm bg-neon-cyan/5 px-3 py-1 border-l-2 border-neon-cyan/30 ml-4";
        if (codeBlockType === 'diff') {
          if (line.startsWith('+')) lineClass += " text-green-400 bg-green-400/10";
          else if (line.startsWith('-')) lineClass += " text-red-400 line-through opacity-70 bg-red-400/10";
          else lineClass += " text-neon-cyan/70";
        } else if (codeBlockType === 'pseudo') {
          lineClass += " text-neon-cyan/90";
        } else {
          lineClass += " text-neon-cyan/80";
        }
      } else {
        if (line.trim() === '') {
          lineClass = "h-4";
        } else if (line.startsWith('//')) {
          lineClass = "text-neon-cyan/50 italic font-mono text-xs md:text-sm mb-2";
        } else if (line.match(/^\[\d{2}\]/)) {
          lineClass = "text-lg md:text-xl font-bold text-white mt-10 mb-6 border-b border-white/20 pb-2 font-mono tracking-wide";
        } else if (line.startsWith('>>>')) {
          lineClass = "text-center text-[10px] md:text-xs font-mono text-neon-cyan border border-neon-cyan/30 bg-neon-cyan/10 py-2 px-4 my-2 tracking-[0.2em] uppercase w-full sm:w-5/6 mx-auto shadow-[0_0_10px_rgba(0,240,255,0.1)]";
        } else if (line.startsWith('"')) {
          lineClass = "border-l-2 border-neon-cyan/50 pl-4 py-3 my-4 italic text-neon-cyan/80 bg-neon-cyan/5 text-sm md:text-base leading-relaxed";
        } else if (line.startsWith('—')) {
          lineClass = "text-right text-xs md:text-sm text-neon-cyan/50 mb-8 pr-4 italic opacity-80";
        } else if (line.match(/^\[(WARN|INFO|ACTION|ERROR|STATUS)\]/)) {
          lineClass = "font-mono text-xs md:text-sm font-bold uppercase tracking-wider mb-1";
          if (line.startsWith('[WARN]')) lineClass += " text-yellow-400";
          if (line.startsWith('[INFO]')) lineClass += " text-blue-400";
          if (line.startsWith('[ACTION]')) lineClass += " text-green-400";
          if (line.startsWith('[ERROR]')) lineClass += " text-red-500";
          if (line.startsWith('[STATUS]')) lineClass += " text-neon-cyan";
        } else if (line.includes('→') && !line.includes(' ')) {
           lineClass = "font-mono text-xs md:text-sm text-neon-cyan/70 ml-4 border-l border-neon-cyan/20 pl-4 mb-1";
        } else {
          lineClass = "whitespace-pre-wrap leading-relaxed text-sm md:text-base mb-4 text-neon-cyan/90";
        }
      }

      const renderInline = (str: string) => {
        const parts = str.split(/(█+|~~.*?~~)/g);
        return parts.map((part, j) => {
          if (part.startsWith('█')) {
            return <span key={j} className="bg-neon-cyan text-dark-bg">{part}</span>;
          }
          if (part.startsWith('~~') && part.endsWith('~~')) {
            return <span key={j} className="line-through opacity-50">{part.slice(2, -2)}</span>;
          }
          return part;
        });
      };

      renderedLines.push(
        <div key={i} className={lineClass}>
          {line.trim() === '' ? '\u00A0' : renderInline(line)}
        </div>
      );
    }

    return renderedLines;
  };

  return (
    <div ref={containerRef} className="flex-1 h-full overflow-y-auto bg-dark-bg p-4 md:p-8 text-neon-cyan font-mono relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <div className="border-b border-neon-cyan/30 pb-4 mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold tracking-widest uppercase mb-2">
            {document.title}
          </h1>
          <div className="text-xs md:text-sm text-neon-cyan/70 mb-4">{document.subtitle}</div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] md:text-xs text-neon-cyan/50 font-mono bg-neon-cyan/5 p-3 border border-neon-cyan/20">
            <div><span className="opacity-50">EMISOR:</span> {document.emisor}</div>
            <div><span className="opacity-50">FECHA:</span> {document.fecha}</div>
            <div className="col-span-2 md:col-span-1"><span className="opacity-50">TEMP:</span> {document.temperatura}</div>
            <div className="col-span-2"><span className="opacity-50">HASH:</span> {document.hash}</div>
            <div className="col-span-2 md:col-span-1"><span className="opacity-50">CLASS:</span> {document.clasificacion}</div>
          </div>
        </div>

        <div className="space-y-0">
          {renderContent(decryptedText)}
          {isDecrypting && <span className="animate-pulse">_</span>}
        </div>

        {!isDecrypting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 pt-8 border-t border-neon-cyan/30 text-xs text-neon-cyan/50 text-center uppercase tracking-widest"
          >
            [ FIN DE TRANSMISIÓN ]
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
