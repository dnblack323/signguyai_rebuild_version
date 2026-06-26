import React, { useEffect, useMemo, useState } from "react";
import { Bot, Check, Copy, FileText, Image, MessageSquareText, Search, Send, Sparkles, WandSparkles } from "lucide-react";
import { api } from "../../lib/api";
import { fallbackAiTools } from "./seedData";

const iconByCategory = {
  Assistant: Bot,
  Branding: Sparkles,
  Business: FileText,
  Communication: MessageSquareText,
  Design: WandSparkles,
  Documents: FileText,
  Marketing: Sparkles,
  Pricing: FileText,
  Wraps: Image,
};

export function AISuiteWorkspace({ assistantOnly = false, onToast }) {
  const [tools, setTools] = useState(fallbackAiTools);
  const [connection, setConnection] = useState("checking");
  const [category, setCategory] = useState(assistantOnly ? "Assistant" : "");
  const [query, setQuery] = useState("");
  const [selectedToolId, setSelectedToolId] = useState(assistantOnly ? "assistant_chat" : "text_to_image");
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let current = true;
    api("/ai/tools")
      .then((result) => {
        if (!current) return;
        setTools(result.tools?.length ? result.tools : fallbackAiTools);
        setConnection("connected");
      })
      .catch(() => {
        if (!current) return;
        setTools(fallbackAiTools);
        setConnection("offline");
      });
    return () => { current = false; };
  }, []);

  const categories = useMemo(() => [...new Set(tools.map((tool) => tool.category))].sort(), [tools]);
  const filtered = useMemo(() => tools.filter((tool) => {
    const matchesAssistant = !assistantOnly || tool.category === "Assistant";
    const matchesCategory = !category || tool.category === category;
    const matchesQuery = !query || `${tool.name} ${tool.description} ${tool.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesAssistant && matchesCategory && matchesQuery;
  }), [assistantOnly, category, query, tools]);
  const selectedTool = tools.find((tool) => tool.id === selectedToolId) || filtered[0] || tools[0];

  const runTool = async () => {
    if (!selectedTool) return;
    setRunning(true);
    const payload = { tool_id: selectedTool.id, input_data: { prompt: input, context: assistantOnly ? "assistant" : "ai-suite" } };
    try {
      const result = connection === "connected"
        ? await api("/ai/generate", { method: "POST", body: JSON.stringify(payload) })
        : { output: `Preview response for ${selectedTool.name}.\n\n${selectedTool.description}\n\nInput reviewed: ${input || "No input provided"}\n\nConnect production AI provider, credit tracking, and record linking next.` };
      setResponse(result.output);
    } catch {
      onToast?.("AI route unavailable");
    } finally {
      setRunning(false);
    }
  };

  const copyResponse = async () => {
    if (!response) return;
    await navigator.clipboard?.writeText(response);
    onToast?.("AI response copied");
  };

  return (
    <div className="shared-workspace ai-suite-workspace">
      <section className="shared-toolbar">
        <div><h2>{assistantOnly ? "Assistant" : "AI Suite"}</h2><p>{assistantOnly ? "Always-available business assistant surface brought over from the original app." : "AI tools catalog brought over from the original AITools suite and grouped into the rebuild shell."}</p></div>
        <span className={`backend-status ${connection}`}><i />{connection === "connected" ? "AI routes" : connection === "offline" ? "Preview AI" : "Checking"}</span>
      </section>
      {!assistantOnly && <section className="ai-stats">
        <article><strong>{tools.length}</strong><span>Tools cataloged</span></article>
        <article><strong>{tools.filter((tool) => tool.intensity === "High").length}</strong><span>Image/high compute</span></article>
        <article><strong>{categories.length}</strong><span>Categories</span></article>
      </section>}
      <section className="ai-suite-grid">
        <aside className="ai-tool-list">
          <div className="shared-filters compact">
            <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search AI tools..." /></label>
            {!assistantOnly && <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>}
          </div>
          {filtered.map((tool) => {
            const Icon = iconByCategory[tool.category] || Sparkles;
            return <button key={tool.id} className={selectedTool?.id === tool.id ? "active" : ""} onClick={() => setSelectedToolId(tool.id)}>
              <Icon size={17} />
              <span><strong>{tool.name}</strong><small>{tool.category} - {tool.intensity}</small></span>
            </button>;
          })}
        </aside>
        <section className="ai-workbench">
          <div className="ai-workbench-heading">
            <div><span>{selectedTool?.category}</span><h2>{selectedTool?.name}</h2><p>{selectedTool?.description}</p></div>
            <em>{selectedTool?.intensity} compute</em>
          </div>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={assistantOnly ? "Ask about shop operations, customers, quotes, orders, pricing, or production..." : "Describe what you want this tool to produce or analyze..."} />
          <div className="ai-actions">
            <button className="primary-button" onClick={runTool} disabled={running}>{running ? <Check size={16} /> : <Send size={16} />}{running ? "Running..." : "Run preview"}</button>
            <button className="secondary-button" onClick={copyResponse} disabled={!response}><Copy size={15} />Copy</button>
          </div>
          {response && <pre className="ai-response">{response}</pre>}
        </section>
      </section>
    </div>
  );
}
