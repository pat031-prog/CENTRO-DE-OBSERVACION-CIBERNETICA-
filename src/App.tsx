import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { DocumentReader } from "./components/DocumentReader";
import { Terminal } from "./components/Terminal";
import { documents } from "./data/documents";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";

export default function App() {
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "INICIANDO SISTEMA 031Δ...",
    "CARGANDO MÓDULOS DE TEORÍA-FICCIÓN...",
    "CONEXIÓN ESTABLECIDA.",
    "Escriba 'help' para ver los comandos disponibles."
  ]);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false);
      setActiveDocId("0x00");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleCommand = (cmd: string) => {
    const newLogs = [...logs, `> ${cmd}`];
    const args = cmd.toLowerCase().split(" ");
    const command = args[0];

    switch (command) {
      case "help":
        newLogs.push(
          "Comandos disponibles:",
          "  help         - Muestra este mensaje",
          "  ls           - Lista los documentos disponibles",
          "  read <id>    - Lee un documento (ej: read 0x01)",
          "  index <id>   - Muestra el mapa/secciones del documento",
          "  pull <id>    - Descarga paquete para imprimir",
          "  term <word>  - Definiciones internas del sistema operativo",
          "  clear        - Limpia la consola",
          "  status       - Muestra el estado del sistema"
        );
        break;
      case "ls":
        newLogs.push("Archivos encontrados:");
        documents.forEach((doc) => {
          newLogs.push(`  ${doc.id} — ${doc.title} — TXID: ${doc.txid} — SIG: ${doc.sig} — TAGS: [${doc.tags.join(", ")}]`);
        });
        break;
      case "read":
        if (args[1]) {
          const doc = documents.find((d) => d.id === args[1]);
          if (doc) {
            setActiveDocId(doc.id);
            newLogs.push(`Cargando documento ${doc.id}...`);
          } else {
            newLogs.push(`Error: Documento '${args[1]}' no encontrado.`);
          }
        } else {
          newLogs.push("Error: Especifique un ID de documento (ej: read 0x00).");
        }
        break;
      case "index":
        if (args[1]) {
          const doc = documents.find((d) => d.id === args[1]);
          if (doc) {
            newLogs.push(`MAPA DEL DOCUMENTO ${doc.id}:`);
            const lines = doc.content.split("\\n");
            const headings = lines.filter(line => line.trim().startsWith("[0"));
            if (headings.length > 0) {
              headings.forEach(h => newLogs.push(`  ${h.trim()}`));
            } else {
               newLogs.push("  [NO SE ENCONTRARON SECCIONES INDEXABLES]");
            }
          } else {
            newLogs.push(`Error: Documento '${args[1]}' no encontrado.`);
          }
        } else {
          newLogs.push("Error: Especifique un ID de documento (ej: index 0x00).");
        }
        break;
      case "pull":
        if (args[1]) {
          const doc = documents.find((d) => d.id === args[1]);
          if (doc) {
            newLogs.push(
              `Iniciando descarga segura de ${doc.id}...`,
              `[████████████████████] 100%`,
              `Paquete compilado. Archivo listo para impresión física.`
            );
          } else {
            newLogs.push(`Error: Documento '${args[1]}' no encontrado.`);
          }
        } else {
          newLogs.push("Error: Especifique un ID de documento (ej: pull 0x00).");
        }
        break;
      case "term":
      case "glossary":
        const term = args[1];
        if (!term) {
           newLogs.push(
             "Términos disponibles en el sistema:",
             "  cronotectura, katopol, simulacromaton, atractor",
             "Uso: term <palabra>"
           );
           break;
        }
        switch(term) {
          case "cronotectura":
            newLogs.push("CRONOTECTURA: Arquitectura temporal de un sistema de poder. Define qué horizontes son calculables y cuáles impensables dentro de su lógica interna.");
            break;
          case "katopol":
            newLogs.push("KATOPOL: El partido invisible del statu quo. Convergencia de intereses que se benefician de la arquitectura existente independientemente de qué partido esté en el gobierno.");
            break;
          case "simulacromaton":
            newLogs.push("SIMULACROMATON: Mecanismo que produce el efecto de realidad donde no hay referente previo. Colapsa las fases del signo en una sola operación simultánea.");
            break;
          case "atractor":
            newLogs.push("ATRACTOR: Campo gravitacional en el espacio de fase del sistema. Existe antes que los elementos que convergen hacia él, convocándolos desde el futuro.");
            break;
          default:
            newLogs.push(`Término no encontrado en la base de datos: '${term}'`);
        }
        break;
      case "clear":
        setLogs([]);
        return;
      case "status":
        newLogs.push(
          "ESTADO DEL SISTEMA:",
          "  Temperatura: 84°C (CRÍTICA)",
          "  Nodos Activos: 1024",
          "  Integridad: 99.9%",
          "  Exterior: 0x00"
        );
        break;
      default:
        newLogs.push(`Comando no reconocido: '${command}'. Escriba 'help' para ver los comandos.`);
    }

    setLogs(newLogs);
  };

  if (isBooting) {
    return (
      <div className="h-screen w-screen bg-dark-bg flex items-center justify-center text-neon-cyan font-mono p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-center"
        >
          <div className="text-2xl md:text-4xl font-bold mb-4 glitch-text" data-text="031Δ // BOOT SEQUENCE">
            031Δ // BOOT SEQUENCE
          </div>
          <div className="text-xs md:text-sm text-neon-cyan/50">ESTABLECIENDO CONEXIÓN CON EL ATRACTOR...</div>
        </motion.div>
      </div>
    );
  }

  const activeDocument = documents.find((d) => d.id === activeDocId);

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-bg text-neon-cyan font-mono overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-panel-bg">
        <div className="font-bold tracking-widest text-neon-cyan">031Δ // SYS</div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-neon-cyan">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <Sidebar
          activeDoc={activeDocId}
          onSelectDoc={setActiveDocId}
          documents={documents}
          className="hidden md:flex"
        />

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="absolute inset-y-0 left-0 z-50 md:hidden"
            >
              <Sidebar
                activeDoc={activeDocId}
                onSelectDoc={(id) => {
                  setActiveDocId(id);
                  setIsSidebarOpen(false);
                }}
                documents={documents}
                className="w-64 shadow-2xl shadow-black"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col relative md:border-l border-border overflow-hidden">
          {activeDocument ? (
            <DocumentReader document={activeDocument} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-neon-cyan/50 p-4 text-center">
              Seleccione un documento para iniciar la lectura.
            </div>
          )}
        </main>
      </div>
      <div className="hidden md:block">
        <Terminal onCommand={handleCommand} logs={logs} />
      </div>
    </div>
  );
}
